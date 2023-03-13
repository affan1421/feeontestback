const mongoose = require('mongoose');
const Feetype = require('../models/feeType');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');

// GET
exports.getTypes = catchAsync(async (req, res, next) => {
	let { schoolId, accountType, page, limit } = req.query;
	page = parseInt(page, 0);
	limit = parseInt(limit, 10);
	const payload = {};
	if (schoolId) {
		payload.schoolId = mongoose.Types.ObjectId(schoolId);
	}
	if (accountType) {
		payload.accountType = accountType;
	}
	const feeTypes = await Feetype.aggregate([
		{
			$facet: {
				data: [{ $match: payload }, { $skip: page * limit }, { $limit: limit }],
				count: [{ $match: payload }, { $count: 'count' }],
			},
		},
	]);
	const { data, count } = feeTypes[0];

	if (count.length === 0) {
		return res
			.status(404)
			.json(new ErrorResponse('Fee Type Not Found', 404).toJSON());
	}
	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched Successfully'));
});

// CREATE
exports.create = catchAsync(async (req, res, next) => {
	const { feeType, description, accountType, schoolId } = req.body;
	if (!feeType || !description || !accountType || !schoolId) {
		return res
			.status(422)
			.json(new ErrorResponse('Please Enter All Fields', 422).toJSON());
	}

	const isExists = await Feetype.findOne({ feeType, schoolId });
	if (isExists) {
		return res
			.status(400)
			.json(new ErrorResponse('Fee Type Already Exists', 400).toJSON());
	}

	const newFeetype = await Feetype.create({
		feeType,
		description,
		accountType,
		schoolId,
	});
	if (!newFeetype) {
		return res
			.status(400)
			.json(new ErrorResponse('Error Creating Feetype', 400).toJSON());
	}
	return res
		.status(201)
		.json(SuccessResponse(newFeetype, 1, 'Created Successfully'));
});

// READ
exports.read = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const feetype = await Feetype.findById(id);
	if (feetype === null) {
		return res
			.status(404)
			.json(new ErrorResponse('Fee Type Not Found', 404).toJSON());
	}
	res.status(200).json(SuccessResponse(feetype, 1, 'Fetched Successfully'));
});

// UPDATE
exports.update = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const { feeType, description, accountType, schoolId } = req.body;
	const feetype = await Feetype.findByIdAndUpdate(id, {
		feeType,
		description,
		accountType,
		schoolId,
	});
	if (feetype === null) {
		return res
			.status(404)
			.json(new ErrorResponse('Fee Type Not Found', 404).toJSON());
	}
	res.status(200).json(SuccessResponse(feetype, 1, 'Updated Successfully'));
});

// DELETE
exports.feeDelete = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const feetype = await Feetype.findByIdAndDelete(id);
	if (feetype === null) {
		return res
			.status(404)
			.json(new ErrorResponse('Fee Type Not Found', 404).toJSON());
	}
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
});
