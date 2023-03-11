const Feetype = require('../models/feeType');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');

// GET
exports.getTypes = catchAsync(async (req, res, next) => {
	const { schoolId, accountType, page = 0, limit = 10 } = req.query;
	const payload = {};
	if (schoolId) {
		payload.schoolId = schoolId;
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
		.json(SuccessResponse(feetypes, feetypes.length, 'Fetched Successfully'));
});

// CREATE
exports.create = catchAsync(async (req, res, next) => {
	const { feeType, description, accountType, schoolId } = req.body;
	if (!feeType || !description || !accountType || !schoolId) {
		return next(new ErrorResponse('Please enter all fields', 204));
	}
	const isExists = await Feetype.findOne({ feeType, schoolId });
	if (isExists) {
		return next(new ErrorResponse('Fee type already exists', 400));
	}
	const newFeetype = await Feetype.create({
		feeType,
		description,
		accountType,
		schoolId,
	});
	console.log(newFeetype);
	if (!newFeetype) {
		return next(new ErrorResponse('Error creating feetype', 400));
	}
	console.log('hit');
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
	const { feeType, description, accountType, schoolId } = req.body;
	const feetype = await Feetype.findByIdAndUpdate(
		id,
		{ feeType, description, accountType, schoolId },
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
