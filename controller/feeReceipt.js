const mongoose = require('mongoose');
const moment = require('moment');
const excel = require('excel4node');
const FeeReceipt = require('../models/feeReceipt');
const FeeType = require('../models/feeType');
const SectionDiscount = require('../models/sectionDiscount');
const SuccessResponse = require('../utils/successResponse');
const DiscountCategory = require('../models/discountCategory');
const FeeInstallment = require('../models/feeInstallment');
const PreviousBalance = require('../models/previousFeesBalance');
const Expense = require('../models/expense');

const Sections = mongoose.connection.db.collection('sections');

const Student = mongoose.connection.db.collection('students');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const AcademicYear = require('../models/academicYear');

// Filter BY 'student.class.classId' and 'payment.method
const getFeeReceipt = catchAsync(async (req, res, next) => {
	let {
		schoolId,
		classId,
		paymentMode,
		receiptType,
		page = 0,
		limit = 5,
	} = req.query;
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
	if (receiptType) {
		payload.receiptType = receiptType;
	}
	const feeReceipts = await FeeReceipt.aggregate([
		{
			$facet: {
				data: [
					{
						$match: payload,
					},
					{
						$sort: {
							createdAt: -1,
						},
					},
					{
						$skip: page * limit,
					},
					{
						$limit: limit,
					},
					{
						$unwind: {
							path: '$items',
							preserveNullAndEmptyArrays: true,
						},
					},
					{
						$lookup: {
							from: 'feetypes',
							let: {
								feeTypeId: '$items.feeTypeId',
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$eq: ['$_id', '$$feeTypeId'],
										},
									},
								},
								{
									$project: {
										_id: 1,
										feeType: 1,
									},
								},
							],
							as: 'items.feeTypeId',
						},
					},
					{
						$group: {
							_id: '$_id',
							items: {
								$push: {
									feeTypeId: {
										$first: '$items.feeTypeId',
									},
									installmentId: '$items.installmentId',
									netAmount: '$items.netAmount',
									paidAmount: '$items.paidAmount',
								},
							},
							root: { $first: '$$ROOT' },
						},
					},
					{
						$replaceRoot: {
							newRoot: {
								$mergeObjects: ['$root', { items: '$items' }],
							},
						},
					},
					{
						$sort: {
							createdAt: -1,
						},
					},
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

const receiptByStudentId = catchAsync(async (req, res, next) => {
	const { school_id } = req.user;
	const {
		date,
		status,
		paymentMethod,
		categoryId,
		studentId = null,
		username,
		sectionId,
		isPrev = false,
	} = req.body;

	if (!studentId && !username) {
		return next(new ErrorResponse('Please Provide All Fields', 422));
	}

	const { _id: academicYearId } = await AcademicYear.findOne({
		isActive: true,
		schoolId: school_id,
	});

	const payload = {
		'academicYear.academicYearId': mongoose.Types.ObjectId(academicYearId),
	};

	if (studentId) {
		payload['student.studentId'] = mongoose.Types.ObjectId(studentId);
	} else {
		payload['student.username'] = username;
		payload['student.section.sectionId'] = mongoose.Types.ObjectId(sectionId);
	}

	if (isPrev && isPrev === 'true') {
		payload.receiptType = 'PREVIOUS';
	}
	if (date) {
		payload.issueDate = {
			$gte: moment(date, 'DD/MM/YYYY').startOf('day').toDate(),
			$lte: moment(date, 'DD/MM/YYYY').endOf('day').toDate(),
		};
	}
	if (status) payload.status = status;
	if (paymentMethod) payload['payment.method'] = paymentMethod;
	if (categoryId)
		payload['category.feeCategoryId'] = mongoose.Types.ObjectId(categoryId);

	const projection = {
		amount: '$paidAmount',
		receiptId: 1,
		comment: 1,
		issueDate: 1,
		paymentMode: '$payment.method',
		status: 1,
		reasons: 1,
		reason: {
			$let: {
				vars: {
					items: {
						$filter: {
							input: '$reasons',
							as: 'item',
							cond: {
								$eq: ['$$item.status', '$status'],
							},
						},
					},
				},
				in: {
					$last: '$$items.reason',
				},
			},
		},
	};

	const feeReceipts = await FeeReceipt.find(payload, projection)
		.sort({ createdAt: -1 })
		.lean();
	if (feeReceipts.length === 0) {
		return next(new ErrorResponse('No Fee Receipts Found', 404));
	}
	res
		.status(200)
		.json(
			SuccessResponse(feeReceipts, feeReceipts.length, 'Fetched Successfully')
		);
});

const getFeeReceiptSummary = catchAsync(async (req, res, next) => {
	let {
		schoolId,
		sectionId,
		paymentMode,
		receiptType,
		status,
		date, // single day
		startDate, // range
		endDate, // range
		page = 0,
		limit = 5,
		search,
	} = req.query;
	page = +page;
	limit = +limit;
	const payload = { status: { $ne: 'CANCELLED' } };
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
	if (sectionId) {
		payload['student.section.sectionId'] = mongoose.Types.ObjectId(sectionId);
	}
	if (paymentMode) {
		payload['payment.method'] = paymentMode;
	}
	if (receiptType) {
		payload.receiptType = receiptType;
	}
	if (status) payload.status = status;
	if (date) {
		const fromDate = moment(date, 'DD/MM/YYYY').startOf('day').toDate();
		const tillDate = moment(date, 'DD/MM/YYYY').endOf('day').toDate();
		payload.issueDate = { $gte: fromDate, $lte: tillDate };
	}
	if (startDate && endDate) {
		payload.issueDate = {
			$gte: moment(startDate, 'DD/MM/YYYY').startOf('day').toDate(),
			$lte: moment(endDate, 'DD/MM/YYYY').endOf('day').toDate(),
		};
	}

	if (search) {
		payload.$or = [
			{ 'student.name': { $regex: `${search}`, $options: 'i' } },
			{ receiptId: { $regex: `${search}`, $options: 'i' } },
		];
		// payload.$text = { $search: search };
	}

	const feeReceipts = await FeeReceipt.aggregate([
		{
			$facet: {
				data: [
					{
						$match: payload,
					},
					{
						$sort: {
							createdAt: -1,
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
							from: 'students',
							let: {
								studId: '$student.studentId',
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$eq: ['$_id', '$$studId'],
										},
									},
								},
								{
									$project: {
										admission_no: 1,
									},
								},
							],
							as: 'admission',
						},
					},
					{
						$project: {
							name: '$student.name',
							admission_no: {
								$first: '$admission.admission_no',
							},
							className: {
								$concat: [
									'$student.class.name',
									' - ',
									'$student.section.name',
								],
							},
							parentName: '$parent.name',
							amount: '$paidAmount',
							items: 1,
							receiptId: 1,
							comment: 1,
							issueDate: 1,
							paymentMode: '$payment.method',
							reason: {
								$let: {
									vars: {
										items: {
											$filter: {
												input: '$reasons',
												as: 'item',
												cond: {
													$eq: ['$$item.status', '$status'],
												},
											},
										},
									},
									in: {
										$last: '$$items.reason',
									},
								},
							},
							status: 1,
						},
					},
					{
						$unwind: {
							path: '$items',
							preserveNullAndEmptyArrays: true,
						},
					},
					{
						$lookup: {
							from: 'feetypes',
							let: {
								feeTypeId: '$items.feeTypeId',
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$eq: ['$_id', '$$feeTypeId'],
										},
									},
								},
								{
									$project: {
										_id: 1,
										feeType: 1,
									},
								},
							],
							as: 'items.feeTypeId',
						},
					},
					{
						$group: {
							_id: '$_id',
							items: {
								$addToSet: {
									$first: '$items.feeTypeId.feeType',
								},
							},
							root: {
								$first: '$$ROOT',
							},
						},
					},
					{
						$replaceRoot: {
							newRoot: {
								$mergeObjects: [
									'$root',
									{
										items: '$items',
									},
								],
							},
						},
					},
					{
						$sort: {
							createdAt: -1,
						},
					},
				],
				filterSummary: [
					{
						$match: payload,
					},
					{
						$group: {
							_id: null,
							totalAmount: {
								$sum: '$paidAmount',
							},
						},
					},
				],
				count: [{ $match: payload }, { $count: 'count' }],
			},
		},
	]);
	const { data, count, filterSummary } = feeReceipts[0];

	if (count.length === 0) {
		return next(new ErrorResponse('No Fee Receipts Found', 404));
	}
	res
		.status(200)
		.json(
			SuccessResponse(
				{ data, totalAmount: filterSummary[0].totalAmount },
				count[0].count,
				'Fetched Successfully'
			)
		);
});

const createReceipt = async (req, res, next) => {
	const {
		receiptType,
		studentId,
		totalFeeAmount,
		paymentMethod,
		comment,
		bankName,
		chequeDate,
		chequeNumber,
		transactionDate,
		transactionId,
		upiId,
		payerName,
		ddNumber,
		ddDate,
		issueDate = new Date(),
		feeTypeId,
	} = req.body;

	if (!studentId || !totalFeeAmount || !paymentMethod || !feeTypeId) {
		return next(new ErrorResponse('All Fields Are Mandatory', 422));
	}

	// find fee type by id
	const foundFeeType = await FeeType.findOne(
		{ _id: feeTypeId },
		{ feeType: 1 }
	).lean();

	const foundStudent = await Student.aggregate([
		{
			$match: {
				_id: mongoose.Types.ObjectId(studentId),
			},
		},
		{
			$lookup: {
				from: 'schools',
				let: {
					schoolId: '$school_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$schoolId'],
							},
						},
					},
					{
						$project: {
							name: '$schoolName',
							address: {
								$concat: [
									'$address',
									' ',
									{
										$toString: '$pincode',
									},
								],
							},
						},
					},
				],
				as: 'school',
			},
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					sectionId: '$section',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$sectionId'],
							},
						},
					},
					{
						$project: {
							className: 1,
							name: 1,
						},
					},
				],
				as: 'section',
			},
		},
		{
			$lookup: {
				from: 'parents',
				let: {
					parentId: '$parent_id',
					studname: '$name',
					username: '$username',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$parentId'],
							},
						},
					},
					{
						$project: {
							name: {
								$ifNull: [
									'$name',
									{
										$concat: ['$$studname', ' (Parent)'],
									},
								],
							},
							username: {
								$ifNull: [
									'$username',
									{
										$concat: ['$$username', ''],
									},
								],
							},
						},
					},
				],
				as: 'parent',
			},
		},
		{
			$lookup: {
				from: 'academicyears',
				let: {
					schoolId: '$school_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$schoolId', '$$schoolId'],
									},
									{
										$eq: ['$isActive', true],
									},
								],
							},
						},
					},
					{
						$project: {
							name: 1,
						},
					},
				],
				as: 'academicYear',
			},
		},
		{
			$project: {
				studentId: '$_id',
				username: 1,
				studentName: '$name',
				classId: '$class',
				admission_no: 1,
				className: {
					$first: '$section.className',
				},
				section: {
					$first: '$section',
				},
				schoolId: '$school_id',
				schoolName: {
					$first: '$school.name',
				},
				schoolAddress: {
					$first: '$school.address',
				},
				parentName: {
					$first: '$parent.name',
				},
				parentId: '$parent_id',
				parentMobile: {
					$first: '$parent.username',
				},
				academicYear: {
					$first: '$academicYear.name',
				},
				academicYearId: {
					$first: '$academicYear._id',
				},
			},
		},
	]).toArray();

	const {
		studentName = '',
		username = '',
		className = '',
		classId = '',
		section = '',
		parentName,
		admission_no = '',
		parentMobile,
		parentId,
		academicYear = '',
		academicYearId = '',
		schoolName = '',
		schoolAddress = '',
		schoolId = '',
	} = foundStudent[0];

	const className1 = className ? className.split('-')[0].trim() : '';

	const currentDate = moment();
	const date = currentDate.format('DDMMYY');

	let newCount = '00001';
	const lastReceipt = await FeeReceipt.findOne({
		'school.schoolId': schoolId,
	})
		.sort({ createdAt: -1 })
		.lean();

	if (lastReceipt) {
		if (lastReceipt.receiptId) {
			newCount = lastReceipt.receiptId
				.slice(-5)
				.replace(/\d+/, n => String(Number(n) + 1).padStart(n.length, '0'));
		}
	}
	const receiptId = `MI${date}${newCount}`; // MI21092100001

	const items = [
		{
			feeTypeId,
			netAmount: totalFeeAmount,
			paidAmount: totalFeeAmount,
		},
	];

	const createdReceipt = await FeeReceipt.create({
		student: {
			name: studentName,
			studentId,
			admission_no,
			class: {
				name: className1,
				classId,
			},
			section: {
				name: section.name,
				sectionId: section._id,
			},
		},
		comment,
		receiptType,
		receiptId,
		parent: {
			name: parentName ?? `${studentName} (Parent)`,
			mobile: parentMobile ?? username,
			parentId,
		},
		academicYear: {
			name: academicYear,
			academicYearId,
		},
		school: {
			name: schoolName,
			address: schoolAddress,
			schoolId,
		},
		paidAmount: totalFeeAmount,
		totalAmount: totalFeeAmount,
		dueAmount: 0,
		payment: {
			method: paymentMethod,
			bankName,
			chequeDate,
			chequeNumber,
			transactionDate,
			transactionId,
			upiId,
			payerName,
			ddNumber,
			ddDate,
		},
		issueDate,
		items,
	});

	res.status(201).json(
		SuccessResponse(
			{
				...JSON.parse(JSON.stringify(createdReceipt)),
				items: [
					{
						...items[0],
						feeTypeId: foundFeeType,
					},
				],
			},
			1,
			'Created Successfully'
		)
	);
};

const getFeeReceiptById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const feeReceipt = await FeeReceipt.findById(id).lean();
	const feeIds = feeReceipt.items.map(item => item.feeTypeId);
	const feetype = await FeeType.find(
		{ _id: { $in: feeIds } },
		{ feeType: 1 }
	).lean();
	const feeTypeMap = feetype.reduce((acc, curr) => {
		acc[curr._id] = curr;
		return acc;
	}, {});

	const data = {
		...JSON.parse(JSON.stringify(feeReceipt)),
		items: feeReceipt.items.map(item => ({
			...item,
			feeTypeId: feeTypeMap[item.feeTypeId],
		})),
	};
	if (!feeReceipt) {
		return next(new ErrorResponse('Fee Receipt Not Found', 404));
	}

	res.status(200).json(SuccessResponse(data, 1, 'Fetched Successfully'));
});

const getExcel = catchAsync(async (req, res, next) => {
	// Name	Class	Amount	Description	Receipt ID	Date	Payment Mode
	const { schoolId, sectionId, paymentMode, startDate, endDate } = req.query;
	const payload = {
		status: { $ne: 'CANCELLED' },
	};
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
	if (sectionId) {
		payload['student.section.sectionId'] = mongoose.Types.ObjectId(sectionId);
	}
	if (paymentMode) {
		payload['payment.method'] = paymentMode;
	}
	if (startDate && endDate) {
		payload.issueDate = {
			$gte: moment(startDate, 'DD/MM/YYYY').startOf('day').toDate(),
			$lte: moment(endDate, 'DD/MM/YYYY').endOf('day').toDate(),
		};
	}
	const methodMap = new Map();

	const receiptDetails = await FeeReceipt.aggregate([
		{
			$match: payload,
		},
		{
			$unwind: {
				path: '$items',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$set: {
				insId: {
					$ifNull: ['$items.installmentId', []],
				},
			},
		},
		{
			$lookup: {
				from: 'feeinstallments',
				let: {
					insId: '$insId',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$_id', '$$insId'],
									},
									{
										$eq: ['$deleted', false],
									},
								],
							},
						},
					},
					{
						$project: {
							month: {
								$month: '$date',
							},
						},
					},
				],
				as: 'insResult',
			},
		},
		{
			$unwind: {
				path: '$insResult',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$addFields: {
				month: {
					$let: {
						vars: {
							monthsInString: [
								'Jan',
								'Feb',
								'Mar',
								'Apr',
								'May',
								'Jun',
								'Jul',
								'Aug',
								'Sep',
								'Oct',
								'Nov',
								'Dec',
							],
						},
						in: {
							$arrayElemAt: [
								'$$monthsInString',
								{
									$subtract: ['$insResult.month', 1],
								},
							],
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'feetypes',
				localField: 'items.feeTypeId',
				foreignField: '_id',
				as: 'feetypes',
			},
		},
		{
			$group: {
				_id: '$_id',
				student: {
					$first: '$student.name',
				},
				class: {
					$first: '$student.class.name',
				},
				section: {
					$first: '$student.section.name',
				},
				amount: {
					$first: '$paidAmount',
				},
				items: {
					$push: {
						feeType: {
							$ifNull: [
								{
									$concat: [
										{
											$first: '$feetypes.feeType',
										},
										' - ',
										'$month',
									],
								},
								{
									$first: '$feetypes.feeType',
								},
							],
						},
						amount: '$items.paidAmount',
					},
				},
				receiptId: {
					$first: '$receiptId',
				},
				issueDate: {
					$first: '$issueDate',
				},
				method: {
					$first: '$payment.method',
				},
			},
		},
		{
			$sort: {
				issueDate: 1,
			},
		},
	]);

	if (!receiptDetails.length)
		return next(new ErrorResponse('No Receipts Found', 404));

	const commonBorderStyle = {
		style: 'thin',
		color: '#000000',
	};

	const workbook = new excel.Workbook();
	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Income Details');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '₹#,##0.00; ($#,##0.00); -',
	});

	const mergedCellCenter = {
		alignment: {
			vertical: 'center',
		},
	};
	worksheet.cell(1, 1).string('Name').style(style);
	worksheet.cell(1, 2).string('Class').style(style);
	worksheet.cell(1, 3).string('Receipt ID').style(style);
	worksheet.cell(1, 4).string('Date').style(style);
	worksheet.cell(1, 5).string('Description').style(style);
	worksheet.cell(1, 6).string('Amount').style(style);
	worksheet.cell(1, 7).string('Payment Mode').style(style);
	worksheet.cell(1, 8).string('Total Amount').style(style);

	let rowIndex = 2; // Start from row 2
	receiptDetails.forEach(receipt => {
		const {
			student,
			class: className,
			section,
			amount,
			items,
			receiptId,
			issueDate,
			method,
		} = receipt;

		const itemCount = items.length;
		const rowStart = rowIndex;
		const rowEnd = rowIndex + itemCount - 1;

		worksheet
			.cell(rowStart, 1, rowEnd, 1, true)
			.string(student)
			.style(mergedCellCenter);
		worksheet
			.cell(rowStart, 2, rowEnd, 2, true)
			.string(`${className} - ${section}`)
			.style(mergedCellCenter);

		worksheet
			.cell(rowStart, 3, rowEnd, 3, true)
			.string(receiptId)
			.style(mergedCellCenter);

		worksheet
			.cell(rowStart, 4, rowEnd, 4, true)
			.string(moment(issueDate).format('DD/MM/YYYY'))
			.style(mergedCellCenter);

		items.forEach((item, itemIndex) => {
			const { feeType, amount: itemAmount } = item;
			const row = rowStart + itemIndex;
			worksheet.cell(row, 5).string(feeType);
			worksheet.cell(row, 6).number(itemAmount);
		});

		worksheet
			.cell(rowStart, 7, rowEnd, 7, true)
			.string(method)
			.style(mergedCellCenter);
		worksheet
			.cell(rowStart, 8, rowEnd, 8, true)
			.number(amount)
			.style(mergedCellCenter);

		methodMap.set(method, (methodMap.get(method) || 0) + amount);

		rowIndex = rowEnd + 1; // Move the rowIndex to the next available row for the next receipt
	});

	// add total row
	let totalRow = rowIndex + 1;
	const mapRow = totalRow;
	methodMap.forEach((value, key) => {
		worksheet.cell(totalRow, 7).string(key).style(style);
		worksheet.cell(totalRow, 8).number(value).style(style);
		totalRow += 1;
	});

	// Grant Total
	worksheet.cell(totalRow, 7).string('Grant Total').style(style);
	worksheet
		.cell(totalRow, 8)
		.formula(`SUM(H${mapRow}:H${totalRow - 1})`)
		.style(style);

	worksheet.cell(1, 1, totalRow, 8).style({
		border: {
			left: commonBorderStyle,
			right: commonBorderStyle,
			top: commonBorderStyle,
			bottom: commonBorderStyle,
		},
	});

	// workbook.write('income.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res
		.status(200)
		.json(SuccessResponse(data, receiptDetails.length, 'Fetched Successfully'));
});

const getDashboardData = catchAsync(async (req, res, next) => {
	// get expense dashboard data

	const resObj = {};
	const { school_id } = req.user;
	const { dateRange = null, startDate = null, endDate = null } = req.query;
	let dateObj = null;

	// get Student data total students, boys and girls count
	const studentData = await Student.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(school_id),
				deleted: false,
				profileStatus: 'APPROVED',
			},
		},
		{
			$group: {
				_id: '$school_id',
				totalCount: {
					$sum: 1,
				},
				boysCount: {
					$sum: {
						$cond: [
							{
								$in: ['$gender', ['Male', 'M', 'MALE']],
							},
							1,
							0,
						],
					},
				},
				girlsCount: {
					$sum: {
						$cond: [
							{
								$in: ['$gender', ['Female', 'F', 'FEMALE']],
							},
							1,
							0,
						],
					},
				},
			},
		},
	]).toArray();

	// eslint-disable-next-line prefer-destructuring
	resObj.totalStudents = studentData[0];

	/// ///////////////////////////////////////////////////////

	const totalIncomeAggregation = [
		{
			$match: {
				'school.schoolId': mongoose.Types.ObjectId(school_id),
				status: { $ne: 'CANCELLED' },
			},
		},
	];

	const totalExpenseAggregation = [
		{
			$match: {
				schoolId: mongoose.Types.ObjectId(school_id),
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

	const expenseAggregate = [
		{
			$facet: {
				totalExpense: [
					{
						$match: {
							schoolId: mongoose.Types.ObjectId(school_id),
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
				expenseTypeData: [
					{
						$match: {
							schoolId: mongoose.Types.ObjectId(school_id),
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
					// _id[0].name
					{
						$addFields: {
							_id: {
								$first: '$_id._id',
							},
							expenseTypeName: {
								$first: '$_id.name',
							},
						},
					},
				],
				totalExpenseCurrent: totalExpenseAggregation,
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

	switch (dateRange) {
		case 'daily':
			dateObj = {
				$gte: getStartDate(startDate, 'day'),
				$lte: getEndDate(endDate, 'day'),
			};
			totalIncomeAggregation.push({
				$group: {
					_id: null,
					totalAmount: {
						$sum: '$paidAmount',
					},
					// push only the issueDate and paidAmount
					incomeList: {
						$push: {
							issueDate: '$issueDate',
							paidAmount: '$paidAmount',
						},
					},
				},
			});
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
			totalIncomeAggregation.push(
				{
					$group: {
						_id: {
							$dateToString: {
								format: '%Y-%m-%d',
								date: '$issueDate',
							},
						},
						totalAmount: {
							$sum: '$paidAmount',
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
						totalAmount: {
							$sum: '$totalAmount',
						},
						incomeList: {
							$push: {
								issueDate: '$_id',
								paidAmount: '$totalAmount',
							},
						},
					},
				}
			);
			totalExpenseAggregation.push(...tempAggregation);
			break;

		case 'monthly':
			dateObj = {
				$gte: getStartDate(startDate, 'month'),
				$lte: getEndDate(endDate, 'month'),
			};
			totalIncomeAggregation.push(
				{
					$group: {
						_id: {
							$dateToString: {
								format: '%Y-%m-%d',
								date: '$issueDate',
							},
						},
						totalAmount: {
							$sum: '$paidAmount',
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
						totalAmount: {
							$sum: '$totalAmount',
						},
						incomeList: {
							$push: {
								issueDate: '$_id',
								paidAmount: '$totalAmount',
							},
						},
					},
				}
			);
			totalExpenseAggregation.push(...tempAggregation);
			break;

		default:
			dateObj = {
				$gte: getStartDate(startDate),
				$lte: getEndDate(endDate),
			};
			totalIncomeAggregation.push(
				{
					$group: {
						_id: {
							$dateToString: {
								format: '%Y-%m-%d',
								date: '$issueDate',
							},
						},
						totalAmount: {
							$sum: '$paidAmount',
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
						totalAmount: {
							$sum: '$totalAmount',
						},
						incomeList: {
							$push: {
								issueDate: '$_id',
								paidAmount: '$totalAmount',
							},
						},
					},
				}
			);
			totalExpenseAggregation.push(...tempAggregation);
			break;
	}

	// update the dateObj into aggregate
	totalIncomeAggregation[0].$match.issueDate = dateObj;
	totalExpenseAggregation[0].$match.expenseDate = dateObj;

	// get income dashboard Data
	// get payment method wise data
	// fee payment status data
	// totalIncome pipeline
	// totalCollected, miscCollected, totalIncomeCollected, paymentTypeData
	const incomeAggregate = [
		{
			$facet: {
				miscCollected: [
					{
						$match: {
							'school.schoolId': mongoose.Types.ObjectId(school_id),
							issueDate: dateObj,
							status: { $ne: 'CANCELLED' },
						},
					},
					{
						$unwind: {
							path: '$items',
							preserveNullAndEmptyArrays: true,
						},
					},
					{
						$group: {
							_id: '$items.feeTypeId',
							totalAmount: {
								$sum: '$items.paidAmount',
							},
						},
					},
					{
						$lookup: {
							from: 'feetypes',
							let: {
								feeTypeId: '$_id',
							},
							pipeline: [
								{
									$match: {
										$expr: {
											$eq: ['$_id', '$$feeTypeId'],
										},
									},
								},
								{
									$project: {
										feeType: 1,
									},
								},
							],
							as: '_id',
						},
					},
					{
						$addFields: {
							_id: {
								$first: '$_id.feeType',
							},
						},
					},
				],
				totalIncomeCollected: totalIncomeAggregation,
				// method method wise data

				paymentTypeData: [
					{
						$match: {
							'school.schoolId': mongoose.Types.ObjectId(school_id),
						},
					},
					{
						$group: {
							_id: '$payment.method',
							totalAmount: {
								$sum: '$paidAmount',
							},
						},
					},
				],
			},
		},
		{
			$project: {
				totalCollected: {
					$first: '$totalCollected',
				},
				miscCollected: '$miscCollected',

				totalIncomeCollected: {
					$first: '$totalIncomeCollected',
				},
				paymentTypeData: '$paymentTypeData',
			},
		},
	];
	const [incomeData] = await FeeReceipt.aggregate(incomeAggregate);

	const { miscCollected, totalIncomeCollected, paymentTypeData } = incomeData;

	resObj.paymentMethods = paymentTypeData;
	resObj.financialFlows = { income: miscCollected };

	/// ////////////////////////////////////////////////////////////////////

	// EXPENSE DATA
	const [expenseData] = await Expense.aggregate(expenseAggregate);

	const { totalExpense, totalExpenseCurrent, expenseTypeData } = expenseData;
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
	resObj.expenseData = {
		totalExpense: totalExpenseData,
		totalExpenseCurrent: totalExpenseCurrent[0] ?? {
			totalExpAmount: 0,
			expenseList: [],
		},
	};
	resObj.financialFlows.expense = expenseTypeData;

	/// ////////////////////////////////////////////////////////////////////

	const discountCategories = await DiscountCategory.find({
		schoolId: mongoose.Types.ObjectId(school_id),
		totalStudents: {
			$gt: 0,
		},
	}).lean();

	// calculate the total discount amount
	const totalDiscountAmount = discountCategories.reduce(
		(acc, curr) => acc + (curr.totalBudget - curr.budgetRemaining),
		0
	);

	// DISCOUNT DATA
	const [discountReport] = await FeeInstallment.aggregate([
		{
			$match: {
				schoolId: mongoose.Types.ObjectId(school_id),
				totalDiscountAmount: {
					$gt: 0,
				},
			},
		},
		{
			$group: {
				_id: '$sectionId',
				totalDiscountAmount: {
					$sum: '$totalDiscountAmount',
				},
			},
		},
		{
			$sort: {
				totalDiscountAmount: -1,
			},
		},
		{
			$group: {
				_id: null,
				maxClass: {
					$first: {
						sectionId: '$_id',
						totalDiscountAmount: '$totalDiscountAmount',
					},
				},
				minClass: {
					$last: {
						sectionId: '$_id',
						totalDiscountAmount: '$totalDiscountAmount',
					},
				},
			},
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					maxId: '$maxClass.sectionId',
					minId: '$minClass.sectionId',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$in: ['$_id', ['$$maxId', '$$minId']],
							},
						},
					},
					{
						$project: {
							className: 1,
						},
					},
				],
				as: 'sections',
			},
		},
		{
			$project: {
				maxClass: {
					sectionId: {
						$first: '$sections',
					},
					amount: '$maxClass.totalDiscountAmount',
				},
				minClass: {
					sectionId: {
						$last: '$sections',
					},
					amount: '$minClass.totalDiscountAmount',
				},
			},
		},
	]);

	// eslint-disable-next-line prefer-destructuring
	resObj.totalDiscounts = discountReport
		? {
				...discountReport,
				totalApprovedAmount: totalDiscountAmount,
		  }
		: {
				totalApprovedAmount: 0,
				maxClass: {
					amount: 0,
					sectionId: null,
				},
				minClass: {
					amount: 0,
					sectionId: null,
				},
		  };

	const currentPaidAmount = totalIncomeCollected?.totalAmount || 0;

	resObj.incomeData = {
		amount: currentPaidAmount,
		incomeList: totalIncomeCollected?.incomeList || [],
	};

	res.status(200).json(SuccessResponse(resObj, 1, 'Fetched Successfully'));
});

const cancelReceipt = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const { reason = '', status, today = new Date() } = req.body;

	const reasonObj = { reason, status, today };
	const update = { $set: { status } };

	if (status !== 'CANCELLED') {
		update.$push = { reasons: reasonObj };
	}

	const updatedReceipt = await FeeReceipt.findOneAndUpdate(
		{ _id: id },
		update,
		{ new: true }
	);

	if (!updatedReceipt) {
		return next(new ErrorResponse('Receipt Not Found', 400));
	}

	const {
		receiptType,
		paidAmount: prevPaidAmount,
		student,
		isPreviousBalance,
		items,
	} = updatedReceipt;

	// Need to convert this into switch case

	let installmentIds;
	let installments;
	let PrevUpdate;

	let switchVar = null;

	if (status === 'CANCELLED') {
		if (receiptType !== 'PREVIOUS_BALANCE') {
			switchVar = isPreviousBalance ? 'COMBINED' : 'ACADEMIC';
		} else {
			switchVar = 'PREVIOUS_BALANCE';
		}
	}

	switch (switchVar) {
		case 'ACADEMIC':
			installmentIds = updatedReceipt.items.map(
				({ installmentId }) => installmentId
			);
			installments = await FeeInstallment.find({
				_id: { $in: installmentIds },
			});

			for (const installment of installments) {
				const { _id, date, paidAmount } = installment;
				const newPaidAmount =
					paidAmount -
					updatedReceipt.items.find(
						({ installmentId }) => installmentId.toString() === _id.toString()
					).paidAmount;
				const newStatus = moment(date).isAfter(moment()) ? 'Upcoming' : 'Due';
				const newUpdate = {
					$set: { status: newStatus, paidAmount: newPaidAmount },
				};

				if (newPaidAmount === 0) {
					newUpdate.$unset = { paidDate: null };
				}

				await FeeInstallment.findOneAndUpdate(
					{ _id, deleted: false },
					newUpdate
				);
			}
			break;

		case 'COMBINED':
			installmentIds = items.map(({ installmentId }) => installmentId);
			installments = await FeeInstallment.find({
				_id: { $in: installmentIds },
			}).lean();

			for (const installment of installments) {
				const { _id, date, paidAmount: insPaidAmount } = installment;
				const newPaidAmount =
					insPaidAmount -
					items.find(
						({ installmentId }) => installmentId.toString() === _id.toString()
					).paidAmount;
				const newStatus = moment(date).isAfter(moment()) ? 'Upcoming' : 'Due';
				const newUpdate = {
					$set: { status: newStatus, paidAmount: newPaidAmount },
				};

				if (newPaidAmount === 0) {
					newUpdate.$unset = { paidDate: null };
				}

				await FeeInstallment.findOneAndUpdate(
					{ _id, deleted: false },
					newUpdate
				);
			}
			// This is the previous balance object
			// eslint-disable-next-line no-case-declarations
			const { paidAmount: insPrevAmount } = items[0];
			PrevUpdate = {
				$inc: {
					paidAmount: -insPrevAmount,
					dueAmount: insPrevAmount,
				},
			};

			if (insPrevAmount) {
				PrevUpdate.$set = { status: 'Due' };
			}

			// Pre - Release run the migration script for existing data to add receiptIds
			await PreviousBalance.findOneAndUpdate(
				{
					studentId: student.studentId,
					receiptIds: id,
				},
				PrevUpdate
			);

			break;

		case 'PREVIOUS_BALANCE':
			PrevUpdate = {
				$inc: {
					paidAmount: -prevPaidAmount,
					dueAmount: prevPaidAmount,
				},
			};

			if (prevPaidAmount) {
				PrevUpdate.$set = { status: 'Due' };
			}

			// Pre - Release run the migration script for existing data
			await PreviousBalance.findOneAndUpdate(
				{
					studentId: student.studentId,
					receiptIds: id,
				},
				PrevUpdate
			);
			break;

		default:
			break;
	}

	res
		.status(200)
		.json(SuccessResponse(updatedReceipt, 1, 'Updated Successfully'));
});

module.exports = {
	getFeeReceipt,
	getFeeReceiptById,
	createReceipt,
	getFeeReceiptSummary,
	receiptByStudentId,
	getDashboardData,
	getExcel,
	cancelReceipt,
};
