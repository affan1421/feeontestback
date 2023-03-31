const mongoose = require('mongoose');
const FeeSchedule = require('../models/feeSchedule');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

function getScheduleDates(months, day) {
	const currentYear = new Date().getFullYear();
	const nextYear = currentYear + 1;

	const scheduledDates = [];

	// Loop through each month and create a date string
	for (const month of months) {
		const year = month >= months[0] ? currentYear : nextYear;
		const dateString = new Date(year, month - 1, day);
		scheduledDates.push(dateString);
	}

	return scheduledDates;
}

// @desc    Create a new fee schedule
// @route   POST /api/v1/feeSchedule
// @access  Private
exports.create = async (req, res, next) => {
	let feeSchedule = null;
	let {
		scheduleName,
		description = '',
		schoolId,
		day,
		months,
		existMonths,
	} = req.body;
	if (!scheduleName || !day || !months || !existMonths || !schoolId) {
		return next(new ErrorResponse('Please Provide All Required Fields', 422));
	}

	months = months.sort(
		(a, b) => existMonths.indexOf(a) - existMonths.indexOf(b)
	);

	const scheduledDates = getScheduleDates(months, day);

	const isExists = await FeeSchedule.findOne({
		scheduleName,
		schoolId,
	});
	if (isExists) {
		return next(new ErrorResponse('Fee Schedule Already Exists', 400));
	}
	try {
		feeSchedule = await FeeSchedule.create({
			scheduleName,
			description,
			schoolId,
			scheduledDates,
			day,
			months,
		});
	} catch (error) {
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
	res.status(201).json(SuccessResponse(feeSchedule, 1, 'Created Successfully'));
};

// @desc    Get all fee schedules
// @route   GET /api/v1/feeSchedule
// @access  Private
exports.getAll = catchAsync(async (req, res, next) => {
	let { schoolId, scheduleType, page, limit } = req.query;
	page = parseInt(page, 0);
	limit = parseInt(limit, 10);
	const payload = {};
	if (schoolId) {
		payload.schoolId = mongoose.Types.ObjectId(schoolId);
	}
	if (scheduleType) {
		payload.scheduleType = scheduleType;
	}
	const feeSchedules = await FeeSchedule.aggregate([
		{
			$facet: {
				data: [{ $match: payload }, { $skip: page * limit }, { $limit: limit }],
				docCount: [{ $match: payload }, { $count: 'count' }],
			},
		},
	]);
	const { data, docCount } = feeSchedules[0];

	if (docCount.length === 0) {
		return next(new ErrorResponse('Fee Schedules Not Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, docCount[0].count, 'Fetched Successfully'));
});

// @desc    Get a fee schedule
// @route   GET /api/v1/feeSchedule/:id
// @access  Private
exports.getFeeSchedule = catchAsync(async (req, res, next) => {
	const feeSchedule = await FeeSchedule.findById(req.params.id);
	if (!feeSchedule) {
		return next(new ErrorResponse('Fee Schedule Not Found', 404));
	}
	res.status(200).json(SuccessResponse(feeSchedule, 1, 'Fetched Successfully'));
});

// @desc    Update a fee schedule
// @route   PUT /api/v1/feeSchedule/:id
// @access  Private
exports.update = async (req, res, next) => {
	const { id } = req.params;
	let { scheduleName, description, schoolId, day, months, existMonths } =
		req.body;
	let feeSchedule = await FeeSchedule.findById(id).lean();

	if (!feeSchedule) {
		return next(new ErrorResponse('Fee Schedule Not Found', 404));
	}

	months = months.sort(
		(a, b) => existMonths.indexOf(a) - existMonths.indexOf(b)
	);

	const scheduledDates = getScheduleDates(months, day);
	try {
		feeSchedule = await FeeSchedule.findByIdAndUpdate(
			id,
			{
				scheduleName,
				description,
				schoolId,
				scheduledDates,
				day,
				months,
			},
			{ new: true }
		);
	} catch (error) {
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
	res.status(200).json(SuccessResponse(feeSchedule, 1, 'Updated Successfully'));
};

// @desc    Delete a fee schedule
// @route   DELETE /api/v1/feeSchedule/:id
// @access  Private
exports.deleteFeeSchedule = catchAsync(async (req, res, next) => {
	const feeSchedule = await FeeSchedule.findByIdAndDelete(req.params.id);
	if (!feeSchedule) {
		return next(new ErrorResponse('Fee Schedule Not Found', 404));
	}
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
});
