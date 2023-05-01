const mongoose = require('mongoose');
const FeeInstallment = require('../models/feeInstallment');
const FeeStructure = require('../models/feeStructure');
const FeeReciept = require('../models/feeReciept.js');

const Student = mongoose.connection.db.collection('students');

const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

exports.GetTransactions = catchAsync(async (req, res, next) => {
	const {
		pageNum = 1,
		limit = 10,
		schoolId = null,
		status = 'Paid',
	} = req.query;

	if (limit > 50) {
		return next(new ErrorResponse('Page limit should not excede 50', 400));
	}

	const matchQuery = {};

	if (schoolId) {
		matchQuery.schoolId = schoolId;
	}
	if (status) {
		matchQuery.status = status;
	}

	const foundTransactions = await FeeInstallment.aggregate([
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
				paidDate: -1,
			},
		},
		{
			$lookup: {
				from: 'students',
				let: { studentId: '$studentId' },
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
				date: 1,
				paidDate: 1,
				totalAmount: 1,
				netAmount: 1,
				status: 1,
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
	const { pageNum = 1, limit = 10, schoolId = null, search = null } = req.query;

	if (limit > 50) {
		return next(new ErrorResponse('Page limit should not excede 50', 400));
	}

	const matchQuery = {};

	if (schoolId) {
		matchQuery.school_id = mongoose.Types.ObjectId(schoolId);
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
	} = req.body;

	const items = [];

	for (const item of feeDetails) {
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

	const createdReciept = await FeeReciept.create({
		student: {
			name: studentName,
			studentId,
			class: {
				name: className,
				classId,
			},
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
		paidAmount: collectedFee,
		totalAmount: totalFeeAmount,
		dueAmount,
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
				...JSON.parse(JSON.stringify(createdReciept)),
				items: feeDetails,
			},
			1
		)
	);
});
