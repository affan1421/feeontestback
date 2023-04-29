const mongoose = require('mongoose');
const FeeInstallment = require('../models/feeInstallment');
const FeeStructure = require('../models/feeStructure');

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
						$lookup: {
							let: {
								classId: '$class_id',
							},
							from: 'classes',
							as: 'class',
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
										_id: 1,
										name: 1,
									},
								},
							],
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							class: {
								$first: '$class',
							},
						},
					},
					{
						$project: {
							name: {
								$concat: ['$class.name', ' ', '$name'],
							},
							sectionId: '$_id',
							sectionName: '$name',
							classId: '$class._id',
							className: '$class.name',
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
