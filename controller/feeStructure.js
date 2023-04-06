const mongoose = require('mongoose');
const { default: axios } = require('axios');
const { spawn } = require('child_process');
const flatted = require('flatted');
const FeeStructure = require('../models/feeStructure');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');

async function runChildProcess(
	feeDetails,
	sectionIds,
	feeStructure,
	schoolId,
	academicYear
) {
	// Fetch the student list from the student API.
	const studentList = await axios.post(
		`${process.env.GROWON_BASE_URL}/student/feeOn`,
		{ classes: sectionIds }
	);
	// Spawn child process to insert data into the database
	const childSpawn = spawn('node', [
		'../feeOn-backend/helper/installments.js',
		flatted.stringify(feeDetails),
		flatted.stringify(studentList.data.data),
		feeStructure,
		schoolId,
		academicYear,
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
		totalAmount,
	} = req.body;

	if (
		!feeStructureName ||
		!classes ||
		!feeDetails ||
		!totalAmount ||
		!schoolId
	) {
		return next(new ErrorResponse('Please Provide All Required Fields', 422));
	}

	const isExist = await FeeStructure.findOne({ feeStructureName, schoolId });

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
			description,
			feeDetails,
			totalAmount: Number(totalAmount),
		});

		// Extract the section IDs from the classes array.
		// const sectionIds = classes.map(c => c.sectionId);
		// await runChildProcess(
		// 	feeDetails,
		// 	sectionIds,
		// 	feeStructure._id,
		// 	schoolId,
		// 	academicYear
		// );
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
	const feeStructure = await FeeStructure.findOne({
		_id: id,
		schoolId: req.user.school_id,
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
// Academic year should not be updated
// If row is deleted, search for the row in the installments table and delete it only if it is not paid.
// If row is added, add it to the installments table.
// If row is updated with no changes in sub rows, update it in the installments table.
// If row is updated with changes in sub rows, delete the row from the installments table and add the new row.
// If new class is added, add the new class to the installments table.
// If class is deleted, delete the class from the installments table.

exports.update = async (req, res, next) => {
	const { id } = req.params;
	let {
		classes: newClasses,
		feeDetails: newFeeDetails,
		isRowAdded = false,
		isClassAdded = false,
	} = req.body;
	try {
		const feeStructure = await FeeStructure.findOne({
			_id: id,
			schoolId: req.body.schoolId,
		});
		if (!feeStructure) {
			return next(new ErrorResponse('Fee Structure Not Found', 404));
		}
		const { classes, feeDetails, schoolId, academicYear } = feeStructure;
		const sectionIds = new Set(classes.map(c => c.sectionId));
		// check if any new section is added in the classes array
		// if (isClassAdded) {
		// 	const newSections = newClasses
		// 		.filter(c => !sectionIds.has(c.sectionId) && c.sectionId)
		// 		.map(c => c.sectionId);

		// 	await runChildProcess(
		// 		newFeeDetails,
		// 		newSections,
		// 		id,
		// 		schoolId,
		// 		academicYear
		// 	);
		// }

		// check if any new row is added into the feeDetails array
		// if (isRowAdded) {
		// 	const feeTypeSet = new Set(feeDetails.map(f => f.feeTypeId));
		// 	const newRows = req.body.feeDetails
		// 		.filter(f => !feeTypeSet.has(f.feeTypeId) && f.feeTypeId)
		// 		.map(f => f.feeTypeId);

		// 	await runChildProcess(newRows, sectionIds, id, schoolId, academicYear);
		// }

		if (
			typeof newClasses[0] === 'string' &&
			typeof newFeeDetails[0] === 'string'
		) {
			newClasses = newClasses.map(JSON.parse);
			newFeeDetails = newFeeDetails.map(JSON.parse);
		}
		// Update the fee structure in the database in a single call
		const updatedFeeStructure = await FeeStructure.findOneAndUpdate(
			{ _id: id, schoolId: req.body.schoolId },
			req.body,
			{
				new: true,
				runValidators: true,
			}
		);
		res
			.status(200)
			.json(SuccessResponse(updatedFeeStructure, 1, 'Updated Successfully'));
	} catch (err) {
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

// DELETE
exports.deleteFeeStructure = async (req, res, next) => {
	const { id } = req.params;
	const feeStructure = await FeeStructure.findOne({
		_id: id,
		schoolId: req.user.school_id,
	});
	if (!feeStructure) {
		return next(new ErrorResponse('Fee Structure Not Found', 404));
	}
	try {
		await FeeStructure.findOneAndDelete({
			_id: id,
			schoolId: req.user.school_id,
		});
	} catch (err) {
		console.log('error while deleting', err.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
};

// LIST
exports.getByFilter = catchAsync(async (req, res, next) => {
	const { schoolId, page = 0, limit = 10 } = req.query;
	const query = {};
	if (schoolId) {
		query.schoolId = mongoose.Types.ObjectId(schoolId);
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
	let classList = null;
	try {
		classList = await axios.get(
			`${process.env.GROWON_BASE_URL}/section/school/${schoolId}`,
			{
				headers: {
					Authorization: req.headers.authorization,
				},
			}
		);
		if (!classList.data.isSuccess) {
			return next(new ErrorResponse('No Class List Found', 404));
		}
		const { data = [] } = classList.data;
		const mappedClassList = await FeeStructure.aggregate([
			{ $match: { schoolId: mongoose.Types.ObjectId(schoolId) } },
			{ $unwind: '$classes' },
			{ $group: { _id: '$classes.sectionId' } },
		]);
		if (mappedClassList.length > 0) {
			mappedClassIds = mappedClassList.map(c => String(c._id));
		}
		const unmappedClassList = data.filter(
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
