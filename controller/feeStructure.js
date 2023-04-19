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

const Sections = mongoose.connection.db.collection('sections');
const Students = mongoose.connection.db.collection('students');

async function runChildProcess(
	feeDetails,
	sectionIds, // treated as studentlist if isStudent is true
	feeStructure,
	schoolId,
	academicYearId,
	isStudent = false
) {
	// If isStudent is true, then sectionIds is treated as studentList
	let studentList = sectionIds;
	// Fetch the student list from the student API.
	if (!isStudent) {
		studentList = await Students.find(
			{
				section: { $in: sectionIds },
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
	console.log(studentList.length);
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
			true
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
		schoolId,
	})
		.populate('academicYearId', 'name')
		.lean();
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
					feeStructureId: mongoose.Types.ObjectId(id),
				},
			},
			{
				$group: {
					_id: '$studentId',
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
		const foundInstallment = installmentObj[curr._id];
		if (foundInstallment && foundInstallment.length) {
			const hasPaidInstallment = foundInstallment.some(
				installment => installment.status === 'Paid'
			);
			acc.push({
				...curr,
				isSelected: true,
				isPaid: hasPaidInstallment,
			});
		} else {
			acc.push({
				...curr,
				isSelected: false,
			});
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
		const newStudents = [];
		const removedStudents = [];
		const existingStudents = [];

		const {
			studentList,
			feeStructureName,
			classes,
			schoolId,
			feeDetails,
			categoryId,
			totalAmount,
			academicYearId,
			description,
			isRowAdded = false,
		} = req.body;

		for (const student of studentList) {
			// Filter out student who where as it is in selected list
			// 1. isSelected = true and isPaid = true and no isNew flag
			// 2. isSelected = true and isPaid = false and no isNew flag
			// 3. isSelected = false and isPaid = true and no isNew flag

			if (
				!student.isNew &&
				((student.isSelected && student.isPaid) ||
					(student.isSelected && !student.isPaid) ||
					(!student.isSelected && student.isPaid))
			)
				existingStudents.push(student);
			// Check isNew flag exists
			if (student.isNew) newStudents.push(student);
			// check if a student is removed
			if (student.isSelected === false && !student.isPaid)
				removedStudents.push(student);
		}
		if (isRowAdded) {
			const feeTypeSet = new Set(feeDetails.map(f => f.feeTypeId));
			const newRows = req.body.feeDetails
				.filter(f => !feeTypeSet.has(f.feeTypeId) && f.feeTypeId)
				.map(f => f.feeTypeId);

			// studentList without isNew flag and isSelected flag should be true
			await runChildProcess(
				newRows,
				existingStudents,
				id,
				schoolId,
				academicYearId,
				true
			);
		}

		const updatedDocs = await FeeStructure.findOneAndUpdate(
			{ _id: id, schoolId },
			{
				$set: {
					feeStructureName,
					schoolId,
					description,
					categoryId,
					totalAmount,
					academicYearId,
					feeDetails,
					classes,
				},
			}
		);

		// Remove Installments for removed students (soft delete) add deletedBy
		if (updatedDocs && removedStudents.length > 0) {
			await FeeInstallment.deleteMany(
				{
					studentId: { $in: removedStudents.map(s => s._id) },
				},
				{ deletedBy: req.user._id }
			);
		}
		// Create Installments for new students
		if (updatedDocs && newStudents.length > 0) {
			await runChildProcess(
				updatedDocs.feeDetails,
				newStudents,
				id,
				schoolId,
				academicYearId,
				true
			);
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
			schoolId,
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
	const { schoolId, categoryId } = req.query;
	let mappedClassIds = [];
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
		const mappedClassList = await FeeStructure.aggregate([
			{
				$match: {
					schoolId: mongoose.Types.ObjectId(schoolId),
					categoryId: mongoose.Types.ObjectId(categoryId),
				},
			},
			{ $unwind: '$classes' },
			{ $group: { _id: '$classes.sectionId' } },
		]);
		if (mappedClassList.length > 0) {
			mappedClassIds = mappedClassList.map(c => c._id.toString());
		}
		const unmappedClassList = sectionList.filter(
			c => !mappedClassIds.includes(c.sectionId)
		);
		res
			.status(200)
			.json(
				SuccessResponse(
					unmappedClassList,
					unmappedClassList.length,
					'Fetched Successfully'
				)
			);
	} catch (err) {
		console.log('error while fetching unmapped class list', err.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

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
		// 	academicYearId
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
		const { categoryId, sectionId } = req.params;
		const schoolId = mongoose.Types.ObjectId(req.user.school_id);
		const feeStructure = await FeeStructure.findOne(
			{
				schoolId,
				categoryId,
				classes: { $elemMatch: { sectionId } },
			},
			'_id feeDetails totalAmount'
		).lean();
		if (!feeStructure) {
			return next(new ErrorResponse('Fee Structure Not Found', 404));
		}
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
				$project: {
					_id: 0,
					studentName: {
						$first: '$_id.name',
					},
					studentId: {
						$first: '$_id._id',
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
