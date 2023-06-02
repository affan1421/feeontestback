const mongoose = require('mongoose');
const moment = require('moment');
const excel = require('excel4node');
const FeeReceipt = require('../models/feeReceipt');
const FeeType = require('../models/feeType');
const SuccessResponse = require('../utils/successResponse');
const FeeInstallment = require('../models/feeInstallment');

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

const getFeeReceiptSummary = catchAsync(async (req, res, next) => {
	let {
		schoolId,
		sectionId,
		paymentMode,
		receiptType,
		page = 0,
		limit = 5,
		search,
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
	if (sectionId) {
		payload['student.section.sectionId'] = mongoose.Types.ObjectId(sectionId);
	}
	if (paymentMode) {
		payload['payment.method'] = paymentMode;
	}
	if (receiptType) {
		payload.receiptType = receiptType;
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
						$project: {
							name: '$student.name',
							className: {
								$concat: [
									'$student.class.name',
									' - ',
									'$student.section.name',
								],
							},
							amount: '$paidAmount',
							items: 1,
							receiptId: 1,
							issueDate: 1,
							paymentMode: '$payment.method',
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

const createReceipt = async (req, res, next) => {
	const {
		receiptType,
		studentId,
		totalFeeAmount,
		paymentMethod,
		comments,
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
			class: {
				name: className1,
				classId,
			},
			section: {
				name: section.name,
				sectionId: section._id,
			},
		},
		comments,
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
	const feeReceipt = await FeeReceipt.findById(id);
	const feeId = feeReceipt.items[0].feeTypeId;
	const feetype = await FeeType.findOne({ _id: feeId }, { feeType: 1 });

	feeReceipt.items[0].feeTypeId = feetype;

	if (!feeReceipt) {
		return next(new ErrorResponse('Fee Receipt Not Found', 404));
	}

	res.status(200).json(SuccessResponse(feeReceipt, 1, 'Fetched Successfully'));
});

const getExcel = catchAsync(async (req, res, next) => {
	// Name	Class	Amount	Description	Receipt ID	Date	Payment Mode
	const { schoolId, classId, paymentMode, receiptType } = req.query;
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
				description: {
					$addToSet: {
						$first: '$feetypes.feeType',
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
	]);
	const workbook = new excel.Workbook();
	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Income Details');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	worksheet.cell(1, 1).string('Name').style(style);
	worksheet.cell(1, 2).string('Class').style(style);
	worksheet.cell(1, 3).string('Amount').style(style);
	worksheet.cell(1, 4).string('Description').style(style);
	worksheet.cell(1, 5).string('Receipt ID').style(style);
	worksheet.cell(1, 6).string('Date').style(style);
	worksheet.cell(1, 7).string('Payment Mode').style(style);

	receiptDetails.forEach((receipt, index) => {
		worksheet.cell(index + 2, 1).string(receipt.student);
		worksheet
			.cell(index + 2, 2)
			.string(`${receipt.class} - ${receipt.section}`);
		worksheet.cell(index + 2, 3).number(receipt.amount);
		worksheet.cell(index + 2, 4).string(receipt.description.join(','));
		worksheet.cell(index + 2, 5).string(receipt.receiptId);
		// 20-05-2023
		worksheet
			.cell(index + 2, 6)
			.string(moment(receipt.issueDate).format('DD-MM-YYYY'));
		worksheet.cell(index + 2, 7).string(receipt.method);
	});

	workbook.write('income.xlsx');
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res
		.status(200)
		.json(SuccessResponse(data, receiptDetails.length, 'Fetched Successfully'));
});

const getDashboardData = catchAsync(async (req, res, next) => {
	// get Student data total students, boys and girls count
	// get income dashboard Data
	// get expense dashboard data
	// get payment method wise data
	// fee payment status data
	const { school_id } = req.user;
	const studentData = await Student.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(school_id),
			},
		},
		{
			$group: {
				_id: '$school_id',
				totalStudents: {
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
	]);

	const incomeData = await FeeReceipt.aggregate([
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
	]);

	const feePerformance = await FeeInstallment.aggregate([
		{
			$match: {
				schoolId: mongoose.Types.ObjectId(school_id),
			},
		},
		{
			$group: {
				_id: '$schoolId',
				paidCount: {
					$sum: {
						$cond: [
							{
								$eq: ['$status', 'Paid'],
							},
							1,
							0,
						],
					},
				},
				lateCount: {
					$sum: {
						$cond: [
							{
								$eq: ['$status', 'Late'],
							},
							1,
							0,
						],
					},
				},
				dueCount: {
					$sum: {
						$cond: [
							{
								$eq: ['$status', 'Due'],
							},
							1,
							0,
						],
					},
				},
				upcomingCount: {
					$sum: {
						$cond: [
							{
								$eq: ['$status', 'Upcoming'],
							},
							1,
							0,
						],
					},
				},
			},
		},
	]);
});

module.exports = {
	getFeeReceipt,
	getFeeReceiptById,
	createReceipt,
	getFeeReceiptSummary,
	getDashboardData,
	getExcel,
};
