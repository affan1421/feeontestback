/* eslint-disable no-unused-expressions */
const mongoose = require('mongoose');
const moment = require('moment');
const ExpenseModel = require('../models/expense');
const ExpenseType = require('../models/expenseType');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');

// CREATE
exports.create = async (req, res, next) => {
	const {
		reason,
		amount,
		approvedBy,
		paymentMethod,
		expenseType,
		expenseTypeName,
		expenseDate,
		schoolId,
		createdBy,
		transactionDetails,
	} = req.body;

	const date = moment(expenseDate).format('DDMMYY');

	if (!paymentMethod || !schoolId || !expenseType || !createdBy) {
		return next(new ErrorResponse('All Fields are Mandatory', 422));
	}

	const foundExpenseType = await ExpenseType.findOne({
		_id: mongoose.Types.ObjectId(expenseType),
	})
		.select('remainingBudget')
		.lean();

	if (!foundExpenseType) {
		return next(new ErrorResponse('Expense type not found', 400));
	}

	if (amount > foundExpenseType.remainingBudget) {
		return next(new ErrorResponse('Amount Exceeds Budget Amount', 400));
	}

	const lastVoucherNumber = await ExpenseModel.findOne({
		schoolId: mongoose.Types.ObjectId(schoolId),
	})
		.sort({ createdAt: -1 })
		.lean();

	let newCount = '00001';

	if (lastVoucherNumber && lastVoucherNumber.voucherNumber) {
		newCount = lastVoucherNumber.voucherNumber
			.slice(-5)
			.replace(/\d+/, n => String(Number(n) + 1).padStart(n.length, '0'));
	}
	const voucherNumber = `${expenseTypeName
		.slice(0, 2)
		.toUpperCase()}${date}${newCount}`;

	const currentDate = new Date();
	const expenseDateDate = new Date(expenseDate);
	const updatedExpenseDate = expenseDateDate.setTime(currentDate.getTime());

	let newExpense;
	try {
		newExpense = await ExpenseModel.create({
			reason,
			schoolId,
			voucherNumber,
			amount,
			transactionDetails,
			expenseDate: updatedExpenseDate,
			paymentMethod,
			expenseType,
			approvedBy,
			createdBy,
		});
		newExpense = JSON.parse(JSON.stringify(newExpense));
		const remainingBudget = await ExpenseType.findOneAndUpdate(
			{
				_id: expenseType,
			},
			{
				$inc: { remainingBudget: -parseInt(amount) },
				$addToSet: { expensesHistory: newExpense._id },
			},
			{
				new: true,
			}
		);

		newExpense.remainingBudget = remainingBudget.remainingBudget;
	} catch (error) {
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
		schoolId: mongoose.Types.ObjectId(req.body.schoolId),
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
				// eslint-disable-next-line default-case
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

					case 'contains':
						filterMatch[filter.filterName] = {
							$regex: filter.filterValue,
							$options: 'i',
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

	if (pagination[0]?.total === 0) {
		return next(new ErrorResponse('No Expense Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, pagination[0]?.total, 'Fetched Successfully'));
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
		{ _id: id, schoolId: mongoose.Types.ObjectId(req.body.schoolId) },
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
		_id: mongoose.Types.ObjectId(id),
	});
	if (expensetype === null) {
		return next(new ErrorResponse('Expense Not Found', 404));
	}
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
});

exports.totalExpenses = catchAsync(async (req, res, next) => {
	const expenseData = await ExpenseModel.aggregate([
		{
			$match: { schoolId: mongoose.Types.ObjectId(req.body.schoolId) },
		},
		{
			$group: {
				_id: '$expenseType',
				data: {
					$push: '$$ROOT',
				},
			},
		},
		{
			$project: {
				_id: 1,
				voucherNumber: 1,
				date: 1,
				paymentMethod: 1,
				totalExpense: {
					$sum: '$data.amount',
				},
			},
		},
		// {
		// 	$group: {
		// 		_id: '$_id',
		// 		data: {
		// 			$push: '$$ROOT',
		// 		},
		// 	},
		// },
		// {
		// 	$project: {
		// 		_id: 1,
		// 		totalExpense: {
		// 			$sum: '$data.totalExpense',
		// 		},
		// 	},
		// },
		{
			$lookup: {
				from: 'expensetypes',
				let: {
					expense_id: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$expense_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							description: 1,
						},
					},
				],
				as: '_id',
			},
		},
	]);
	if (expenseData[0] === null) {
		return next(new ErrorResponse('Expense Not Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(expenseData[0], 1, 'data fetched Successfully'));
});

exports.expensesList = catchAsync(async (req, res, next) => {
	const {
		schoolId,
		paymentMethod,
		sort,
		page = 0,
		limit = 10,
		searchTerm,
	} = req.body;
	let match = {};
	if (!schoolId) {
		return next(new ErrorResponse('SchoolId is required', 422));
	}
	match = {
		schoolId: mongoose.Types.ObjectId(req.body.schoolId),
	};
	paymentMethod ? (match.paymentMethod = paymentMethod) : null;

	// check if the search term is having number
	// eslint-disable-next-line no-restricted-globals
	if (searchTerm && !isNaN(searchTerm)) {
		match.amount = +searchTerm;
	} else if (searchTerm) {
		match.$or = [
			{ voucherNumber: { $regex: `${searchTerm}`, $options: 'i' } },
			{ approvedBy: { $regex: `${searchTerm}`, $options: 'i' } },
		];
	}

	const aggregation = [
		{
			$match: match,
		},
		{
			$sort: {
				expenseDate: -1,
			},
		},
		{
			$skip: page * limit,
		},
		{
			$limit: limit,
		},
		{
			$lookup: {
				from: 'expensetypes',
				let: {
					expense_id: '$expenseType',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$expense_id'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							description: 1,
						},
					},
				],
				as: 'expenseType',
			},
		},
		{
			$addFields: {
				expenseType: {
					$first: '$expenseType',
				},
			},
		},
	];
	if (sort) {
		aggregation[1].$sort = {
			amount: sort,
		};
	}
	const expenseData = await ExpenseModel.aggregate([
		{
			$facet: {
				data: aggregation,
				count: [
					{
						$match: match,
					},
					{
						$count: 'count',
					},
				],
			},
		},
	]);

	const { data, count } = expenseData[0];
	if (count.length === 0) {
		return next(new ErrorResponse('Expense Not Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched Successfully'));
});

function getDailyDates(date) {
	let startDate = new Date(date);
	startDate = new Date(
		startDate.getFullYear(),
		startDate.getMonth(),
		startDate.getDate()
	);
	const endDate = new Date(
		startDate.getFullYear(),
		startDate.getMonth(),
		startDate.getDate() + 1
	);
	return { startDate, endDate };
}
function getWeekDates(date) {
	let weekStart = new Date(date);
	weekStart = new Date(
		weekStart.getFullYear(),
		weekStart.getMonth(),
		weekStart.getDate() - 7
	);
	let weekEnd = new Date(date);
	weekEnd = new Date(
		weekEnd.getFullYear(),
		weekEnd.getMonth(),
		weekEnd.getDate()
	);
	return { weekStart, weekEnd };
}
function MonthlyDates(date, prev) {
	let monthStart = new Date(date);
	let monthEnd = new Date(date);
	if (prev) {
		const prevMonthStart = new Date(
			monthStart.getFullYear(),
			monthStart.getMonth() - 1,
			1
		);
		const prevMonthEnd = new Date(
			monthEnd.getFullYear(),
			monthEnd.getMonth() - 1,
			monthEnd.getDate()
		);
		return { prevMonthStart, prevMonthEnd };
	}
	monthStart = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
	monthEnd = new Date(
		monthEnd.getFullYear(),
		monthEnd.getMonth(),
		monthEnd.getDate() + 1
	);
	return { monthStart, monthEnd };
}

exports.totalExpenseFilter = catchAsync(async (req, res, next) => {
	const matchFilter = { schoolId: req.body.schoolId };
	const filterType = req.body.filtertype;
	const date = new Date();
	let startDate;
	let endDate;
	if (filterType == 'daily') {
		const { startDate, endDate } = getDailyDates(date);
		startDate = startDate;
		endDate = endDate;
	} else if (filterType == 'weekly') {
		const { weekStart, weekEnd } = getWeekDates(date);
		startDate = weekStart;
		endDate = weekEnd;
	} else if (filterType == 'monthly') {
		const prev = false;
		const { monthStart, monthEnd } = MonthlyDates(date, prev);
		startDate = monthStart;
		endDate = monthEnd;
	} else {
		startDate = req.body.startDate;
		endDate = req.body.endDate;
	}

	matchFilter.date = { $gte: startDate, $lte: endDate };

	const expenseData = await ExpenseModel.aggregate([
		{
			$match: matchFilter,
		},
		{
			$group: {
				_id: '$expenseType',
				data: {
					$push: '$$ROOT',
				},
			},
		},
		{
			$project: {
				_id: 1,
				voucherNumber: 1,
				date: 1,
				paymentMethod: 1,
				totalExpense: {
					$sum: '$data.amount',
				},
			},
		},
	]);
	if (expenseData[0] === null) {
		return next(new ErrorResponse('Expense Not Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(expenseData[0], 1, 'Deleted Successfully'));
});

exports.getDashboardData = catchAsync(async (req, res, next) => {
	const { schoolId, dateRange = 'daily' } = req.query;

	let dateObj = null;
	let prevDateObj = null;
	const totalExpenseAggregation = [
		{
			$match: {
				schoolId: mongoose.Types.ObjectId(schoolId),
				expenseDate: dateObj,
			},
		},
	];
	const tempAggregation = [
		{
			$group: {
				_id: {
					$dateToString: {
						format: '%Y-%m-%d',
						date: '$expenseDate',
					},
				},
				totalExpAmount: {
					$sum: '$amount',
				},
			},
		},
		{
			$sort: {
				_id: 1,
			},
		},
		{
			$group: {
				_id: null,
				totalExpAmount: {
					$sum: '$totalExpAmount',
				},
				expenseList: {
					$push: {
						expenseDate: '$_id',
						amount: '$totalExpAmount',
					},
				},
			},
		},
	];
	if (dateRange === 'daily') {
		const today = new Date();
		const startOfDate = today.setHours(0, 0, 0, 0);
		const endOfDate = today.setHours(23, 59, 59, 999);

		dateObj = {
			$gte: new Date(startOfDate),
			$lte: new Date(endOfDate),
		};
		prevDateObj = {
			$gte: moment().subtract(1, 'days').startOf('day').toDate(),
			$lte: moment().subtract(1, 'days').endOf('day').toDate(),
		};
		totalExpenseAggregation.push({
			$group: {
				_id: null,
				totalExpAmount: {
					$sum: '$amount',
				},
				// push only the issueDate and paidAmount
				expenseList: {
					$push: {
						expenseDate: '$expenseDate',
						amount: '$amount',
					},
				},
			},
		});
	} else if (dateRange === 'weekly') {
		dateObj = {
			$gte: moment().startOf('week').toDate(),
			$lte: moment().endOf('week').toDate(),
		};
		prevDateObj = {
			$gte: moment().subtract(1, 'weeks').startOf('week').toDate(),
			$lte: moment().subtract(1, 'weeks').endOf('week').toDate(),
		};
		totalExpenseAggregation.push(...tempAggregation);
	} else if (dateRange === 'monthly') {
		dateObj = {
			$gte: moment().startOf('month').toDate(),
			$lte: moment().endOf('month').toDate(),
		};
		prevDateObj = {
			$gte: moment().subtract(1, 'months').startOf('month').toDate(),
			$lte: moment().subtract(1, 'months').endOf('month').toDate(),
		};
		totalExpenseAggregation.push(...tempAggregation);
	}

	totalExpenseAggregation[0].$match.expenseDate = dateObj;

	const expenseData = await ExpenseModel.aggregate([
		{
			$facet: {
				totalExpense: [
					{
						$match: {
							schoolId: mongoose.Types.ObjectId(schoolId),
						},
					},
					{
						$group: {
							_id: '$expenseType',
							totalExpAmount: {
								$sum: '$amount',
							},
							schoolId: {
								$first: '$schoolId',
							},
						},
					},
					{
						$lookup: {
							from: 'expensetypes',
							let: {
								expTypeId: '$_id',
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$eq: ['$_id', '$$expTypeId'],
										},
									},
								},
								{
									$project: {
										name: 1,
									},
								},
							],
							as: '_id',
						},
					},
					{
						$group: {
							_id: '$schoolId',
							totalAmount: {
								$sum: '$totalExpAmount',
							},
							maxExpType: {
								$max: {
									totalExpAmount: '$totalExpAmount',
									expenseType: {
										$first: '$_id',
									},
								},
							},
							minExpType: {
								$min: {
									totalExpAmount: '$totalExpAmount',
									expenseType: {
										$first: '$_id',
									},
								},
							},
						},
					},
				],
				totalExpensePrev: [
					{
						$match: {
							schoolId: mongoose.Types.ObjectId(schoolId),
							expenseDate: prevDateObj,
						},
					},
					{
						$group: {
							_id: null,
							totalExpAmount: {
								$sum: '$amount',
							},
						},
					},
				],
				totalExpenseCurrent: totalExpenseAggregation,
			},
		},
	]);
	const totalExpenseData = expenseData[0].totalExpense[0]
		? expenseData[0].totalExpense[0]
		: {
				totalAmount: 0,
				maxExpType: {
					totalExpAmount: 0,
					expenseType: null,
				},
				minExpType: {
					totalExpAmount: 0,
					expenseType: null,
				},
		  };
	const totalExpensePrev =
		expenseData[0].totalExpensePrev[0]?.totalExpAmount || 0;
	const totalExpenseCurrent =
		expenseData[0].totalExpenseCurrent[0]?.totalExpAmount || 0;
	const finalData = {
		totalExpense: totalExpenseData,
		totalExpenseCurrent: expenseData[0].totalExpenseCurrent[0] ?? {
			totalExpAmount: 0,
			expenseList: [],
		},
		percentage:
			totalExpensePrev > 0
				? ((totalExpenseCurrent - totalExpensePrev) / totalExpensePrev) * 100
				: 0,
	};
	if (!expenseData.length) {
		return next(new ErrorResponse('Expense Not Found', 404));
	}
	res.status(200).json(SuccessResponse(finalData, 1, 'Fetched Successfully'));
});
