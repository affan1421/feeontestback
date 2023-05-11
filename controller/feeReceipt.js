const mongoose = require('mongoose');
const moment = require('moment');
const FeeReceipt = require('../models/feeReceipt');
const FeeType = require('../models/feeType');
const SuccessResponse = require('../utils/successResponse');

const Student = mongoose.connection.db.collection('students');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const AcademicYear = require('../models/academicYear');

// Filter BY 'student.class.classId' and 'payment.method
const getFeeReceipt = catchAsync(async (req, res, next) => {
	let { schoolId, classId, paymentMode, page = 0, limit = 5 } = req.query;
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
	const feeReceipts = await FeeReceipt.aggregate([
		{
			$facet: {
				data: [
					{ $match: payload },
					{ $sort: { createdAt: -1 } },
					{ $skip: page * limit },
					{ $limit: limit },
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
										feeType: 1,
									},
								},
							],
							as: 'items.feeTypeId',
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
		parentName,
		parentMobile,
		parentId,
		academicYear = '',
		academicYearId = '',
		schoolName = '',
		schoolAddress = '',
		schoolId = '',
	} = foundStudent[0];

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
				name: className,
				classId,
			},
		},
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

module.exports = {
	getFeeReceipt,
	getFeeReceiptById,
	createReceipt,
};
