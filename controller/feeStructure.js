const mongoose = require('mongoose');
const FeeStructure = require('../models/feeStructure');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');

// CREATE
exports.create = async (req, res, next) => {
	const {
		feeStructureName,
		academicYear = '2023-2024',
		schoolId,
		classes,
		description = '',
		feeDetails,
		totalAmount,
	} = req.body;
	if (!feeStructureName || !classes || !feeDetails || !totalAmount || !schoolId)
		return next(new ErrorResponse('Please Provide All Required Fields', 422));
	let feeStructure = null;

	const feeStructureExists = await FeeStructure.findOne({
		feeStructureName,
		schoolId,
	});
	if (feeStructureExists) {
		return next(
			new ErrorResponse('Fee Structure With This Name Already Exists', 400)
		);
	}
	try {
		feeStructure = await FeeStructure.create({
			feeStructureName,
			academicYear,
			schoolId,
			classes,
			description,
			feeDetails,
			totalAmount: Number(totalAmount),
		});
	} catch (err) {
		console.log('error while creating', err.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
	res
		.status(201)
		.json(SuccessResponse(feeStructure, 1, 'Created Successfully'));
};

// READ
exports.read = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const feeStructure = await FeeStructure.findById(id);
	// .populate('feeDetails.feeTypeId', 'feeType')
	// .populate('feeDetails.scheduleTypeId', 'scheduleName');
	if (!feeStructure) {
		return next(new ErrorResponse('Fee Structure not found', 404));
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
			return next(new ErrorResponse('Fee Structure not found', 404));
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
exports.delete = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const feeStructure = await FeeStructure.findById(id);
	if (!feeStructure) {
		return next(new ErrorResponse('Fee Structure not found', 404));
	}

	await feeStructure.deleteOne({ id });
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
});

// LIST
exports.list = catchAsync(async (req, res, next) => {
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
		return next(new ErrorResponse('No Fee Type Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched Successfully'));
});
