const mongoose = require('mongoose');
const { spawn } = require('child_process');
const flatted = require('flatted');
const FeeStructure = require('../models/feeStructure');
const ErrorResponse = require('../utils/errorResponse');
const FeeInstallment = require('../models/feeInstallment');
const catchAsync = require('../utils/catchAsync');
const FeeType = require('../models/feeType');
const SuccessResponse = require('../utils/successResponse');
const feeInstallment = require('../models/feeInstallment');
const SectionDiscount = require('../models/sectionDiscount');

const Sections = mongoose.connection.db.collection('sections');
const Students = mongoose.connection.db.collection('students');

async function runChildProcess(
	feeDetails,
	sectionIds, // treated as studentlist if isStudent is true
	feeStructure,
	schoolId,
	academicYearId,
	categoryId,
	isStudent = false
) {
	// If isStudent is true, then sectionIds is treated as studentList
	let studentList = sectionIds;
	// Fetch the student list from the student API.
	if (!isStudent) {
		studentList = await Students.find(
			{
				section: { $in: sectionIds },
				deleted: false,
				profileStatus: 'APPROVED',
			},
			'_id section'
		).toArray();
	}
	// Spawn child process to insert data into the database
	const childSpawn = spawn('node', [
		'../feeOn-backend/helper/installments.js',
		flatted.stringify(feeDetails),
		flatted.stringify(studentList),
		feeStructure,
		schoolId,
		academicYearId,
		categoryId,
	]);

	childSpawn.stdout.on('data', data => {
		console.log(`stdout: ${data}`);
	});

	childSpawn.stderr.on('data', data => {
		console.error(`stderr: ${data}`);
	});

	childSpawn.on('error', error => {
		console.error(`error: ${error.message}`);
	});

	childSpawn.on('close', code => {
		console.log(`child process exited with code ${code}`);
	});
}

// CREATE
exports.create = async (req, res, next) => {
	let {
		feeStructureName,
		schoolId,
		classes = [],
		description = '',
		feeDetails = [],
		studentList = [],
		categoryId,
		totalAmount,
	} = req.body;
	let sectionList = null;

	if (
		!feeStructureName ||
		!classes ||
		!feeDetails ||
		!totalAmount ||
		!schoolId ||
		!categoryId ||
		!studentList
	) {
		return next(new ErrorResponse('Please Provide All Required Fields', 422));
	}
	const isExist = await FeeStructure.findOne({
		feeStructureName,
		schoolId,
		categoryId,
	});

	if (isExist) {
		return next(
			new ErrorResponse('Fee Structure With This Name Already Exists', 400)
		);
	}

	if (typeof classes[0] === 'string' && typeof feeDetails[0] === 'string') {
		classes = classes.map(JSON.parse);
		feeDetails = feeDetails.map(JSON.parse);
	}

	// TODO: add validation if structure name already exists

	try {
		// Attempt to create the fee structure.
		const feeStructure = await FeeStructure.create({
			feeStructureName,
			schoolId,
			classes,
			categoryId,
			description,
			feeDetails,
			totalAmount: Number(totalAmount),
		});

		studentList = studentList.filter(s => s.isSelected === true);

		sectionList = classes.map(c => mongoose.Types.ObjectId(c.sectionId));
		const updatedDocs = await Sections.updateMany(
			{
				_id: { $in: sectionList },
			},
			{
				$set: {
					feeStructureId: feeStructure._id,
				},
			},
			{
				multi: true,
			}
		);

		// Extract the section IDs from the classes array.
		await runChildProcess(
			feeStructure.feeDetails,
			studentList,
			feeStructure._id,
			schoolId,
			feeStructure.academicYearId,
			categoryId,
			true
		);

		const studIds = studentList.map(stud => mongoose.Types.ObjectId(stud._id));

		await Students.updateMany(
			{
				_id: {
					$in: studIds,
				},
			},
			{
				$addToSet: {
					feeCategoryIds: mongoose.Types.ObjectId(categoryId),
				},
			}
		);

		res
			.status(201)
			.json(SuccessResponse(feeStructure, 1, 'Created Successfully'));
	} catch (err) {
		console.log('error while creating', err.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

// READ
exports.read = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const { school_id: schoolId } = req.user;
	const feeStructure = await FeeStructure.findOne({
		_id: id,
	})
		.populate('academicYearId', 'name')
		.lean();
	const { categoryId } = feeStructure;
	if (!feeStructure) {
		return next(new ErrorResponse('Fee Structure Not Found', 404));
	}

	const sectionList = feeStructure.classes.map(c =>
		mongoose.Types.ObjectId(c.sectionId)
	);
	const projection = {
		_id: 1,
		name: 1,
		profile_image: 1,
		section: 1,
	};

	const query = {
		section: { $in: sectionList },
		deleted: false,
		profileStatus: 'APPROVED',
	};

	const [students, feeInstallments] = await Promise.all([
		Students.find(query).project(projection).toArray(),

		FeeInstallment.aggregate([
			{
				$match: {
					sectionId: {
						$in: sectionList,
					},
					schoolId: mongoose.Types.ObjectId(schoolId),
					categoryId: mongoose.Types.ObjectId(categoryId),
				},
			},
			{
				$group: {
					_id: '$studentId',
					feeStructureId: {
						$first: '$feeStructureId',
					},
					installments: { $push: '$$ROOT' },
				},
			},
		]),
	]);

	if (!students.length) {
		return next(new ErrorResponse('No students found', 404));
	}

	const installmentObj = feeInstallments.reduce((acc, curr) => {
		acc[curr._id] = curr.installments;
		return acc;
	}, {});
	const updatedStudents = students.reduce((acc, curr) => {
		const { _id } = curr;
		const foundInstallment = installmentObj[_id];
		const hasInstallment = Boolean(foundInstallment);
		const hasMatchingFeeStructure =
			hasInstallment &&
			foundInstallment[0].feeStructureId.toString() === id.toString();
		const hasPaidInstallment =
			hasInstallment &&
			foundInstallment.some(
				installment =>
					installment.status === 'Paid' || installment.status === 'Late'
			);

		if (!hasInstallment || hasMatchingFeeStructure) {
			curr.isSelected = hasMatchingFeeStructure;
			if (hasMatchingFeeStructure) {
				curr.isPaid = hasPaidInstallment;
			}
			acc.push(curr);
		}

		return acc;
	}, []);

	feeStructure.studentList = updatedStudents;
	res
		.status(200)
		.json(SuccessResponse(feeStructure, 1, 'Fetched Successfully'));
});

// UPDATE
// Request payload - Updated student List and rest body.
// Considerations:
// 1. If any student is removed from the list, then delete the installment for that student.
// 2. (Done) If any new student is added, then create the installment for that student.
// 3. If new section is added append the new section to the classes array and push students in studentList (need to figure out how to recognize them) isNew :true.
// 4. If any section is removed, then remove the section from the classes array and remove the students from the studentList.
// 5. (Done) If any new fee is added, then add the fee to the feeDetails array and create the installment for all the students.

exports.updatedFeeStructure = async (req, res, next) => {
	try {
		const { id } = req.params;
		let { studentList, feeStructureName, classes, feeDetails, ...rest } =
			req.body;
		const foundStructure = await FeeStructure.findOne({
			_id: id,
		});
		const { existingStudents, studentsToUpdate, studentsToRemove } =
			studentList.reduce(
				(acc, student) => {
					const { isNew, isRemoved, isSelected } = student;
					if (!isNew && !isRemoved && isSelected) {
						acc.existingStudents.push(student);
					} else if (isNew) {
						acc.studentsToUpdate.push(student);
					} else if (isRemoved) {
						acc.studentsToRemove.push(student);
					}
					return acc;
				},
				{
					existingStudents: [],
					studentsToUpdate: [],
					studentsToRemove: [],
				}
			);

		if (rest.isRowAdded) {
			feeDetails = feeDetails.map(fee =>
				fee.isNewFieldinEdit ? { ...fee, _id: mongoose.Types.ObjectId() } : fee
			);
			const existingTypes = foundStructure.feeDetails.map(fee =>
				fee.feeTypeId.toString()
			);
			// extract new rows from the fedetails
			const newRows = feeDetails.filter(
				fee => !existingTypes.includes(fee.feeTypeId)
			);

			await runChildProcess(
				newRows,
				existingStudents,
				id,
				rest.schoolId,
				rest.academicYearId,
				rest.categoryId,
				true
			);
		}

		const updatedDocs = await FeeStructure.findOneAndUpdate(
			{ _id: id },
			{
				$set: {
					feeStructureName,
					classes,
					feeDetails,
					...rest,
				},
			}
		);
		const studMappedList = studentsToUpdate.map(s =>
			mongoose.Types.ObjectId(s._id)
		);
		const unMapStudList = studentsToRemove.map(s =>
			mongoose.Types.ObjectId(s._id)
		);
		if (studentsToRemove.length > 0 || studentsToUpdate.length > 0) {
			await Promise.all([
				Students.updateMany(
					{
						_id: { $in: studMappedList },
					},
					{
						$addToSet: {
							feeCategoryIds: mongoose.Types.ObjectId(rest.categoryId),
						},
					}
				),
				Students.updateMany(
					{
						_id: { $in: unMapStudList },
					},
					{
						$pull: {
							feeCategoryIds: mongoose.Types.ObjectId(rest.categoryId),
						},
					}
				),
				FeeInstallment.deleteMany(
					{
						studentId: { $in: unMapStudList },
					},
					{ deletedBy: req.user._id }
				),
				runChildProcess(
					feeDetails,
					studentsToUpdate,
					id,
					rest.schoolId,
					rest.academicYearId,
					rest.categoryId,
					true
				),
			]);
		}

		res
			.status(200)
			.json(
				SuccessResponse(
					updatedDocs,
					updatedDocs.modifiedCount,
					'Updated SuccessFully'
				)
			);
	} catch (err) {
		console.log('Error While Updating', err.message, err.stack);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

// DELETE
exports.deleteFeeStructure = async (req, res, next) => {
	const { id } = req.params;
	const { school_id: schoolId } = req.user;

	const feeStructure = await FeeStructure.findOne({
		_id: id,
		schoolId,
	});
	if (!feeStructure) {
		return next(new ErrorResponse('Fee Structure Not Found', 404));
	}
	const sectionList = feeStructure.classes.map(c => c.sectionId);
	try {
		await FeeStructure.findOneAndDelete({
			_id: id,
		});
		await Sections.updateMany(
			{
				_id: { $in: sectionList },
			},
			{
				$unset: {
					feeStructureId: null,
				},
			},
			{
				multi: true,
			}
		);
	} catch (err) {
		console.log('error while deleting', err.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
};

// LIST
exports.getByFilter = catchAsync(async (req, res, next) => {
	const { schoolId, categoryId, page = 0, limit = 10 } = req.query;
	const query = {};
	if (schoolId) {
		query.schoolId = mongoose.Types.ObjectId(schoolId);
	}
	if (categoryId) {
		query.categoryId = mongoose.Types.ObjectId(categoryId);
	}

	const feeTypes = await FeeStructure.aggregate([
		{
			$facet: {
				data: [
					{ $match: query },
					{
						$lookup: {
							from: 'academicyears',
							localField: 'academicYearId',
							foreignField: '_id',
							as: 'academicYearId',
						},
					},
					{
						$addFields: {
							academicYearId: {
								$arrayElemAt: ['$academicYearId', 0],
							},
						},
					},
					{ $skip: +page * +limit },
					{ $limit: +limit },
				],
				count: [{ $match: query }, { $count: 'count' }],
			},
		},
	]);
	const { data, count } = feeTypes[0];

	if (count.length === 0) {
		return next(new ErrorResponse('Fee Structure Not Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched Successfully'));
});
//  unmapped?schoolId=schoolId&categoryId=categoryId
exports.getUnmappedClassList = async (req, res, next) => {
	const { schoolId, categoryId, discountId } = req.query;
	// const mappedClassIds = [];
	// const payload = {
	// 	schoolId: mongoose.Types.ObjectId(schoolId),
	// };
	// if (categoryId) {
	// 	payload.categoryId = mongoose.Types.ObjectId(categoryId);
	// }
	try {
		let sectionList = await Sections.aggregate([
			{
				$match: {
					school: mongoose.Types.ObjectId(schoolId),
				},
			},
			{
				$project: {
					_id: 1,
					name: 1,
					class_id: 1,
				},
			},
			{
				$lookup: {
					from: 'classes',
					localField: 'class_id',
					foreignField: '_id',
					as: 'class',
				},
			},
			{
				$unwind: {
					path: '$class',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$project: {
					_id: 0,
					sectionId: '$_id',
					name: 1,
					class_id: 1,
					className: '$class.name',
					sequence_number: '$class.sequence_number',
				},
			},
			{
				$sort: {
					sequence_number: 1,
				},
			},
		]).toArray();
		sectionList = sectionList.map(section => ({
			name: `${section.className} - ${section.name}`,
			sectionId: section.sectionId.toString(),
			class_id: section.class_id,
		}));
		// if (categoryId) {
		// 	const mappedClassList = await FeeStructure.aggregate([
		// 		{
		// 			$match: payload,
		// 		},
		// 		{ $unwind: '$classes' },
		// 		{ $group: { _id: '$classes.sectionId' } },
		// 	]);
		// 	if (mappedClassList.length > 0) {
		// 		mappedClassIds = mappedClassList.map(c => c._id.toString());
		// 		sectionList = sectionList.filter(
		// 			c => !mappedClassIds.includes(c.sectionId)
		// 		);
		// 	}
		// }
		if (discountId) {
			const mappedSections = await SectionDiscount.aggregate([
				{
					$match: {
						discountId: mongoose.Types.ObjectId(discountId),
					},
				},
				{
					$group: {
						_id: '$sectionId',
					},
				},
			]);
			if (mappedSections.length > 0) {
				const mappedSectionIds = mappedSections.map(s => s._id.toString());
				sectionList = sectionList.filter(
					section => !mappedSectionIds.includes(section.sectionId)
				);
			}
		}
		res
			.status(200)
			.json(
				SuccessResponse(sectionList, sectionList.length, 'Fetched Successfully')
			);
	} catch (err) {
		console.log('error while fetching unmapped class list', err.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

exports.getFeeStructureBySectionId = catchAsync(async (req, res, next) => {
	const { sectionId, categoryId } = req.params;
	const foundStructure = await FeeStructure.find(
		{
			classes: { $elemMatch: { sectionId } },
			categoryId,
			schoolId: req.user.school_id,
		},
		'feeStructureName'
	).lean();

	if (!foundStructure.length) {
		return next(new ErrorResponse('Fee Structure Not Found', 404));
	}

	res
		.status(200)
		.json(SuccessResponse(foundStructure, 1, 'Fetched Successfully'));
});

exports.assignFeeStructure = async (req, res, next) => {
	const { studentList, sectionId } = req.body;
	// find the feestructure id for the section
	const feeStructure = await FeeStructure.findOne({
		classes: { $elemMatch: { sectionId } },
	});
	if (!feeStructure) {
		return next(new ErrorResponse('Fee Structure Not Found', 404));
	}
	const {
		_id: feeStructureId,
		feeDetails,
		schoolId,
		academicYearId,
	} = feeStructure;
	try {
		// Run the child process to assign the fee structure to the students
		// await runChildProcess(
		// 	feeDetails,
		// 	studentList,
		// 	feeStructureId,
		// 	schoolId,
		// 	academicYearId,
		// categoryId,
		// );
		res.status(200).json(SuccessResponse(null, 1, 'Assigned Successfully'));
	} catch (err) {
		console.log('error while assigning fee structure', err.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

// TODO: Fetch the feeDetails with the students data from feeInstallments
exports.getFeeCategory = async (req, res, next) => {
	try {
		const { id } = req.params;
		const schoolId = mongoose.Types.ObjectId(req.user.school_id);
		const feeStructure = await FeeStructure.findOne(
			{
				_id: id,
			},
			'_id feeDetails totalAmount categoryId'
		).lean();
		if (!feeStructure) {
			return next(new ErrorResponse('Fee Structure Not Found', 404));
		}
		const { categoryId } = feeStructure;
		const FeeTypes = (await FeeType.find({ schoolId, categoryId })) || [];
		const feeDetails = feeStructure.feeDetails.map(fee => {
			const feeType = FeeTypes.find(
				f => f._id.toString() === fee.feeTypeId.toString()
			);

			return {
				rowId: fee._id,
				feeTypeId: fee.feeTypeId,
				feeTypeName: feeType ? feeType.feeType : null,
				breakDown: fee.scheduledDates.length,
				amount: fee.totalAmount,
			};
		});

		const studentList = await feeInstallment.aggregate([
			{
				$match: {
					schoolId,
					feeStructureId: mongoose.Types.ObjectId(feeStructure._id),
				},
			},
			{
				$group: {
					_id: '$studentId',
					sectionId: {
						$first: '$sectionId',
					},
				},
			},
			{
				$lookup: {
					from: 'students',
					let: {
						studentId: '$_id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$studentId'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								name: 1,
							},
						},
					],
					as: '_id',
				},
			},
			{
				$lookup: {
					from: 'sections',
					let: {
						sectionId: '$sectionId',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$sectionId'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								className: 1,
							},
						},
					],
					as: 'section',
				},
			},
			{
				$project: {
					_id: 0,
					studentName: {
						$first: '$_id.name',
					},
					studentId: {
						$first: '$_id._id',
					},
					sectionName: {
						$first: '$section.className',
					},
				},
			},
		]);
		feeStructure.studentList = studentList || [];
		feeStructure.feeDetails = feeDetails;
		res
			.status(200)
			.json(SuccessResponse(feeStructure, 1, 'Fetched Successfully'));
	} catch (err) {
		console.log('error while fetching fee category', err.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};
