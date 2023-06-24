/* eslint-disable no-unused-expressions */
const mongoose = require('mongoose');
const moment = require('moment');
const excel = require('excel4node');
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

	const date = moment(expenseDate, 'MM-DD-YYYY').format('DDMMYY');

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

	// const currentDate = new Date();
	const expenseDateDate = moment(expenseDate, 'MM-DD-YYYY').format(
		'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]'
	);
	// const updatedExpenseDate = expenseDateDate.setTime(currentDate.getTime());

	let newExpense;
	try {
		newExpense = await ExpenseModel.create({
			reason,
			schoolId,
			voucherNumber,
			amount,
			transactionDetails,
			// expenseDate: updatedExpenseDate,
			expenseDate: expenseDateDate,
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
		date, // single date
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

	if (date) {
		const startDate = moment(date).startOf('day').toDate();
		const endDate = moment(date).endOf('day').toDate();
		match.expenseDate = { $gte: startDate, $lte: endDate };
	}

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
	const {
		schoolId,
		dateRange = null,
		startDate = null,
		endDate = null,
	} = req.query;

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

	// START DATE
	const getStartDate = (date, type) =>
		date
			? moment(date, 'MM/DD/YYYY').startOf('day').toDate()
			: moment().startOf(type).toDate();
	// END DATE
	const getEndDate = (date, type) =>
		date
			? moment(date, 'MM/DD/YYYY').endOf('day').toDate()
			: moment().endOf(type).toDate();

	// PREV START DATE
	const getPrevStartDate = (date, type, flag) =>
		date
			? moment(date, 'MM/DD/YYYY').subtract(1, flag).startOf('day').toDate()
			: moment().subtract(1, flag).startOf(type).toDate();
	// PREV END DATE
	const getPrevEndDate = (date, type, flag) =>
		date
			? moment(date, 'MM/DD/YYYY').subtract(1, flag).endOf('day').toDate()
			: moment().subtract(1, flag).endOf(type).toDate();

	switch (dateRange) {
		case 'daily':
			dateObj = {
				$gte: getStartDate(startDate, 'day'),
				$lte: getEndDate(endDate, 'day'),
			};
			prevDateObj = {
				$gte: getPrevStartDate(startDate, 'day', 'days'),
				$lte: getPrevEndDate(endDate, 'day', 'days'),
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
			break;

		case 'weekly':
			dateObj = {
				$gte: getStartDate(startDate, 'week'),
				$lte: getEndDate(endDate, 'week'),
			};
			prevDateObj = {
				$gte: getPrevStartDate(startDate, 'week', 'weeks'),
				$lte: getPrevEndDate(endDate, 'week', 'weeks'),
			};
			totalExpenseAggregation.push(...tempAggregation);

			break;

		case 'monthly':
			dateObj = {
				$gte: getStartDate(startDate, 'month'),
				$lte: getEndDate(endDate, 'month'),
			};
			prevDateObj = {
				$gte: getPrevStartDate(startDate, 'month', 'months'),
				$lte: getPrevEndDate(endDate, 'month', 'months'),
			};
			totalExpenseAggregation.push(...tempAggregation);

			break;

		default:
			dateObj = {
				$gte: getStartDate(startDate),
				$lte: getEndDate(endDate),
			};
			totalExpenseAggregation.push(...tempAggregation);
			break;
	}

	totalExpenseAggregation[0].$match.expenseDate = dateObj;
	const aggregate = [
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
				totalExpenseCurrent: totalExpenseAggregation,
			},
		},
	];
	if (dateRange) {
		aggregate[0].$facet.totalExpensePrev = [
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
		];
	}

	const expenseData = await ExpenseModel.aggregate(aggregate);
	let {
		totalExpense,
		totalExpensePrev = [],
		totalExpenseCurrent,
	} = expenseData[0];
	const totalExpenseData = totalExpense[0]
		? totalExpense[0]
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
	totalExpensePrev = totalExpensePrev[0]?.totalExpAmount || 0;
	totalExpenseCurrent = totalExpenseCurrent[0]?.totalExpAmount || 0;
	const finalData = {
		totalExpense: totalExpenseData,
		totalExpenseCurrent: totalExpenseCurrent[0] ?? {
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

exports.getExcel = catchAsync(async (req, res, next) => {
	const { schoolId, paymentMethod } = req.query;
	let match = {};
	if (!schoolId) {
		return next(new ErrorResponse('schoolId is required', 422));
	}
	match = {
		schoolId: mongoose.Types.ObjectId(req.body.schoolId),
	};
	paymentMethod ? (match.paymentMethod = paymentMethod) : null;

	const expenseDetails = await ExpenseModel.aggregate([
		{
			$match: match,
		},
		{
			$lookup: {
				from: 'expensetypes',
				localField: 'expenseType',
				foreignField: '_id',
				as: 'expenseType',
			},
		},
		{
			$addFields: {
				expenseType: {
					$first: '$expenseType.name',
				},
			},
		},
	]);
	const workbook = new excel.Workbook();
	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Expense Details');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	worksheet.cell(1, 1).string('Expense Type').style(style);
	worksheet.cell(1, 2).string('Amount').style(style);
	worksheet.cell(1, 3).string('Reason').style(style);
	worksheet.cell(1, 4).string('Voucher Number').style(style);
	worksheet.cell(1, 5).string('Expense Date').style(style);
	worksheet.cell(1, 6).string('Payment Method').style(style);

	expenseDetails.forEach((expense, index) => {
		worksheet.cell(index + 2, 1).string(expense.expenseType);
		worksheet.cell(index + 2, 2).number(expense.amount);

		worksheet.cell(index + 2, 3).string(expense.reason);
		worksheet.cell(index + 2, 4).string(expense.voucherNumber);
		worksheet
			.cell(index + 2, 5)
			.string(moment(expense.expenseDate).format('DD-MM-YYYY'));
		worksheet.cell(index + 2, 6).string(expense.paymentMethod);
	});

	workbook.write('expense.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res
		.status(200)
		.json(SuccessResponse(data, expenseDetails.length, 'Fetched Successfully'));
});
