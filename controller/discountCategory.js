const mongoose = require('mongoose');
const DiscountCategory = require('../models/discountCategory');
const FeeInstallment = require('../models/feeInstallment');
const FeeStructure = require('../models/feeStructure');
const SectionDiscount = require('../models/sectionDiscount');
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
TODO: Need to fetch sectionDiscount aggregation.
With the row discount data.
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
	const classList = await SectionDiscount.aggregate([
		{
			$match: {
				discountId: mongoose.Types.ObjectId(id),
			},
		},
		{
			$group: {
				_id: {
					sectionId: '$sectionId',
					sectionName: '$sectionName',
					totalStudents: '$totalStudents',
					totalApproved: '$totalApproved',
					totalPending: '$totalPending',
					totalRejected: '$totalRejected',
				},
				totalAmount: {
					$sum: '$totalAmount',
				},
				rows: {
					$addToSet: {
						feeTypeId: '$feeTypeId',
						totalAmount: '$totalAmount',
						isPercentage: '$isPercentage',
						value: '$value',
					},
				},
			},
		},
		{
			$unwind: {
				path: '$rows',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$lookup: {
				from: 'feetypes',
				localField: 'rows.feeTypeId',
				foreignField: '_id',
				as: 'rows.feeTypeId',
			},
		},
		{
			$group: {
				_id: '$_id',
				totalAmount: {
					$first: '$totalAmount',
				},
				rows: {
					$push: {
						feeTypeId: {
							$first: '$rows.feeTypeId',
						},
						totalAmount: '$rows.totalAmount',
						isPercentage: '$rows.isPercentage',
						value: '$rows.value',
					},
				},
			},
		},
		{
			$project: {
				_id: 0,
				sectionId: '$_id.sectionId',
				sectionName: '$_id.sectionName',
				totalStudents: '$_id.totalStudents',
				totalApproved: '$_id.totalApproved',
				totalPending: '$_id.totalPending',
				totalRejected: '$_id.totalRejected',
				rows: 1,
			},
		},
	]);
	if (classList.length === 0) {
		return next(new ErrorResponse('No Discounts Found', 404));
	}

	res
		.status(200)
		.json(SuccessResponse(classList, classList.length, 'Fetched Successfully'));
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
		const { sectionId, categoryId, rows, studentList, sectionName } = req.body;
		const { discountId } = req.params;

		if (!sectionId || !categoryId || !rows || !studentList) {
			throw new ErrorResponse('Please Provide All Required Fields', 422);
		}
		// TODO: Create a new document for sectionDiscount model.
		// TODO: before storing fetch the total amount of that row/fee type from the fee structure.
		let { feeDetails } = await FeeStructure.findOne(
			{
				sectionId,
				categoryId,
				schoolId: req.user.school_id,
			},
			'feeDetails'
		).lean();
		feeDetails = feeDetails.reduce((acc, curr) => {
			acc[curr.feeTypeId] = curr;
			return acc;
		}, {});

		const classList = await Promise.all(
			rows.map(async row => {
				const { rowId, feeTypeId, isPercentage, value, breakdown } = row;
				if (!rowId || isPercentage === undefined || !value) {
					throw new ErrorResponse('Please Provide All Required Fields', 422);
				}
				// TODO: While approving, the discount amount and percentage should be divided by number of breakdowns.
				const discountToPush = {
					discountId,
					isPercentage,
					value,
				};
				await FeeInstallment.updateMany(
					{
						rowId,
						studentId: { $in: studentList },
					},
					{
						$push: { discounts: discountToPush },
					},
					{
						multi: true,
					}
				);
				const { totalAmount } = feeDetails[feeTypeId];
				const discountAmount = isPercentage
					? (totalAmount * value) / 100
					: value;
				return {
					discountId,
					sectionId,
					sectionName,
					feeTypeId,
					totalStudents: studentList.length,
					totalAmount, // totalAmount
					discountAmount,
					breakdown,
					isPercentage,
					value,
				};
			})
		);
		//  Create multiple new document in the sectionDiscount model.
		await SectionDiscount.insertMany(classList);

		res.json(SuccessResponse(null, 1, 'Mapped Successfully'));
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
