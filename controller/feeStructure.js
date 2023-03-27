const mongoose = require('mongoose');
const { default: axios } = require('axios');
const { spawn } = require('child_process');
const flatted = require('flatted');
const FeeStructure = require('../models/feeStructure');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');

// CREATE
exports.create = async (req, res, next) => {
	let {
		feeStructureName,
		academicYear = '2023-2024',
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
			academicYear,
			schoolId,
			classes,
			description,
			feeDetails,
			totalAmount: Number(totalAmount),
		});

		// Extract the section IDs from the classes array.
		// const sectionIds = classes.map(c => c.sectionId);

		// Fetch the student list from the student API.
		// const studentList = await axios.post(
		// 	`${process.env.GROWON_BASE_URL}/student/feeOn`,
		// 	{ classes: sectionIds }
		// );
		// // Spawn child process to insert data into the database
		// const childSpawn = spawn('node', [
		// 	'../feeOn-backend/helper/installments.js',
		// 	flatted.stringify(feeDetails),
		// 	flatted.stringify(studentList.data.data),
		// 	flatted.stringify(feeStructure),
		// 	schoolId,
		// 	academicYear,
		// ]);

		// childSpawn.stdout.on('data', data => {
		// 	console.log(`stdout: ${data}`);
		// });

		// childSpawn.stderr.on('data', data => {
		// 	console.error(`stderr: ${data}`);
		// });

		// childSpawn.on('error', error => {
		// 	console.error(`error: ${error.message}`);
		// });

		// childSpawn.on('close', code => {
		// 	console.log(`child process exited with code ${code}`);
		// });

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
	const feeStructure = await FeeStructure.findById(id);
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
exports.update = async (req, res, next) => {
	const { id } = req.params;
	try {
		let feeStructure = await FeeStructure.findById(id);
		if (!feeStructure) {
			return next(new ErrorResponse('Fee Structure Not Found', 404));
		}

		if (
			typeof req.body.classes[0] === 'string' &&
			typeof req.body.feeDetails[0] === 'string'
		) {
			req.body.classes = req.body.classes.map(JSON.parse);
			req.body.feeDetails = req.body.feeDetails.map(JSON.parse);
		}

		feeStructure = await FeeStructure.findByIdAndUpdate(id, req.body, {
			new: true,
			runValidators: true,
		});
		res
			.status(200)
			.json(SuccessResponse(feeStructure, 1, 'Updated Successfully'));
	} catch (err) {
		console.log('error while updating', err.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

// DELETE
exports.deleteFeeStructure = async (req, res, next) => {
	const { id } = req.params;
	const feeStructure = await FeeStructure.findById(id);
	if (!feeStructure) {
		return next(new ErrorResponse('Fee Structure Not Found', 404));
	}
	try {
		await FeeStructure.findByIdAndDelete({ id });
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
