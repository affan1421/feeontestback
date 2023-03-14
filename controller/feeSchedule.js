const mongoose = require('mongoose');
const FeeSchedule = require('../models/feeSchedule');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

// @desc    Create a new fee schedule
// @route   POST /api/v1/feeSchedule
// @access  Private
exports.create = catchAsync(async (req, res, next) => {
	const {
		scheduleName,
		description,
		scheduleType,
		startDate, // 2023-05-01
		endDate, // 2024-03-01
		schoolId,
		interval = 1,
	} = req.body;
	if (!scheduleName || !scheduleType || !startDate || !endDate || !schoolId) {
		return res
			.status(422)
			.json(
				new ErrorResponse('Please Provide All Required Fields', 422).toJSON()
			);
	}
	const isExists = await FeeSchedule.findOne({
		scheduleName,
		schoolId,
		scheduleType,
	});
	if (isExists) {
		return res
			.status(400)
			.json(new ErrorResponse('Fee Schedule Already Exists', 400).toJSON());
	}
	let initialDate = new Date(startDate);
	const scheduledDates = [];
	if (scheduleType === 'Monthly') {
		while (initialDate <= new Date(endDate)) {
			scheduledDates.push(new Date(initialDate));
			initialDate = new Date(initialDate).setMonth(
				new Date(initialDate).getMonth() + Number(interval)
			);
		}
	} else {
		scheduledDates.push(initialDate);
	}

	const feeSchedule = await FeeSchedule.create({
		scheduleName,
		description,
		scheduleType,
		schoolId,
		scheduledDates,
		startDate,
		endDate,
		interval,
	});
	res.status(201).json(SuccessResponse(feeSchedule, 1, 'Created Successfully'));
});

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
				count: [{ $match: payload }, { $count: 'count' }],
			},
		},
	]);
	const { data, count } = feeSchedules[0];

	if (count.length === 0) {
		return res
			.status(404)
			.json(new ErrorResponse('Fee Schedules Not Found', 404).toJSON());
	}
	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched Successfully'));
});

// @desc    Get a fee schedule
// @route   GET /api/v1/feeSchedule/:id
// @access  Private
exports.getFeeSchedule = catchAsync(async (req, res, next) => {
	const feeSchedule = await FeeSchedule.findById(req.params.id);
	if (!feeSchedule) {
		return res
			.status(404)
			.json(new ErrorResponse('Fee Schedule Not Found', 404).toJSON());
	}
	res.status(200).json(SuccessResponse(feeSchedule, 1, 'Fetched Successfully'));
});

// @desc    Update a fee schedule
// @route   PUT /api/v1/feeSchedule/:id
// @access  Private
exports.update = catchAsync(async (req, res, next) => {
	const feeSchedule = await FeeSchedule.findByIdAndUpdate(
		req.params.id,
		req.body
	);
	if (!feeSchedule) {
		return res
			.status(404)
			.json(new ErrorResponse('Fee Schedule Not Found', 404).toJSON());
	}
	res.status(200).json(SuccessResponse(feeSchedule, 1, 'Updated Successfully'));
});

// @desc    Delete a fee schedule
// @route   DELETE /api/v1/feeSchedule/:id
// @access  Private
exports.deleteFeeSchedule = catchAsync(async (req, res, next) => {
	const feeSchedule = await FeeSchedule.findByIdAndDelete(req.params.id);
	if (!feeSchedule) {
		return res
			.status(404)
			.json(new ErrorResponse('Fee Schedule Not Found', 404).toJSON());
	}
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
});
