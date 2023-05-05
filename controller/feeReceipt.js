const mongoose = require('mongoose');
const FeeReceipt = require('../models/feeReceipt');
const SuccessResponse = require('../utils/successResponse');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const AcademicYear = require('../models/academicYear');

// Filter BY 'student.class.classId' and 'payment.method
const getFeeReceipt = catchAsync(async (req, res, next) => {
	let { schoolId, classId, paymentMode, page = 0, limit = 5 } = req.query;
	page = +page;
	limit = +limit;
	const payload = {};
	// find the active academic year

	const { _id: academicYearId } = await AcademicYear.findOne({
		isActive: true,
		schoolId,
	});
	payload['academicYear.academicYearId'] =
		mongoose.Types.ObjectId(academicYearId);
	if (schoolId) {
		payload['school.schoolId'] = mongoose.Types.ObjectId(schoolId);
	}
	if (classId) {
		payload['student.class.classId'] = mongoose.Types.ObjectId(classId);
	}
	if (paymentMode) {
		payload['payment.method'] = paymentMode;
	}
	const feeReceipts = await FeeReceipt.aggregate([
		{
			$facet: {
				data: [
					{ $match: payload },
					{ $sort: { createdAt: -1 } },
					{ $skip: page * limit },
					{ $limit: limit },
				],
				count: [{ $match: payload }, { $count: 'count' }],
			},
		},
	]);
	const { data, count } = feeReceipts[0];

	if (count.length === 0) {
		return next(new ErrorResponse('No Fee Receipts Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched Successfully'));
});

module.exports = {
	getFeeReceipt,
};
