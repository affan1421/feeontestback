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
		return res
			.status(404)
			.json(new ErrorResponse('Fee Type Not Found', 404).toJSON());
	}
	res
		.status(200)
		.json(SuccessResponse(feetypes, feetypes.length, 'Fetched Successfully'));
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
