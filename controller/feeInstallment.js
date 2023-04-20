const mongoose = require('mongoose');
const FeeInstallment = require('../models/feeInstallment');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

exports.GetTransactions = catchAsync(async (req, res, next) => {
	const {
		pageNum = 1,
		limit = 10,
		schoolId = null,
		status = 'Paid',
	} = req.query;

	if (limit > 50) {
		return next(new ErrorResponse('Page limit should not excede 50', 400));
	}

	const matchQuery = {};

	if (schoolId) {
		matchQuery.schoolId = schoolId;
	}
	if (status) {
		matchQuery.status = status;
	}

	const foundTransactions = await FeeInstallment.aggregate([
		{
			$match: matchQuery,
		},
		{
			$skip: limit * pageNum - limit,
		},
		{
			$limit: parseInt(limit),
		},
		{
			$sort: {
				paidDate: -1,
			},
		},
		{
			$lookup: {
				from: 'students',
				let: { studentId: '$studentId' },
				as: 'studentId',
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$studentId'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							profile_image: 1,
						},
					},
				],
			},
		},
		{
			$project: {
				_id: 1,
				studentId: {
					$first: '$studentId',
				},
				date: 1,
				paidDate: 1,
				totalAmount: 1,
				netAmount: 1,
				status: 1,
			},
		},
	]);

	return res
		.status(200)
		.json(SuccessResponse(foundTransactions, foundTransactions.length));
});
