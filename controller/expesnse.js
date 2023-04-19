const mongoose = require('mongoose');
const ExpenseModel = require('../models/expense');
const ExpenseType = require('../models/expenseType');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');

// CREATE
exports.create = async (req, res, next) => {
	const { reason, amount, paymentMethod, expenseType, schoolId } = req.body;
	if (!paymentMethod || !schoolId || !expenseType) {
		return next(new ErrorResponse('All Fields are Mandatory', 422));
	}

	let newExpense;
	try {
		newExpense = await ExpenseModel.create({
			reason,
			schoolId,
			amount,
			expenseDate: new Date(),
			paymentMethod,
			expenseType,
		});
		await ExpenseType.findOneAndUpdate(
			{
				_id: expenseType,
				schoolId,
			},
			{
				$inc: { remainignBudget: -amount },
				$addToSet: { expensesHistory: newExpense._id },
			}
		);
	} catch (error) {
		console.log('error', error);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
	return res
		.status(201)
		.json(SuccessResponse(newExpense, 1, 'Created Successfully'));
};

// GET
exports.getExpenses = catchAsync(async (req, res, next) => {
	let { schoolId, page = 0, limit = 5 } = req.query;
	page = +page;
	limit = +limit;
	const payload = {};
	if (schoolId) {
		payload.schoolId = mongoose.Types.ObjectId(schoolId);
	}
	const expenseTypes = await ExpenseModel.aggregate([
		{
			$facet: {
				data: [{ $match: payload }, { $skip: page * limit }, { $limit: limit }],
				count: [{ $match: payload }, { $count: 'count' }],
			},
		},
	]);
	const { data, count } = expenseTypes[0];

	if (count.length === 0) {
		return next(new ErrorResponse('No Expense Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched Successfully'));
});

// READ
exports.read = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	const expensetype = await ExpenseModel.findOne({
		_id: id,
	});
	if (expensetype === null) {
		return next(new ErrorResponse('Expense Not Found', 404));
	}
	res.status(200).json(SuccessResponse(expensetype, 1, 'Fetched Successfully'));
});

// UPDATE
exports.update = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const expensetype = await ExpenseModel.findOneAndUpdate(
		{ _id: id, schoolId: req.body.schoolId },
		req.body
	);
	if (expensetype === null) {
		return next(new ErrorResponse('Expense Not Found', 404));
	}
	res.status(200).json(SuccessResponse(expensetype, 1, 'Updated Successfully'));
});

// DELETE
exports.expenseDelete = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	const expensetype = await ExpenseModel.findOneAndDelete({
		_id: id,
	});
	if (expensetype === null) {
		return next(new ErrorResponse('Expense Not Found', 404));
	}
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
});
