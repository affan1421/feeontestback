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
			schoolId,
			budgetAllocated = 0,
			budgetRemaining = 0,
			createdBy,
		} = req.body;
		if (!name || !schoolId || !budgetAllocated || !budgetRemaining) {
			return next(new ErrorResponse('Please Provide All Required Fields', 422));
		}
		const isExists = await DiscountCategory.findOne({
			name,
			schoolId,
		});

		if (isExists) {
			return next(new ErrorResponse(`Discount ${name} Already Exists`, 400));
		}

		const discount = await DiscountCategory.create({
			name,
			description,
			schoolId,
			budgetAllocated,
			budgetRemaining,
			createdBy,
		});
		res.status(201).json(SuccessResponse(discount, 1, 'Created Successfully'));
	} catch (error) {
		console.log(error.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

/*
[{
	sectionId: 'sectionId',
	sectionName: 'sectionName',
	totalAmount: 15000',
	totalStudents: 50,
	approvedStudents: 30,
	pendingStudents: 20,
}]
*/
const getDiscountCategoryByClass = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const classList = await FeeInstallment.aggregate([
		{
			$match: {
				discountId: mongoose.Types.ObjectId(id),
			},
		},
	]);
});

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

const getDiscountCategoryById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const discount = await DiscountCategory.findOne({
		id,
		schoolId: req.user.school_id,
	});
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

// Delete a discount
const deleteDiscountCategory = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const discount = await DiscountCategory.findOneAndDelete(id);
	if (!discount) {
		return next(new ErrorResponse('Discount Not Found', 404));
	}
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
});

// TODO:
/*
1. Save the discount category in the fee installment of assigned students discount array of feeInstallment: 
{
	discountId: 'discountId',
	amount: 'amount',
	isPercentage: true,
	value: 10,
}
2. Update the budget remaining of the discount category
3. Update the discount amount of the fee installment
4. Add the classList objects in the array.
{
	feeTypeId: 'feeTypeId',
	totalFee: 'totalFee',
	sectionId: 'sectionId',
	categoryId: 'categoryId',
	feeStructureId: 'feeStructureId',
	amount: 'amount',
	breakdown: 1,
	isPercentage: true,
	value: 10,
	discountAmount: 'discountAmount',
}
Payload: 
{
	sectionId: 'sectionId',
	categoryId: 'categoryId',
	rows: [{
		rowId: 'rowId',
		breakdown: 1,
		isPercentage: true,
		value: 10,
	}],
	studentList: ['studentId', 'studentId']
}
*/
const mapDiscountCategory = async (req, res, next) => {
	try {
		const { sectionId, categoryId, rows, studentList } = req.body;
		const { discountId } = req.params;

		if (!sectionId || !categoryId || !rows || !studentList) {
			throw new ErrorResponse('Please Provide All Required Fields', 422);
		}

		let totalDiscountAmount = 0;
		const classList = await Promise.all(
			rows.map(async row => {
				if (!row.rowId || row.isPercentage === undefined || !row.value) {
					throw new ErrorResponse('Please Provide All Required Fields', 422);
				}

				const feeInstallments = await FeeInstallment.findOne({
					rowId: row.rowId,
					schoolId: req.user.school_id,
				}).lean();
				if (!feeInstallments) {
					throw new ErrorResponse('Fee Installments not found', 404);
				}
				const { totalAmount, _id: feeInstallmentId } = feeInstallments;
				const discountAmount = row.isPercentage
					? (totalAmount * row.value) / 100
					: row.value;
				totalDiscountAmount += discountAmount;

				const discount = {
					discountId,
					discountAmount,
					isPercentage: row.isPercentage,
					value: row.value,
				};

				await FeeInstallment.updateMany(
					{
						_id: feeInstallmentId,
						studentId: { $in: studentList },
					},
					{
						$push: { discounts: discount },
						$inc: { discountAmount },
						// TODO: Resolve this and update
						// $set: {
						// 	netAmount: { $subtract: ['$totalAmount', '$discountAmount'] },
						// },
					}
				);

				return {
					feeTypeId: feeInstallments.feeTypeId,
					totalFee: feeInstallments.totalAmount,
					sectionId,
					categoryId,
					feeStructureId: feeInstallments.feeStructureId,
					amount: feeInstallments.amount,
					breakdown: row.breakdown,
					isPercentage: row.isPercentage,
					value: row.value,
					discountAmount,
				};
			})
		);

		await DiscountCategory.findOneAndUpdate(
			{ _id: discountId, schoolId: req.user.school_id },
			{
				$push: { classList: { $each: classList } },
				$inc: {
					budgetRemaining: -totalDiscountAmount,
					totalStudents: studentList.length,
					totalPending: studentList.length,
				},
			}
		);

		return res.json(SuccessResponse(null, 1, 'Mapped Successfully'));
	} catch (error) {
		console.error(error.stack);
		return next(error);
	}
};

module.exports = {
	createDiscountCategory,
	getDiscountCategory,
	getDiscountCategoryById,
	updateDiscountCategory,
	deleteDiscountCategory,
	mapDiscountCategory,
	getDiscountCategoryByClass,
};
