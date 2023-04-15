const mongoose = require('mongoose');
// const { default: axios } = require('axios');
const { spawn } = require('child_process');
const flatted = require('flatted');
const FeeStructure = require('../models/feeStructure');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');

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
		// TODO: Directly fetch the studentIds from the student model by sectionList
		// studentList = await axios.post(
		// 	`${process.env.GROWON_BASE_URL}/student/feeOn`,
		// 	{ classes: sectionIds }
		// );
		// studentList = studentList.data.data;
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

		sectionList = classes.map(c => mongoose.Types.ObjectId(c.sectionId));
		// Todo:  directly add feestructureId into section model
		// await axios.post(
		// 	`${process.env.GROWON_BASE_URL}/section/feestructure`,
		// 	{
		// 		sectionList,
		// 		feeStructureId: feeStructure._id,
		// 		isNew: true,
		// 	},
		// 	{
		// 		headers: {
		// 			'Content-Type': 'application/json',
		// 			Authorization: req.headers.authorization,
		// 		},
		// 	}
		// );
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
		// const sectionIds = classes.map(c => c.sectionId);
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
	const { _id: schoolId } = req.user.school_id;

	const feeStructure = await FeeStructure.findOne({
		_id: id,
		schoolId,
	});
	// .populate('feeDetails.feeTypeId', 'feeType')
	// .populate('feeDetails.scheduleTypeId', 'scheduleName');
	if (!feeStructure) {
		return next(new ErrorResponse('Fee Structure Not Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(feeStructure, 1, 'Fetched Successfully'));
});

// UPDATE
// Request payload - Updated student List and rest body.
// Considerations:
// 1. If any student is removed from the list, then delete the installment for that student.
// 2. If any new student is added, then create the installment for that student.
// 3. If new section is added append the new section to the classes array and push students in studentList (need to figure out how to recognize them) isNew :true.
// 4. If any section is removed, then remove the section from the classes array and remove the students from the studentList.
// 5. If any new fee is added, then add the fee to the feeDetails array and create the installment for all the students.

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
			if (student.isSelected === true && !student.isNew)
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
		const updatedDocs = await FeeStructure.updateOne(
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
		if (
			updatedDocs.modifiedCount === 1 &&
			(removedStudents.length || newStudents.length)
		) {
			await runChildProcess(
				feeDetails,
				studentList,
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
		console.log('Error While Updating', err.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

// DELETE
exports.deleteFeeStructure = async (req, res, next) => {
	const { id } = req.params;
	const { _id: schoolId } = req.user.school_id;

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
		// TODO:Directly delete the fee structure from the installments table
		// await axios.post(
		// 	`${process.env.GROWON_BASE_URL}/section/feestructure`,
		// 	{
		// 		feeStructureId: id,
		// 		sectionList,
		// 	},
		// 	{
		// 		headers: {
		// 			contentType: 'application/json',
		// 			Authorization: req.headers.authorization,
		// 		},
		// 	}
		// );
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

exports.getUnmappedClassList = async (req, res, next) => {
	const { schoolId } = req.params;
	let mappedClassIds = [];
	// const classList = null;
	try {
		// TODO: directly fetch the sectionList from the school collection
		// classList = await axios.get(
		// 	`${process.env.GROWON_BASE_URL}/section/school/${schoolId}`,
		// 	{
		// 		headers: {
		// 			Authorization: req.headers.authorization,
		// 		},
		// 	}
		// );
		// if (!classList.data.isSuccess) {
		// 	return next(new ErrorResponse('No Class List Found', 404));
		// }
		// const { data = [] } = classList.data;
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
			sectionId: section.sectionId,
			class_id: section.class_id,
		}));
		const mappedClassList = await FeeStructure.aggregate([
			{ $match: { schoolId: mongoose.Types.ObjectId(schoolId) } },
			{ $unwind: '$classes' },
			{ $group: { _id: '$classes.sectionId' } },
		]);
		if (mappedClassList.length > 0) {
			mappedClassIds = mappedClassList.map(c => String(c._id));
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
