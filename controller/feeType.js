const Feetype = require('../models/feeType');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');

// GET
exports.getTypes = catchAsync(async (req, res, next) => {
	const { school, accountType, page = 0, limit = 10 } = req.query;
	const payload = {};
	if (school) {
		payload.school = school;
	}
	if (accountType) {
		payload.accountType = accountType;
	}
	const feetypes = await Feetype.find(payload)
		.skip(page * limit)
		.limit(limit);
	if (feetypes.length === 0) {
		return next(new ErrorResponse('No feetype found', 404));
	}
	res
		.status(200)
		.json(
			new SuccessResponse(feetypes, feetypes.length, 'Fetched Successfully')
		);
});

// CREATE
exports.create = catchAsync(async (req, res, next) => {
	const { name, description, accountType, school } = req.body;
	console.log('hit', req.body);
	if (!name || !description || !accountType || !school) {
		return next(new ErrorResponse('Please enter all fields', 204));
	}
	const newFeetype = await Feetype.create({
		name,
		description,
		accountType,
		school,
	});
	if (!newFeetype) {
		return next(new ErrorResponse('Error creating feetype', 400));
	}
	res.status(201).json(SuccessResponse(newFeetype, 1, 'Created Successfully'));
});

// READ
exports.read = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const feetype = await Feetype.findById(id);
	if (feetype === null) {
		return next(new ErrorResponse('Feetype not found', 404));
	}
	res.status(200).json(SuccessResponse(feetype, 1, 'Fetched Successfully'));
});

// UPDATE
exports.update = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const { name, description, accountType, school } = req.body;
	const feetype = await Feetype.findByIdAndUpdate(
		id,
		{ name, description, accountType, school },
		{ new: true }
	);
	if (feetype === null) {
		return next(new ErrorResponse('Feetype not found', 404));
	}
	res.status(200).json(SuccessResponse(feetype, 1, 'Updated Successfully'));
});

// DELETE
exports.feeDelete = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const feetype = await Feetype.findByIdAndDelete(id);
	if (feetype === null) {
		return next(new ErrorResponse('Feetype not found', 404));
	}
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
});
