const mongoose = require('mongoose');
const AcademicYear = require('../models/academicYear');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');
const catchAsync = require('../utils/catchAsync');
const FeeTypes = require('../models/feeType');
const FeeSchedule = require('../models/feeSchedule');

// Create a new AcademicYear
const create = async (req, res, next) => {
	try {
		let { name, startDate, endDate, schoolId } = req.body;
		if (!name || !startDate || !endDate || !schoolId) {
			return next(new ErrorResponse('Please Provide All Required Fields', 422));
		}
		const months = [];
		startDate = new Date(startDate);
		endDate = new Date(endDate);
		while (startDate <= endDate) {
			months.push(startDate.getMonth() + 1);
			startDate.setMonth(startDate.getMonth() + 1);
		}
		const academicYear = await AcademicYear.create({
			name,
			startDate,
			endDate,
			schoolId,
			months,
		});
		res
			.status(201)
			.json(SuccessResponse(academicYear, 1, 'Created Successfully'));
	} catch (error) {
		console.error(error);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

// Get all AcademicYears
const getAll = catchAsync(async (req, res, next) => {
	let { schoolId, page = 0, limit = 5 } = req.query;
	page = +page;
	limit = +limit;
	const payload = {};
	if (schoolId) {
		payload.schoolId = mongoose.Types.ObjectId(schoolId);
	}
	const academicYears = await AcademicYear.aggregate([
		{
			$facet: {
				data: [{ $match: payload }, { $skip: page * limit }, { $limit: limit }],
				docCount: [{ $match: payload }, { $count: 'count' }],
			},
		},
	]);
	const { data, docCount } = academicYears[0];

	if (docCount.length === 0) {
		return next(new ErrorResponse('Academic years Not Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, docCount[0].count, 'Fetched Successfully'));
});

// Get an AcademicYear by ID
const getAcademicYear = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const academicYear = await AcademicYear.findById(id);
	if (!academicYear) {
		return next(new ErrorResponse('Academic year Not Found', 404));
	}

	res
		.status(200)
		.json(SuccessResponse(academicYear, 1, 'Fetched Successfully'));
});

// Update an AcademicYear by ID
const update = async (req, res, next) => {
	try {
		const { id } = req.params;
		const isScheduleMapped = await FeeSchedule.findOne({
			academicYearId: id,
		});

		if (isScheduleMapped) {
			return next(
				new ErrorResponse(
					'Academic Year Is Already Mapped With Fee Schedule',
					422
				)
			);
		}

		const { startDate, endDate } = req.body;
		if (startDate && endDate) {
			const months = [];
			const start = new Date(startDate);
			const end = new Date(endDate);
			while (start <= end) {
				months.push(start.getMonth() + 1);
				start.setMonth(start.getMonth() + 1);
			}
			req.body.months = months;
		}

		const academicYear = await AcademicYear.findByIdAndUpdate(id, req.body, {
			new: true,
			runValidators: true,
		});
		if (!academicYear) {
			return next(new ErrorResponse('Academic year Not Found', 404));
		}
		if (academicYear.isActive) {
			await AcademicYear.updateMany(
				{ _id: { $ne: id }, isActive: true, schoolId: req.body.schoolId },
				{ isActive: false }
			);
		}
		res
			.status(200)
			.json(SuccessResponse(academicYear, 1, 'Updated Successfully'));
	} catch (error) {
		console.log('error', error);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

// Delete an AcademicYear by ID
const deleteAcademicYear = async (req, res, next) => {
	try {
		const { id } = req.params;
		const isTypeMapped = await FeeTypes.findOne({ academicYearId: id });
		const isScheduleMapped = await FeeSchedule.findOne({ academicYearId: id });
		if (isTypeMapped || isScheduleMapped) {
			return next(
				new ErrorResponse(
					'Academic Year Is Already Mapped With Fee Type Or Fee Schedule',
					422
				)
			);
		}
		const academicYear = await AcademicYear.findByIdAndDelete(id);
		if (!academicYear) {
			return next(new ErrorResponse('Academic year Not Found', 404));
		}
		res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
	} catch (error) {
		console.log('error', error);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

module.exports = {
	create,
	getAll,
	getAcademicYear,
	update,
	deleteAcademicYear,
};
