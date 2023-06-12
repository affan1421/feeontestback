const mongoose = require('mongoose');
const moment = require('moment');
const excel = require('excel4node');
const FeeReceipt = require('../models/feeReceipt');
const FeeType = require('../models/feeType');
const SectionDiscount = require('../models/sectionDiscount');
const SuccessResponse = require('../utils/successResponse');
const FeeInstallment = require('../models/feeInstallment');
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
	const { studentId } = req.params;
	const { school_id } = req.user;
	const { date, status, paymentMethod, categoryId } = req.query;

	const { _id: academicYearId } = await AcademicYear.findOne({
		isActive: true,
		schoolId: school_id,
	});

	const payload = {
		'student.studentId': mongoose.Types.ObjectId(studentId),
		'academicYear.academicYearId': mongoose.Types.ObjectId(academicYearId),
	};

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
		issueDate: 1,
		paymentMode: '$payment.method',
		status: 1,
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
	if (status) payload.status = status;
	if (date) {
		const startDate = moment(date, 'DD/MM/YYYY').startOf('day').toDate();
		const endDate = moment(date, 'DD/MM/YYYY').endOf('day').toDate();
		payload.issueDate = { $gte: startDate, $lte: endDate };
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
							parentName: '$parent.name',
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

/*
export interface Dashboard {
    totalStudents: {
        boysCount: number
        girlsCount: number
    },
    incomeData: {
		totalIncome: number
        percentage: number
    },
    expenseData: {
		totalExpense: number
        percentage: number
    }
    totalDiscounts: {
        totalDiscount: number
        maxClass?: {
            amount: number;
            sectionId?: {
                className: string
                sectionName: string
                _id: string
            } 
        }
        minClass?: {
            amount: number;
            sectionId?: {
                className: string
                sectionName: string
                _id: string
            }
        }
    }
    totalReceivable: {
        totalReceivable: number
        maxClass?: {
            amount: number;
            sectionId?: {
                className: string
                sectionName: string
                _id: string
            }
        }
        minClass?: {
            amount: number;
            sectionId?: {
                className: string
                sectionName: string
                _id: string
            }
        }
    }
    feeCollection: {
        totalFeeCollection: number
        maxClass?: {
            amount: number;
            sectionId?: {
                className: string
                sectionName: string
                _id: string
            }
        }
        minClass?: {
            amount: number;
            sectionId?: {
                className: string
                sectionName: string
                _id: string
            }
        }
    }
    totalPending: {
        totalPending: number
        maxClass?: {
            amount: number;
            sectionId?: {
                className: string
                sectionName: string
                _id: string
            }
        }
        minClass?: {
            amount: number;
            sectionId?: {
                className: string
                sectionName: string
                _id: string
            }
        }
    }

    paymentMethods: {
        typeName: string
        items: item[]
    },

    studentPerformance: {
        percentage: number
        onTime: number
        late: number
        outstanding: number
        notPaid: number
    },
	

    financialFlows: {
        income: item[],
        expense: item[]
    }
}

interface item {
    amount: number,
    feeTypeId: {
        feeType: string
    },
}
*/
// ALL DATA IS FETCHED NEED TO REFACTOR AND RECONSTRUCT THE RESPONSE OBJECT
const getDashboardData = catchAsync(async (req, res, next) => {
	// get expense dashboard data

	const resObj = {};
	const { school_id } = req.user;
	const { dateRange = null, startDate = null, endDate = null } = req.query;
	let dateObj = null;

	// Section Data
	let sectionList = await Sections.find({
		school: mongoose.Types.ObjectId(school_id),
	})
		.project({ name: 1, className: 1 })
		.toArray();
	sectionList = sectionList.reduce((acc, curr) => {
		acc[curr._id] = curr;
		return acc;
	}, {});

	// get Student data total students, boys and girls count
	const studentData = await Student.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(school_id),
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
				totalCollected: [
					{
						$match: {
							'school.schoolId': mongoose.Types.ObjectId(school_id),
							receiptType: 'ACADEMIC',
							issueDate: dateObj,
						},
					},
					{
						$addFields: {
							section: '$student.section',
							class: '$student.class',
						},
					},
					{
						$group: {
							_id: '$section',
							class: {
								$first: '$class',
							},
							totalAmount: {
								$sum: '$paidAmount',
							},
						},
					},
					{
						$sort: {
							totalAmount: -1,
						},
					},
					{
						$group: {
							_id: null,
							totalAmount: {
								$sum: '$totalAmount',
							},
							maxClass: {
								$max: {
									amount: '$totalAmount',
									section: '$_id',
									class: '$class',
								},
							},
							minClass: {
								$min: {
									amount: '$totalAmount',
									section: '$_id',
									class: '$class',
								},
							},
						},
					},
					{
						$project: {
							totalAmount: 1,
							maxClass: {
								amount: 1,
								sectionId: {
									sectionName: '$maxClass.section.name',
									className: '$maxClass.class.name',
									_id: '$maxClass.section.sectionId',
								},
							},
							minClass: {
								amount: 1,
								sectionId: {
									sectionName: '$minClass.section.name',
									className: '$minClass.class.name',
									_id: '$minClass.section.sectionId',
								},
							},
						},
					},
				],
				miscCollected: [
					{
						$match: {
							'school.schoolId': mongoose.Types.ObjectId(school_id),
							receiptType: {
								$in: ['APPLICATION', 'MISCELLANEOUS'],
							},
							issueDate: dateObj,
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
								$sum: '$paidAmount',
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
				// totalIncomeCollected[0].totalAmount
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
	const incomeData = await FeeReceipt.aggregate(incomeAggregate);

	const {
		totalCollected,
		miscCollected,
		totalIncomeCollected,
		paymentTypeData,
	} = incomeData[0];

	resObj.paymentMethods = paymentTypeData;
	resObj.financialFlows = { income: miscCollected };

	/// ////////////////////////////////////////////////////////////////////

	// EXPENSE DATA
	const expenseData = await Expense.aggregate(expenseAggregate);

	let { totalExpense, totalExpenseCurrent, expenseTypeData } = expenseData[0];
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
	totalExpenseCurrent = totalExpenseCurrent[0]?.totalExpAmount || 0;
	resObj.expenseData = {
		totalExpense: totalExpenseData,
		totalExpenseCurrent: totalExpenseCurrent[0] ?? {
			totalExpAmount: 0,
			expenseList: [],
		},
	};
	resObj.financialFlows.expense = expenseTypeData;

	/// /////////////////////////////////////////////////////////////////

	// FeeInstallment Detailed Data
	// totalReceivable, totalPending, feePerformance
	const installmentAggregation = [
		{
			$facet: {
				totalReceivable: [
					{
						$match: {
							schoolId: mongoose.Types.ObjectId(school_id),
						},
					},
					{
						$group: {
							_id: '$sectionId',
							totalAmount: { $sum: '$netAmount' },
						},
					},
					{ $sort: { totalAmount: -1 } },
					{
						$group: {
							_id: null,
							totalAmount: { $sum: '$totalAmount' },
							maxClass: {
								$max: {
									amount: '$totalAmount',
									sectionId: '$_id',
								},
							},
							minClass: {
								$min: {
									amount: '$totalAmount',
									sectionId: '$_id',
								},
							},
						},
					},
				],
				totalPending: [
					{
						$match: {
							schoolId: mongoose.Types.ObjectId(school_id),
							status: {
								$in: ['Due', 'Upcoming'],
							},
							date: dateObj,
						},
					},
					{
						$group: {
							_id: '$sectionId',
							totalAmount: {
								$sum: '$netAmount',
							},
						},
					},
					{
						$sort: {
							totalAmount: -1,
						},
					},
					{
						$group: {
							_id: null,
							totalAmount: {
								$sum: '$totalAmount',
							},
							maxClass: {
								$max: {
									amount: '$totalAmount',
									sectionId: '$_id',
								},
							},
							minClass: {
								$min: {
									amount: '$totalAmount',
									sectionId: '$_id',
								},
							},
						},
					},
				],
				feePerformance: [
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
				],
			},
		},
		{
			$project: {
				totalReceivable: {
					$first: '$totalReceivable',
				},
				totalPending: {
					$first: '$totalPending',
				},
				feePerformance: {
					$first: '$feePerformance',
				},
			},
		},
	];

	// Fee performance Data
	const feesReport = await FeeInstallment.aggregate(installmentAggregation);
	const { totalReceivable, totalPending, feePerformance } = feesReport[0];

	resObj.studentPerformance = feePerformance;

	/// ////////////////////////////////////////////////////////////////////

	// DISCOUNT DATA
	const discountReport = await SectionDiscount.aggregate([
		{
			$match: {
				schoolId: mongoose.Types.ObjectId(school_id),
			},
		},
		{
			$addFields: {
				approvedAmount: {
					$multiply: ['$discountAmount', '$totalApproved'],
				},
			},
		},
		{
			$group: {
				_id: '$sectionId',
				approvedAmount: {
					$sum: '$approvedAmount',
				},
			},
		},
		{
			$lookup: {
				from: 'sections',
				localField: '_id',
				foreignField: '_id',
				as: '_id',
			},
		},
		{
			$sort: {
				approvedAmount: -1,
			},
		},
		{
			$group: {
				_id: null,
				totalApprovedAmount: {
					$sum: '$approvedAmount',
				},
				maxClass: {
					$first: '$$ROOT',
				},
				minClass: {
					$last: '$$ROOT',
				},
			},
		},
		{
			$project: {
				_id: 0,
				totalApprovedAmount: 1,
				maxClass: {
					amount: '$maxClass.approvedAmount',
					sectionId: {
						_id: {
							$first: '$maxClass._id._id',
						},
						sectionName: {
							$first: '$maxClass._id.name',
						},
						className: {
							$first: '$maxClass._id.className',
						},
					},
				},
				minClass: {
					amount: '$minClass.approvedAmount',
					sectionId: {
						_id: {
							$first: '$maxClass._id._id',
						},
						sectionName: {
							$first: '$maxClass._id.name',
						},
						className: {
							$first: '$maxClass._id.className',
						},
					},
				},
			},
		},
	]);

	// eslint-disable-next-line prefer-destructuring
	resObj.totalDiscounts = discountReport[0];

	/// /////////////////////////////////////////////////////////////////////

	const setDefaultValues = data => {
		const defaultData = {
			totalAmount: 0,
			maxClass: { amount: 0, sectionId: null },
			minClass: { amount: 0, sectionId: null },
		};
		return { ...defaultData, ...data };
	};

	const updateSectionInfo = (sectionObj, info) => {
		const section = sectionObj[info.sectionId];
		return section
			? {
					amount: info.amount,
					sectionId: {
						_id: section._id,
						sectionName: section.name,
						className: section.className,
					},
			  }
			: null;
	};

	const setDefaultValuesAndUpdateSectionInfo = (data, sectionObj) => {
		const defaultData = setDefaultValues(data);
		const maxClass = updateSectionInfo(sectionObj, defaultData.maxClass);
		const minClass = updateSectionInfo(sectionObj, defaultData.minClass);
		return {
			totalAmount: defaultData.totalAmount,
			maxClass: maxClass || defaultData.maxClass,
			minClass: minClass || defaultData.minClass,
		};
	};

	resObj.totalReceivable = setDefaultValuesAndUpdateSectionInfo(
		totalReceivable,
		sectionList
	);
	resObj.feeCollection = setDefaultValuesAndUpdateSectionInfo(
		totalCollected,
		sectionList
	);
	resObj.totalPending = setDefaultValuesAndUpdateSectionInfo(
		totalPending,
		sectionList
	);
	const currentPaidAmount = totalIncomeCollected.totalAmount || 0;

	resObj.incomeData = {
		amount: currentPaidAmount,
		incomeList: totalIncomeCollected?.incomeList || [],
	};

	res.status(200).json(SuccessResponse(resObj, 1, 'Fetched Successfully'));
});

const cancelReceipt = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const { reason = '', status, date = new Date() } = req.body;

	const reasonObj = { reason, status, date };
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
