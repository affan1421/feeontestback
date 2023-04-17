const mongoose = require('mongoose');
const DiscountCategory = require('../models/discountCategory');
const FeeInstallment = require('../models/feeInstallment');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

// Create a new discount
const createDiscountCategory = async (req, res, next) => {
	try {
		const {
			name,
			description = '',
			discountType,
			feeTypeId,
			schoolId,
			budgetAllocated,
			budgetRemaining,
		} = req.body;
		if (
			!name ||
			!discountType ||
			!feeTypeId ||
			!schoolId ||
			!budgetAllocated ||
			!budgetRemaining
		) {
			return next(new ErrorResponse('Please Provide All Required Fields', 422));
		}
		const discount = await DiscountCategory.create({
			name,
			description,
			discountType,
			feeTypeId,
			schoolId,
			budgetAllocated,
			budgetRemaining,
		});
		res.status(201).json(SuccessResponse(discount, 1, 'Created Successfully'));
	} catch (error) {
		console.log(error.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

// Get all discounts
const getDiscountCategory = catchAsync(async (req, res, next) => {
	const { schoolId, page = 0, limit = 10 } = req.query;
	const query = {};
	if (schoolId) {
		query.schoolId = mongoose.Types.ObjectId(schoolId);
	}

	const discounts = await DiscountCategory.aggregate([
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
	const { data, count } = discounts[0];

	if (count.length === 0) {
		return next(new ErrorResponse('Discounts Not Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched Successfully'));
});

const getDiscountCategoryByClass = catchAsync(async (req, res, next) => {
	let { schoolId } = req.body;
	schoolId = mongoose.Types.ObjectId(schoolId);

	const discounts = await DiscountCategory.aggregate([
		{
			$match: {
				schoolId,
			},
		},
		{
			$group: {
				_id: null,
				totalAppliedTo: {
					$push: '$appliedTo',
				},
			},
		},
		{
			$project: {
				totalApplied: {
					$reduce: {
						input: '$totalAppliedTo',
						initialValue: [],
						in: {
							$concatArrays: ['$$value', '$$this'],
						},
					},
				},
			},
		},
		{
			$unwind: '$totalApplied',
		},
		{
			$group: {
				_id: {
					className: '$className',
					sectionId: '$sectionId',
				},
				totalClass: {
					$push: '$$ROOT',
				},
			},
		},
		{
			$project: {
				_id: 1,
				presents: {
					$size: {
						$filter: {
							input: '$totalClass',
							as: 'num',
							cond: {
								$eq: ['$$num.isApproved', false],
							},
						},
					},
				},
				absents: {
					$size: {
						$filter: {
							input: '$totalClass',
							as: 'num',
							cond: {
								$eq: ['$$num.isApproved', true],
							},
						},
					},
				},
			},
		},
	]);
	const { data, count } = discounts[0];

	if (count.length === 0) {
		return next(new ErrorResponse('Discounts Not Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched Successfully'));
});

const getDiscountCategoryById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const discount = await DiscountCategory.findOne({ id });
	if (!discount) {
		return next(new ErrorResponse('Discount Not Found', 404));
	}
	res.status(200).json(SuccessResponse(discount, 1, 'Fetched Successfully'));
});

const updateDiscountCategory = async (req, res, next) => {
	const { id } = req.params;

	try {
		const discount = await DiscountCategory.findByOneAndUpdate(
			{ _id: id, schoolId: req.body.schoolId },
			req.body,
			{
				new: true,
				runValidators: true,
			}
		);
		if (!discount) {
			return next(new ErrorResponse('Discount Not Found', 404));
		}
		res.status(200).json(SuccessResponse(discount, 1, 'Updated Successfully'));
	} catch (error) {
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

const addClassAndStudent = async (req, res, next) => {
	try {
		const { feeType, amount, total, type, value } = req.body;
		// find data by fee type here
		// feetype.find({feeType});
		let discountedAmount;
		feeType == 'Library fees'
			? type == 'percentage'
				? (discountedAmount = (value / 12) * amount)
				: (discountedAmount = value)
			: t == 0;

		feeType == 'Academic'
			? type == 'percentage'
				? (discountedAmount = (value / 12) * amount)
				: (discountedAmount = value)
			: t == 0;
		// TODO need to work here
	} catch (error) {
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

// Delete a discount
const deleteDiscountCategory = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const discount = await DiscountCategory.findOneAndDelete(id);
	if (!discount) {
		return next(new ErrorResponse('Discount Not Found', 404));
	}
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
});

module.exports = {
	createDiscountCategory,
	getDiscountCategory,
	getDiscountCategoryById,
	updateDiscountCategory,
	deleteDiscountCategory,
	getDiscountCategoryByClass,
	addClassAndStudent,
};
