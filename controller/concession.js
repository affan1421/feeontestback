const mongoose = require('mongoose');
const Discount = require('../models/concession');
const FeeInstallment = require('../models/feeInstallment');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

// Create a new discount
const createDiscount = async (req, res, next) => {
	try {
		const {
			discountName,
			description = '',
			discountType,
			feeTypeId,
			schoolId,
			amountType,
			value,
		} = req.body;
		if (
			!discountName ||
			!discountType ||
			!feeTypeId ||
			!schoolId ||
			!amountType ||
			!value
		) {
			return next(new ErrorResponse('Please Provide All Required Fields', 422));
		}
		const discount = await Discount.create({
			discountName,
			description,
			discountType,
			feeTypeId,
			schoolId,
			amountType,
			value,
		});
		res.status(201).json(SuccessResponse(discount, 1, 'Created Successfully'));
	} catch (error) {
		console.log(error.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

// Get all discounts
const getDiscounts = catchAsync(async (req, res, next) => {
	const { schoolId, page = 0, limit = 10 } = req.query;
	const query = {};
	if (schoolId) {
		query.schoolId = mongoose.Types.ObjectId(schoolId);
	}

	const discounts = await Discount.aggregate([
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

// Get a discount by id
const getDiscountById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const discount = await Discount.findById(id);
	if (!discount) {
		return next(new ErrorResponse('Discount Not Found', 404));
	}
	res.status(200).json(SuccessResponse(discount, 1, 'Fetched Successfully'));
});

// Update a discount
// UseCases to discuss.
// 1. Who and how can approve the discount and student (Role based approval).
// 2. If the discount is applied to a student, then the discount should not be updated, Since it is approved.
//   - If the discount is not approved, then the discount can be updated.
//   - If force updated (discountType, amountType, value, approvedOn, approvedBy) then need to re-calculate the netAmount of all linked student feeInstallments.
//   - If feeTypeId is changed, then remove the discountId from all the linked installments and re-map the discountId to the new feeTypeId's Installments and re-calculate netAmount.
//   - Exceptional fields are discountName, description.
//   - If one student is deleted after approved the discount, then the discount should be removed from the student and netAmount should be totalAmount.
//   - If new student is added after approved the discount, then the discount should be added to the student and netAmount should be totalAmount - discountAmount.
const updateDiscount = async (req, res, next) => {
	const { id } = req.params;

	try {
		const discount = await Discount.findByIdAndUpdate(id, req.body, {
			new: true,
			runValidators: true,
		});
		if (!discount) {
			return next(new ErrorResponse('Discount Not Found', 404));
		}
		res.status(200).json(SuccessResponse(discount, 1, 'Updated Successfully'));
	} catch (error) {
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

// Delete a discount
const deleteDiscount = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const discount = await Discount.findByIdAndDelete(id);
	if (!discount) {
		return next(new ErrorResponse('Discount Not Found', 404));
	}
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
});

module.exports = {
	createDiscount,
	getDiscounts,
	getDiscountById,
	updateDiscount,
	deleteDiscount,
};
