const mongoose = require('mongoose');
const moment = require('moment');

const XLSX = require('xlsx');
const excel = require('excel4node');
const Donations = require('../models/donation');
const DonorModel = require('../models/donor');
const FeeInstallment = require('../models/feeInstallment');

const FeeType = require('../models/feeType');
const FeeStructure = require('../models/feeStructure');
const FeeReceipt = require('../models/feeReceipt.js');
const AcademicYear = require('../models/academicYear');

const Sections = mongoose.connection.db.collection('sections');
const School = mongoose.connection.db.collection('schools');
const Student = mongoose.connection.db.collection('students');

const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

exports.GetTransactions = catchAsync(async (req, res, next) => {
	let {
		page = 0,
		limit = 10,
		schoolId = null,
		sectionId = null,
		receiptType = 'ACADEMIC',
	} = req.query;

	if (limit > 50) {
		return next(new ErrorResponse('Page limit should not exceed 50', 400));
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
	page = +page;
	limit = +limit;

	const foundTransactions = await FeeReceipt.aggregate([
		{
			$match: matchQuery,
		},
		{
			$sort: {
				issueDate: -1,
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
				date: '$issueDate',
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

exports.update = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const { amount } = req.body;

	// update the installment
	const installment = await FeeInstallment.findOne({ _id: id });

	const { paidAmount, totalDiscountAmount } = installment;

	if (!installment) {
		return next(new ErrorResponse('Installment not found', 404));
	}

	const update = {
		$set: {
			totalAmount: amount,
			netAmount: amount - totalDiscountAmount,
		},
	};
	if (paidAmount && paidAmount > amount) {
		return next(
			new ErrorResponse('Paid Amount Is Greater Than Total Amount', 400)
		);
	}
	if (paidAmount > 0) {
		update.$set.status = 'Due';
	}

	const updatedInstallment = await FeeInstallment.updateOne(
		{ _id: id },
		update
	);

	if (updatedInstallment.nModified === 0) {
		return next(new ErrorResponse('Installment not updated', 400));
	}

	res
		.status(200)
		.json(SuccessResponse(updatedInstallment, 1, 'Updated Successfully'));
});

exports.StudentsList = catchAsync(async (req, res, next) => {
	const {
		page = 0,
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
			$skip: limit * page,
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
			$lookup: {
				from: 'parents',
				let: {
					parentId: '$parent_id',
				},
				as: 'parentId',
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
				className: {
					$first: '$className.className',
				},
				parentName: {
					$first: '$parentId.name',
				},
				pendingAmount: {
					$subtract: [
						{ $first: '$feeinstallments.netAmount' },
						{ $first: '$feeinstallments.paidAmount' },
					],
				},
				admission_no: 1,
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
				admission_no: 1,
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

exports.StudentFeeExcel = catchAsync(async (req, res, next) => {
	// StudentName	ParentName	PhoneNumber Class Section Total AmountTerm feeAmount AmountPaid TermBal LastYearBal

	const { schoolId } = req.params;
	const regex = /^.*new.*$/i;
	const studentList = [];
	let finalStudentMap = {};
	const feeStructureMap = {};

	const { _id: academicYearId } = await AcademicYear.findOne({
		isActive: true,
		schoolId,
	});

	// get schoolName
	const { schoolName } = await School.findOne(
		{
			_id: mongoose.Types.ObjectId(schoolId),
		},
		{ schoolName: 1 }
	);

	let sectionList = await Sections.find({
		school: mongoose.Types.ObjectId(schoolId),
	})
		.project({ name: 1, className: 1 })
		.toArray();
	sectionList = sectionList.reduce((acc, curr) => {
		acc[curr._id] = curr;
		return acc;
	}, {});

	// Find all the feestructures of this academic year
	const feeStructures = await FeeStructure.find({
		academicYearId,
		schoolId,
	}).lean();

	// Find all the feeinstallments of this academic year
	for (const feeStructure of feeStructures) {
		let termDate = null;
		let feeInstallments = null;
		const { _id, feeStructureName, feeDetails, totalAmount } = feeStructure;
		feeStructureMap[_id] = totalAmount;
		const isNewAdmission = regex.test(feeStructureName);
		const aggregate = [
			{
				$match: {
					feeStructureId: mongoose.Types.ObjectId(_id),
				},
			},
			{
				$project: {
					studentId: 1,
					netAmount: 1,
					paidAmount: 1,
					balanceAmount: {
						$subtract: ['$netAmount', '$paidAmount'],
					},
					sectionId: 1,
					feeStructureId: 1,
				},
			},
			{
				$lookup: {
					from: 'students',
					let: {
						stud: '$studentId',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$eq: ['$_id', '$$stud'],
								},
							},
						},
						{
							$project: {
								_id: 1,
								name: 1,
								parent_id: 1,
								username: 1,
							},
						},
					],
					as: 'studentId',
				},
			},
			{
				$unwind: {
					path: '$studentId',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: 'parents',
					let: {
						parentId: '$studentId.parent_id',
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
								_id: 1,
								name: 1,
							},
						},
					],
					as: 'parent',
				},
			},
			{
				$unwind: {
					path: '$parent',
					preserveNullAndEmptyArrays: true,
				},
			},
		];
		if (isNewAdmission) {
			termDate = feeDetails[0].scheduledDates[0].date;
			aggregate[0].$match.date = new Date(termDate);
			feeInstallments = await FeeInstallment.aggregate(aggregate);
			// [{
			//   "_id": "646df57e6014fec353252572",
			//   "sectionId": "6284b90ebb0c8eeb51048c29",
			//   "studentId": {
			//     "_id": "646df4a03317392a4d591833",
			//     "name": "W SAQIYA IRAM",
			//     "parent_id": "646df4a03317392a4d591832",
			//     "username": "9972644981"
			//   },
			//   "paidAmount": 6300,
			//   "netAmount": 6300,
			//   "balanceAmount": 0,
			//   "parent": {
			//     "_id": "646df4a03317392a4d591832",
			//     "name": "K.M. WASEEM UR REHAMAN"
			//   }
			// }]
			studentList.push(...feeInstallments);
		} else {
			for (const [index, object] of feeDetails.entries()) {
				if (index === 0) {
					termDate = object.scheduledDates[0].date;
					let tempStudentMap = await FeeInstallment.aggregate([
						{
							$match: {
								feeStructureId: mongoose.Types.ObjectId(_id),
								rowId: mongoose.Types.ObjectId(object._id),
							},
						},
						{
							$project: {
								studentId: 1,
								balanceAmount: {
									$subtract: ['$netAmount', '$paidAmount'],
								},
								netAmount: 1,
								paidAmount: 1,
							},
						},
					]);
					tempStudentMap = tempStudentMap.reduce((acc, curr) => {
						acc[curr.studentId] = {
							balanceAmount: curr.balanceAmount,
							netAmount: curr.netAmount,
							paidAmount: curr.paidAmount,
						};
						return acc;
					}, {});
					finalStudentMap = { ...finalStudentMap, ...tempStudentMap };
					// eslint-disable-next-line no-continue
					continue;
				}
				termDate = object.scheduledDates[0].date;
				aggregate[0].$match.date = new Date(termDate);
				aggregate[0].$match.rowId = mongoose.Types.ObjectId(object._id);
				feeInstallments = await FeeInstallment.aggregate(aggregate);
			}
			studentList.push(...feeInstallments);
		}
	}
	const workbook = new excel.Workbook();
	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Student Fees Excel');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	worksheet.cell(1, 1).string('Student Name').style(style);
	worksheet.cell(1, 2).string('Parent Name').style(style);
	worksheet.cell(1, 3).string('Phone Number').style(style);
	worksheet.cell(1, 4).string('Class').style(style);
	worksheet.cell(1, 5).string('Total Fees').style(style);
	worksheet.cell(1, 6).string('Term Fee').style(style);
	worksheet.cell(1, 7).string('Paid Fee').style(style);
	worksheet.cell(1, 8).string('Balance Fee').style(style);
	worksheet.cell(1, 9).string('Total Balance (Previous Year)').style(style);
	worksheet.cell(1, 10).string('Paid Fees (Previous Year)').style(style);
	worksheet.cell(1, 11).string('Balance (Previous Year)').style(style);

	studentList.forEach((installment, index) => {
		const {
			studentId,
			parent,
			sectionId,
			paidAmount,
			netAmount,
			balanceAmount,
			feeStructureId,
		} = installment;
		const feeTotalAmount = feeStructureMap[feeStructureId.toString()] ?? 0;
		const {
			balanceAmount: studPrevBal = 0,
			netAmount: studPrevNet = 0,
			paidAmount: studPrevPaid = 0,
		} = finalStudentMap[studentId._id.toString()] ?? {};
		const className = sectionList[sectionId.toString()]?.className || '';
		worksheet.cell(index + 2, 1).string(studentId.name);
		worksheet
			.cell(index + 2, 2)
			.string(parent?.name || `${studentId.name} (Parent)`);
		worksheet.cell(index + 2, 3).string(studentId.username);
		worksheet.cell(index + 2, 4).string(className);
		worksheet.cell(index + 2, 5).number(feeTotalAmount);
		worksheet.cell(index + 2, 6).number(netAmount);
		worksheet.cell(index + 2, 7).number(paidAmount);
		worksheet.cell(index + 2, 8).number(balanceAmount);
		worksheet.cell(index + 2, 9).number(studPrevNet);
		worksheet.cell(index + 2, 10).number(studPrevPaid);
		worksheet.cell(index + 2, 11).number(studPrevBal);
	});

	workbook.write(`${schoolName}.xlsx`);
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res
		.status(200)
		.json(SuccessResponse(data, data.length, 'Fetched Successfully'));
});

exports.NewAdmissionExcel = catchAsync(async (req, res, next) => {
	const { schoolId } = req.params;
	const { _id: academicYearId } = await AcademicYear.findOne({
		isActive: true,
		schoolId,
	});

	let sectionList = await Sections.find({
		school: mongoose.Types.ObjectId(schoolId),
	})
		.project({ name: 1, className: 1 })
		.toArray();
	sectionList = sectionList.reduce((acc, curr) => {
		acc[curr._id] = curr;
		return acc;
	}, {});
	// Find the feeStructure of this academic year and regex for new admission
	let feeStructures = await FeeStructure.find({
		academicYearId,
		schoolId,
		feeStructureName: /^.*new.*$/i,
	}).lean();

	feeStructures = feeStructures.map(feeStructure =>
		mongoose.Types.ObjectId(feeStructure._id)
	);

	// Find all the feeinstallments of this academic year and feeStructure
	const studentList = await FeeInstallment.aggregate([
		{
			$match: {
				feeStructureId: {
					$in: feeStructures,
				},
			},
		},

		{
			$group: {
				_id: '$studentId',
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					stud: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$stud'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
							parent_id: 1,
							username: 1,
							section: 1,
						},
					},
				],
				as: 'studentId',
			},
		},
		{
			$unwind: '$studentId',
		},
		{
			$lookup: {
				from: 'parents',
				let: {
					parentId: '$studentId.parent_id',
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
							_id: 1,
							name: 1,
						},
					},
				],
				as: 'parent',
			},
		},
		{
			$unwind: '$parent',
		},
	]);

	const { schoolName } = await School.findOne({
		_id: mongoose.Types.ObjectId(schoolId),
	});

	const workbook = new excel.Workbook();

	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('New Admission Students');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	worksheet.cell(1, 1).string('Student Name').style(style);
	worksheet.cell(1, 2).string('Parent Name').style(style);
	worksheet.cell(1, 3).string('Phone Number').style(style);
	worksheet.cell(1, 4).string('Class').style(style);

	studentList.forEach((student, index) => {
		const { name, username, section } = student.studentId;
		const { name: parentName } = student.parent;
		const className = sectionList[section.toString()]?.className || '';
		worksheet.cell(index + 2, 1).string(name);
		worksheet.cell(index + 2, 2).string(parentName ?? `${name} (Parent)`);
		worksheet.cell(index + 2, 3).string(username);
		worksheet.cell(index + 2, 4).string(className);
	});

	workbook.write(`${schoolName} - New Admissions.xlsx`);
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res
		.status(200)
		.json(SuccessResponse(data, data.length, 'Fetched Successfully'));
});

exports.UnmappedStudentExcel = catchAsync(async (req, res, next) => {
	const { schoolId } = req.params;
	const { _id: academicYearId } = await AcademicYear.findOne({
		isActive: true,
		schoolId,
	});

	const { schoolName } = await School.findOne(
		{
			_id: mongoose.Types.ObjectId(schoolId),
		},
		{ schoolName: 1 }
	);
	const unmappedStudentList = await Student.aggregate([
		{
			$match: {
				school_id: mongoose.Types.ObjectId(schoolId),
				deleted: false,
				feeCategoryIds: {
					$exists: false,
				},
				profileStatus: 'APPROVED',
			},
		},
		{
			$lookup: {
				from: 'parents',
				let: {
					parentId: '$parent_id',
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
							_id: 1,
							name: 1,
						},
					},
				],
				as: 'parent',
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
							_id: 1,
							className: 1,
						},
					},
				],
				as: 'section',
			},
		},
		{
			$project: {
				name: 1,
				username: 1,
				parentName: {
					$first: '$parent.name',
				},
				section: {
					$first: '$section.className',
				},
			},
		},
	]).toArray();
	const workbook = new excel.Workbook();
	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Student Fees Excel');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	worksheet.cell(1, 1).string('Student Name').style(style);
	worksheet.cell(1, 2).string('Parent Name').style(style);
	worksheet.cell(1, 3).string('Phone Number').style(style);
	worksheet.cell(1, 4).string('Class').style(style);

	unmappedStudentList.forEach((student, index) => {
		const { name, parentName, username, section } = student;
		worksheet.cell(index + 2, 1).string(name);
		worksheet.cell(index + 2, 2).string(parentName);
		worksheet.cell(index + 2, 3).string(username);
		worksheet.cell(index + 2, 4).string(section);
	});

	workbook.write(`${schoolName}-unmapped.xlsx`);
	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res
		.status(200)
		.json(SuccessResponse(data, data.length, 'Fetched Successfully'));
});

exports.MakePayment = catchAsync(async (req, res, next) => {
	const {
		feeDetails,
		studentId,
		collectedFee,
		comments,
		totalFeeAmount,
		dueAmount,
		paymentMethod,
		bankName,
		chequeDate,
		chequeNumber,
		transactionDate,
		transactionId,
		donorId = null,
		upiId,
		payerName,
		ddNumber,
		ddDate,
		issueDate = new Date(),
		feeCategoryName,
		feeCategoryId,
		receiptType,
	} = req.body;
	const bulkWriteOps = [];
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
				admission_no: 1,
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

	if (donorId) {
		// update the student object in donor collection
		await DonorModel.updateOne(
			{
				_id: mongoose.Types.ObjectId(donorId),
			},
			{
				$inc: {
					totalAmount: collectedFee,
				},
			}
		);
		await Donations.create({
			amount: collectedFee,
			date: new Date(),
			donorId,
			paymentType: paymentMethod,
			studentId,
			sectionId: foundStudent[0].sectionId,
		});
	}

	const {
		studentName = '',
		username = '',
		classId = '',
		className = '',
		sectionId = '',
		sectionName = '',
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

	const currentDate = moment();
	const date = currentDate.format('DDMMYY');
	const shortCategory = feeCategoryName.slice(0, 2);

	let newCount = '00001';
	const lastReceipt = await FeeReceipt.findOne({
		'school.schoolId': schoolId,
	})
		.sort({ createdAt: -1 })
		.lean();
	if (lastReceipt && lastReceipt.receiptId) {
		newCount = lastReceipt.receiptId
			.slice(-5)
			.replace(/\d+/, n => String(Number(n) + 1).padStart(n.length, '0'));
	}

	const receiptId = `${shortCategory.toUpperCase()}${date}${newCount}`;

	const items = [];
	let currentPaidAmount = 0;

	for (const item of feeDetails) {
		currentPaidAmount += item.paidAmount;

		const foundInstallment = await FeeInstallment.findOne({
			_id: mongoose.Types.ObjectId(item._id),
		}).lean();

		const tempDueAmount =
			foundInstallment.netAmount -
			(item.paidAmount + foundInstallment.paidAmount);

		if (tempDueAmount < 0) {
			return next(
				new ErrorResponse(
					`Overpayment for ${item.feeTypeId.feeType} detected.`,
					400
				)
			);
		}

		const updateData = {
			paidDate: new Date(),
			paidAmount: item.paidAmount + foundInstallment.paidAmount,
		};

		if (tempDueAmount === 0) {
			updateData.status = foundInstallment.status == 'Due' ? 'Late' : 'Paid';
		}

		items.push({
			installmentId: item._id,
			feeTypeId: item.feeTypeId._id,
			netAmount: item.netAmount,
			paidAmount: item.paidAmount,
		});
		// make bulkwrite query
		bulkWriteOps.push({
			updateOne: {
				filter: { _id: item._id },
				update: {
					$set: updateData,
				},
			},
		});
	}

	await FeeInstallment.bulkWrite(bulkWriteOps);

	const createdReceipt = await FeeReceipt.create({
		student: {
			name: studentName,
			studentId,
			admission_no,
			class: {
				name: className,
				classId,
			},
			section: {
				name: sectionName,
				sectionId,
			},
		},
		comments,
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

exports.IncomeDashboard = async (req, res, next) => {
	try {
		const {
			schoolId,
			dateRange = null,
			startDate = null,
			endDate = null,
		} = req.query;
		let dateObj = null;
		let prevDateObj = null;

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
				break;

			default:
				dateObj = {
					$gte: getStartDate(startDate),
					$lte: getEndDate(endDate),
				};
				break;
		}

		let sectionList = await Sections.find({
			school: mongoose.Types.ObjectId(schoolId),
		})
			.project({ name: 1, className: 1 })
			.toArray();
		sectionList = sectionList.reduce((acc, curr) => {
			acc[curr._id] = curr;
			return acc;
		}, {});

		const totalIncomeAggregation = [
			{
				$match: {
					'school.schoolId': mongoose.Types.ObjectId(schoolId),
					issueDate: dateObj,
					status: { $ne: 'CANCELLED' },
				},
			},
		];
		if (dateRange === 'daily') {
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
		} else {
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
		}

		const miscAggregate = [
			{
				$facet: {
					totalCollected: [
						{
							$match: {
								'school.schoolId': mongoose.Types.ObjectId(schoolId),
								receiptType: 'ACADEMIC',
								issueDate: dateObj,
								status: { $ne: 'CANCELLED' },
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
								// TODO: Separate field "AcademicPaidAmount" to be summed.
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
								'school.schoolId': mongoose.Types.ObjectId(schoolId),
								receiptType: {
									$in: ['APPLICATION', 'MISCELLANEOUS'],
								},
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
									$sum: '$paidAmount',
								},
							},
						},
					],
					// totalIncomeCollected[0].totalAmount
					totalIncomeCollected: totalIncomeAggregation,
				},
			},
		];
		// prevIncomeCollected[0].totalAmount
		if (dateRange) {
			miscAggregate[0].$facet.prevIncomeCollected = [
				{
					$match: {
						'school.schoolId': mongoose.Types.ObjectId(schoolId),
						issueDate: prevDateObj,
					},
				},
				{
					$group: {
						_id: null,
						totalAmount: {
							$sum: '$paidAmount',
						},
					},
				},
			];
		}
		const incomeAggregate = [
			{
				$facet: {
					totalReceivable: [
						{
							$match: {
								schoolId: mongoose.Types.ObjectId(schoolId),
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
								schoolId: mongoose.Types.ObjectId(schoolId),
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
				},
			},
		];
		const totalIncomeData = await FeeReceipt.aggregate(miscAggregate);
		const feesReport = await FeeInstallment.aggregate(incomeAggregate);
		if (!feesReport.length) {
			return next(new ErrorResponse('No Data Found', 404));
		}
		const incomeData = feesReport[0];
		const {
			totalCollected,
			miscCollected,
			totalIncomeCollected,
			prevIncomeCollected = [],
		} = totalIncomeData[0];
		incomeData.miscellaneous = [];
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

		incomeData.totalReceivable = setDefaultValuesAndUpdateSectionInfo(
			incomeData.totalReceivable,
			sectionList
		);
		incomeData.totalCollected = setDefaultValuesAndUpdateSectionInfo(
			totalCollected[0],
			sectionList
		);
		incomeData.totalPending = setDefaultValuesAndUpdateSectionInfo(
			incomeData.totalPending,
			sectionList
		);

		if (miscCollected.length) {
			const foundMiscTypes = await FeeType.find(
				{
					schoolId: mongoose.Types.ObjectId(schoolId),
					isMisc: true,
				},
				{
					feeType: 1,
				}
			).lean();
			const miscTypes = foundMiscTypes.reduce((acc, curr) => {
				acc[curr._id] = curr.feeType;
				return acc;
			}, {});
			incomeData.miscellaneous = miscCollected.map(misc => {
				const miscType = miscTypes[misc._id];
				return {
					amount: misc.totalAmount,
					feeTypeId: {
						_id: misc._id,
						feeType: miscType,
					},
				};
			});
		}
		const prevAmount = prevIncomeCollected[0]?.totalAmount || 0;
		const currentPaidAmount = totalIncomeCollected[0]?.totalAmount || 0;
		incomeData.totalIncome = {
			amount: currentPaidAmount,
			incomeList: totalIncomeCollected[0]?.incomeList || [],
			// find the average percentage of income
			percentage:
				prevAmount > 0
					? ((currentPaidAmount - prevAmount) / prevAmount) * 100
					: 0,
		};
		res
			.status(200)
			.json(SuccessResponse(incomeData, 1, 'Fetched SuccessFully'));
	} catch (error) {
		console.log(error.stack);
		return next(new ErrorResponse('Something went wrong', 500));
	}
};

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
