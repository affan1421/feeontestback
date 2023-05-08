const mongoose = require('mongoose');
const moment = require('moment');

const XLSX = require('xlsx');
const FeeInstallment = require('../models/feeInstallment');

const FeeStructure = require('../models/feeStructure');
const FeeReceipt = require('../models/feeReceipt.js');
const AcademicYear = require('../models/academicYear');

const Student = mongoose.connection.db.collection('students');

const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

exports.GetTransactions = catchAsync(async (req, res, next) => {
	const {
		pageNum = 1,
		limit = 10,
		schoolId = null,
		sectionId = null,
		receiptType = null,
	} = req.query;

	if (limit > 50) {
		return next(new ErrorResponse('Page limit should not excede 50', 400));
	}

	if (!schoolId) {
		return next(new ErrorResponse('Schoolid is required', 400));
	}

	const matchQuery = {};

	if (schoolId) {
		matchQuery['school.schoolId'] = mongoose.Types.ObjectId(schoolId);
	}

	if (sectionId) {
		matchQuery['student.section.sectionId'] =
			mongoose.Types.ObjectId(sectionId);
	}

	if (receiptType) {
		matchQuery.receiptType = receiptType;
	}

	const foundAcademicYear = await AcademicYear.findOne({
		isActive: true,
		schoolId,
	})
		.select('_id')
		.lean();

	if (foundAcademicYear) {
		matchQuery['academicYear.academicYearId'] = foundAcademicYear._id;
	}

	const foundTransactions = await FeeReceipt.aggregate([
		{
			$match: matchQuery,
		},
		{
			$skip: limit * pageNum - limit,
		},
		{
			$limit: parseInt(limit),
		},
		{
			$sort: {
				createdAt: -1,
			},
		},
		{
			$lookup: {
				from: 'students',
				let: { studentId: '$student.studentId' },
				as: 'studentId',
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$studentId'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							profile_image: 1,
						},
					},
				],
			},
		},
		{
			$project: {
				_id: 1,
				studentId: {
					$first: '$studentId',
				},
				paidAmount: 1,
				dueAmount: 1,
				totalAmount: 1,
				date: '$createdAt',
			},
		},
	]);

	return res
		.status(200)
		.json(SuccessResponse(foundTransactions, foundTransactions.length));
});

exports.SectionWiseTransaction = catchAsync(async (req, res, next) => {
	const { schoolId, status = 'Paid' } = req.query;

	const matchObj = {
		status,
	};

	if (schoolId) {
		matchObj.schoolId = mongoose.Types.ObjectId(schoolId);
	}

	const foundTransactions = await FeeInstallment.aggregate([
		{
			$match: matchObj,
		},
		{
			$group: {
				_id: '$sectionId',
				totalAmount: {
					$sum: '$totalAmount',
				},
				netAmount: {
					$sum: '$netAmount',
				},
			},
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					sectionId: '$_id',
				},
				as: 'sec',
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
							name: '$className',
							sectionId: '$_id',
							sectionName: '$name',
							classId: '$class_id',
							className: 1,
						},
					},
				],
			},
		},
		{
			$project: {
				totalAmount: 1,
				classSec: {
					$first: '$sec',
				},
			},
		},
	]);

	matchObj.status = 'Due';
	const dueStudentCount = await FeeInstallment.countDocuments(matchObj);

	return res
		.status(200)
		.json(
			SuccessResponse(
				{ sections: foundTransactions, dueStudentCount },
				foundTransactions.length
			)
		);
});

exports.StudentsList = catchAsync(async (req, res, next) => {
	const {
		pageNum = 1,
		limit = 10,
		schoolId = null,
		classId = null,
		sectionId = null,
		search = null,
	} = req.query;

	if (limit > 50) {
		return next(new ErrorResponse('Page limit should not excede 50', 400));
	}

	const matchQuery = {
		deleted: false,
		profileStatus: 'APPROVED',
	};

	// let path = 'username';

	// if (Number.isNaN(+search)) {
	// 	path = 'name';
	// }

	// const queryObj = {
	// 	index: 'studentBasicInfo',
	// 	compound: {
	// 		must: [
	// 			{
	// 				autocomplete: {
	// 					query: search,
	// 					path,
	// 				},
	// 			},
	// 		],
	// 	},
	// 	count: {
	// 		type: 'total',
	// 	},
	// };
	// if (schoolId) {
	// 	queryObj.compound.filter = {
	// 		equals: {
	// 			path: 'school_id',
	// 			value: mongoose.Types.ObjectId(schoolId),
	// 		},
	// 	};
	// }

	if (schoolId) {
		matchQuery.school_id = mongoose.Types.ObjectId(schoolId);
	}
	if (classId) {
		matchQuery.class = mongoose.Types.ObjectId(classId);
	}
	if (sectionId) {
		matchQuery.section = mongoose.Types.ObjectId(sectionId);
	}
	if (search) {
		matchQuery.$text = { $search: search };
	}

	const totalStudents = await Student.countDocuments(matchQuery);
	const foundStudents = await Student.aggregate([
		{
			$match: matchQuery,
		},
		{
			$skip: limit * pageNum - limit,
		},
		{
			$limit: parseInt(limit),
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					sectionId: '$section',
				},
				as: 'className',
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
			},
		},
		{
			$lookup: {
				from: 'feeinstallments',
				let: {
					studentId: '$_id',
				},
				as: 'feeinstallments',
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$studentId', '$$studentId'],
							},
						},
					},
					{
						$group: {
							_id: null,
							paidAmount: {
								$sum: '$paidAmount',
							},
							netAmount: {
								$sum: '$netAmount',
							},
						},
					},
				],
			},
		},
		{
			$project: {
				_id: 1,
				name: 1,
				className: {
					$first: '$className.className',
				},
				pendingAmount: {
					$subtract: [
						{ $first: '$feeinstallments.netAmount' },
						{ $first: '$feeinstallments.paidAmount' },
					],
				},
			},
		},
	]).toArray();

	return res.status(200).json(SuccessResponse(foundStudents, totalStudents));
});

exports.getStudentFeeStructure = catchAsync(async (req, res, next) => {
	const { categoryId = null, studentId = null } = req.query;

	if (!categoryId || !studentId) {
		return next(new ErrorResponse('Categoryid & studentid is required', 400));
	}

	const foundStudent = await Student.aggregate([
		{
			$match: {
				_id: mongoose.Types.ObjectId(studentId),
				deleted: false,
				profileStatus: 'APPROVED',
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
						},
					},
				],
				as: 'parent',
			},
		},
		{
			$project: {
				studentName: '$name',
				parentName: {
					$first: '$parent.name',
				},
				class: {
					$first: '$section.className',
				},
			},
		},
	]).toArray();

	if (foundStudent.length < 1) {
		return next(new ErrorResponse('Student not found', 404));
	}

	const foundFeeInstallments = await FeeInstallment.find({
		categoryId,
		studentId,
	})
		.populate('feeTypeId', 'feeType')
		.select({
			feeTypeId: 1,
			rowId: 1,
			date: 1,
			paidDate: 1,
			paidAmount: 1,
			totalAmount: 1,
			totalDiscountAmount: 1,
			netAmount: 1,
			status: 1,
		})
		.lean();

	return res
		.status(200)
		.json(
			SuccessResponse(
				{ ...foundStudent[0], feeDetails: foundFeeInstallments },
				foundFeeInstallments.length
			)
		);
});

exports.MakePayment = catchAsync(async (req, res, next) => {
	const {
		feeDetails,
		studentId,
		collectedFee,
		totalFeeAmount,
		dueAmount,
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
		issueDate,
		feeCategoryName,
		feeCategoryId,
		receiptType,
	} = req.body;

	const foundStudent = await Student.aggregate([
		{
			$match: {
				_id: mongoose.Types.ObjectId(studentId),
				deleted: false,
				profileStatus: 'APPROVED',
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
				from: 'classes',
				let: {
					classId: '$class',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$classId'],
							},
						},
					},
					{
						$project: {
							name: 1,
						},
					},
				],
				as: 'class',
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
				classId: {
					$first: '$class._id',
				},
				className: {
					$first: '$class.name',
				},
				sectionId: {
					$first: '$section._id',
				},
				sectionName: {
					$first: '$section.name',
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
		classId = '',
		className = '',
		sectionId = '',
		sectionName = '',
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
	const shortCategory = feeCategoryName.slice(0, 2);

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
	const receiptId = `${shortCategory.toUpperCase()}${date}${newCount}`;

	const items = [];
	let currentPaidAmount = 0;

	for (const item of feeDetails) {
		currentPaidAmount += item.paidAmount;

		const foundInstallment = await FeeInstallment.findOne({
			_id: mongoose.Types.ObjectId(item._id),
		}).lean();

		const isPaid =
			foundInstallment.netAmount -
				(item.paidAmount + foundInstallment.paidAmount) ==
			0;

		const updateData = {
			paidDate: new Date(),
			paidAmount: item.paidAmount + foundInstallment.paidAmount,
		};

		if (isPaid) {
			updateData.status = foundInstallment.status == 'Due' ? 'Late' : 'Paid';
		}

		items.push({
			installmentId: item._id,
			feeTypeId: item.feeTypeId._id,
			netAmount: item.netAmount,
			paidAmount: item.paidAmount,
		});

		await FeeInstallment.updateOne(
			{ _id: item._id },
			{
				$set: updateData,
			}
		);
	}

	const createdReceipt = await FeeReceipt.create({
		student: {
			name: studentName,
			studentId,
			class: {
				name: className,
				classId,
			},
			section: {
				name: sectionName,
				sectionId,
			},
		},
		receiptType,
		receiptId,
		category: {
			name: feeCategoryName,
			feeCategoryId,
		},
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
		paidAmount: currentPaidAmount,
		totalAmount: totalFeeAmount,
		dueAmount: dueAmount - currentPaidAmount,
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

	return res.status(201).json(
		SuccessResponse(
			{
				...JSON.parse(JSON.stringify(createdReceipt)),
				items: feeDetails,
			},
			1
		)
	);
});

exports.IncomeDashboard = catchAsync(async (req, res, next) => {
	// Get the todays paid installments amount compared to previous date based on filters (daily, weekly, monthly or custom range)
	// Get total receivable, total Collected, total Pending.
	/*
	{
		totalReceivable: {
			amount: #######,
			maxClass: {
				name: 'Class Name',
				amount: #######,
			},
			minClass: {
				name: 'Class Name',
				amount: #######,
			}
		},
			totalCollected: {
			amount: #######,
			maxClass: {
				name: 'Class Name',
				amount: #######,
			},
			minClass: {
				name: 'Class Name',
				amount: #######,
			}
		},
			totalPending: {
			amount: #######,
			maxClass: {
				name: 'Class Name',
				amount: #######,
			},
			minClass: {
				name: 'Class Name',
				amount: #######,
			}
		}
	}
	*/
});

exports.AddPreviousFee = async (req, res, next) => {
	// accept file from request
	try {
		const { schoolId } = req.params;
		const { file } = req.files;
		const workbook = XLSX.read(file.data, { type: 'buffer' });
		const sheetName = workbook.SheetNames[0];
		const worksheet = workbook.Sheets[sheetName];

		const rows = XLSX.utils.sheet_to_json(worksheet);

		const newArray = rows.filter(r => r['BALANCE FEES'] > 0);

		const foundStructure = await FeeStructure.find({
			schoolId,
		});
		for (const fs of foundStructure) {
			const { _id } = fs.feeDetails[0];
			for (const stud of newArray) {
				const dueFees = stud['BALANCE FEES'];
				const foundInstallment = await FeeInstallment.findOne({
					rowId: mongoose.Types.ObjectId(_id),
					studentId: mongoose.Types.ObjectId(stud.STUDENTID),
				});
				if (foundInstallment) {
					await FeeInstallment.updateOne(
						{
							rowId: mongoose.Types.ObjectId(_id),
							studentId: mongoose.Types.ObjectId(stud.STUDENTID),
						},
						{
							$set: {
								totalAmount: dueFees,
								netAmount: dueFees,
							},
						}
					);
				}
			}
		}
		await FeeInstallment.updateMany(
			{
				totalAmount: 0,
				schoolId: mongoose.Types.ObjectId(schoolId),
			},
			{
				$set: {
					status: 'Paid',
				},
			}
		);
		res
			.status(200)
			.json(SuccessResponse(null, newArray.length, 'Updated Successfully'));
	} catch (error) {
		console.log(error.stack);
	}
};
