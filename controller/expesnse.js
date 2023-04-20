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
	let match = {};
	const limit = parseInt(req.body.limit ?? 10);
	const page = req.body.page ?? 1;
	const skip = parseInt(page - 1) * limit;
	const sortBy = req.body.sortBy ?? 'expenseDate';
	const sortOrder = req.body.sortOrder ?? 1;
	const sortObject = {};
	let searchTerm = req.body.searchTerm ?? '';
	sortObject[sortBy] = sortOrder;
	match = {
		schoolId: req.body.schoolId,
	};

	if (searchTerm != '') {
		searchTerm = searchTerm.replace(/\(/gi, '\\(').replace(/\)/gi, '\\)');
		match.$or = [
			{ expenseType: { $regex: `${searchTerm}`, $options: 'i' } },
			{ reason: { $regex: `${searchTerm}`, $options: 'i' } },
			{ amount: { $regex: `${searchTerm}`, $options: 'i' } },
			{ expenseDate: { $regex: `${searchTerm}`, $options: 'i' } },
			{ paymentMethod: { $regex: `${searchTerm}`, $options: 'i' } },
		];
	}
	const filterMatch = {};
	if (req.body.filters && req.body.filters.length) {
		await Promise.all(
			req.body.filters.map(async filter => {
				switch (filter.filterOperator) {
					case 'greater_than':
						filterMatch[filter.filterName] = {
							$gt: parseFloat(filter.filterValue),
						};
						break;

					case 'less_than':
						filterMatch[filter.filterName] = {
							$lt: parseFloat(filter.filterValue),
						};
						break;

					case 'equal_to':
						filterMatch[filter.filterName] = {
							$eq: parseFloat(filter.filterValue),
						};
						break;

					case 'not_equal_to':
						filterMatch[filter.filterName] = {
							$ne: parseFloat(filter.filterValue),
						};
						break;
				}
			})
		);
	}
	const expenseTypes = await ExpenseModel.aggregate([
		{
			$match: match,
		},
		{
			$match: filterMatch,
		},
		{
			$sort: sortObject,
		},
		{
			$facet: {
				data: [
					{
						$skip: skip,
					},
					{
						$limit: limit,
					},
				],
				pagination: [
					{
						$count: 'total',
					},
				],
			},
		},
	]);
	const { data, pagination } = expenseTypes[0];

	if (pagination[0]?.total.length === 0) {
		return next(new ErrorResponse('No Expense Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, pagination[0].total, 'Fetched Successfully'));
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
