const mongoose = require('mongoose');
const moment = require('moment');
const excel = require('excel4node');
const FeeInstallment = require('../models/feeInstallment');
const CatchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

const Sections = mongoose.connection.db.collection('sections');
const Students = mongoose.connection.db.collection('students');

/**
 * @desc    Get Summary
 * @route   POST /api/v1/dueList/summary
 * @param   {Object} req - Request Object (scheduleId, scheduleDates)
 * @description This method is used to get summary of due list
 * @throws  {Error}  If scheduleId or scheduleDates is not provided
 * @response {Object} res - Response Object (totalClassesDue, duesAmount, dueStudents)
 */

const getSummary = CatchAsync(async (req, res, next) => {
	const { scheduleId = null, scheduleDates = [] } = req.body;
	const { school_id } = req.user;
	const response = {};

	if (!scheduleId || !scheduleDates.length) {
		return next(new ErrorResponse('Please Provide ScheduleId And Dates', 422));
	}

	let sectionList = await Sections.find({
		school: mongoose.Types.ObjectId(school_id),
	})
		.project({ name: 1, className: 1 })
		.toArray();
	sectionList = sectionList.reduce((acc, curr) => {
		acc[curr._id] = curr;
		return acc;
	}, {});

	const match = {
		scheduleTypeId: mongoose.Types.ObjectId(scheduleId),
	};

	if (scheduleDates.length) {
		match.$or = scheduleDates.map(date => {
			const startDate = moment(date, 'MM/DD/YYYY').startOf('day').toDate();
			const endDate = moment(date, 'MM/DD/YYYY').endOf('day').toDate();
			return {
				date: {
					$gte: startDate,
					$lte: endDate,
				},
			};
		});
	}

	const aggregate = [
		{
			$match: match,
		},
		{
			$addFields: {
				dueAmount: {
					$subtract: ['$netAmount', '$paidAmount'],
				},
			},
		},
		{
			$match: {
				dueAmount: {
					$gt: 0,
				},
			},
		},
		{
			$facet: {
				classes: [
					{
						$group: {
							_id: '$sectionId',
							totalAmount: {
								$sum: '$dueAmount',
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
							totalClassesDue: {
								$sum: 1,
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
				duesAmount: [
					{
						$group: {
							_id: null,
							totalReceivables: {
								$sum: '$netAmount',
							},
							dueAmount: {
								$sum: '$dueAmount',
							},
						},
					},
				],
				dueStudents: [
					{
						$group: {
							_id: '$studentId',
							gender: {
								$first: '$gender',
							},
						},
					},
					{
						$group: {
							_id: null,
							totalStudents: {
								$sum: 1,
							},
							boys: {
								$sum: {
									$cond: [
										{
											$in: ['$gender', ['Male', 'MALE', 'male']],
										},
										1,
										0,
									],
								},
							},
							girls: {
								$sum: {
									$cond: [
										{
											$in: ['$gender', ['Female', 'FEMALE', 'female']],
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
	];

	const [result] = await FeeInstallment.aggregate(aggregate);

	const { classes, duesAmount, dueStudents } = result;

	if (classes.length) {
		const { maxClass, minClass, totalClassesDue } = classes[0];
		const { sectionId: maxSectionId } = maxClass;
		const { sectionId: minSectionId } = minClass;

		const maxSection = sectionList[maxSectionId];
		const minSection = sectionList[minSectionId];

		response.totalClassesDue = {
			totalClassesDue,
			maxClass: {
				sectionId: maxSection,
				amount: maxClass.amount,
			},
			minClass: {
				sectionId: minSection,
				amount: minClass.amount,
			},
		};
	} else {
		response.totalClassesDue = {
			totalClassesDue: 0,
			maxClass: {
				sectionId: null,
				amount: 0,
			},
			minClass: {
				sectionId: null,
				amount: 0,
			},
		};
	}

	response.duesAmount = duesAmount[0] || {
		totalReceivables: 0,
		dueAmount: 0,
	};

	response.dueStudents = dueStudents[0] || {
		totalStudents: 0,
		boys: 0,
		girls: 0,
	};

	res.status(200).json(SuccessResponse(response, 1, 'Fetched SuccessFully'));
});

const getStudentList = CatchAsync(async (req, res, next) => {
	const {
		scheduleId = null,
		scheduleDates = [],
		page = 0,
		limit = 6,
		searchTerm = null,
		paymentStatus = null,
	} = req.body;
	const { school_id } = req.user;
	let studentIds = null;

	if (!scheduleId || !scheduleDates.length)
		return next(new ErrorResponse('Please Provide ScheduleId And Dates', 422));

	if (paymentStatus && !['FULL', 'PARTIAL', 'NOT'].includes(paymentStatus))
		return next(new ErrorResponse('Invalid Payment Status', 422));

	const match = {
		schoolId: mongoose.Types.ObjectId(school_id),
		scheduleTypeId: mongoose.Types.ObjectId(scheduleId),
		status: {
			$in: ['Due', 'Upcoming'],
		},
	};

	match.$or = scheduleDates.map(date => {
		const startDate = moment(date, 'MM/DD/YYYY').startOf('day').toDate();
		const endDate = moment(date, 'MM/DD/YYYY').endOf('day').toDate();
		return {
			date: {
				$gte: startDate,
				$lte: endDate,
			},
		};
	});

	if (searchTerm) {
		// find the studentIds from student collection
		const searchPayload = {
			school_id: mongoose.Types.ObjectId(school_id),
			name: {
				$regex: searchTerm,
			},
			deleted: false,
			profileStatus: 'APPROVED',
		};
		studentIds = await Students.find(searchPayload)
			.project({ _id: 1 })
			.toArray();
		match.studentId = {
			$in: studentIds.map(student => mongoose.Types.ObjectId(student._id)),
		};
	}

	if (paymentStatus === 'FULL') {
		match.status = {
			$in: ['Paid', 'Late'],
		};
	}
	// 3 // general stages
	const lookupAndProject = [
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
					studentId: '$_id',
				},
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
							name: 1,
							parent_id: 1,
							profile_image: 1,
						},
					},
				],
				as: 'student',
			},
		},
		{
			$unwind: '$student',
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					sectionId: '$sectionId',
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
			$unwind: '$section',
		},
		{
			$lookup: {
				from: 'parents',
				let: {
					parentId: '$student.parent_id',
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
		{
			$project: {
				studentName: '$student.name',
				parentName: '$parent.name',
				sectionName: '$section.className',
				profileImage: '$student.profile_image',
				totalAmount: 1,
				discountAmount: 1,
				paidAmount: 1,
				dueAmount: 1,
			},
		},
	];
	// 2 without payment Status filter
	const addFieldStage = {
		$addFields: {
			dueAmount: {
				$subtract: ['$netAmount', '$paidAmount'],
			},
		},
	};

	const groupByStudent = {
		$group: {
			_id: '$studentId',
			recCount: {
				$sum: 1,
			},
			sectionId: {
				$first: '$sectionId',
			},
			totalAmount: {
				$sum: '$totalAmount',
			},
			discountAmount: {
				$sum: '$totalDiscountAmount',
			},
			paidAmount: {
				$sum: '$paidAmount',
			},
			dueAmount: {
				$sum: '$dueAmount',
			},
		},
	};
	const aggregate = [
		{
			$match: match,
		},
	];

	if (paymentStatus) {
		switch (paymentStatus) {
			case 'FULL':
				aggregate.push(groupByStudent, {
					$match: {
						recCount: scheduleDates.length,
					},
				});
				break;
			case 'PARTIAL':
				aggregate.push(addFieldStage, groupByStudent, {
					$match: {
						$expr: {
							$lt: ['$dueAmount', '$totalAmount'],
						},
					},
				});
				break;
			case 'NOT':
				aggregate.push(
					addFieldStage,
					{
						$match: {
							$expr: {
								$eq: ['$dueAmount', '$totalAmount'],
							},
						},
					},
					groupByStudent
				);
				break;
			default:
				break;
		}
	} else {
		aggregate.push(addFieldStage, groupByStudent);
	}
	const countStages = [...aggregate, { $count: 'count' }];

	aggregate.push(...lookupAndProject);

	const [result] = await FeeInstallment.aggregate([
		{
			$facet: {
				data: aggregate,
				count: countStages,
			},
		},
	]);

	const { data, count } = result;

	if (!count.length) {
		return next(new ErrorResponse('No Dues Found', 404));
	}

	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched SuccessFully'));
});

const getStudentListExcel = CatchAsync(async (req, res, next) => {
	const {
		scheduleId = null,
		scheduleDates = [],
		paymentStatus = null,
		sectionId = null, // optional only for class wise
	} = req.body;
	const { school_id } = req.user;

	if (!scheduleId || !scheduleDates.length)
		return next(new ErrorResponse('Please Provide ScheduleId And Dates', 422));

	if (paymentStatus && !['FULL', 'PARTIAL', 'NOT'].includes(paymentStatus))
		return next(new ErrorResponse('Invalid Payment Status', 422));

	const match = {
		schoolId: mongoose.Types.ObjectId(school_id),
		scheduleTypeId: mongoose.Types.ObjectId(scheduleId),
		status: {
			$in: ['Due', 'Upcoming'],
		},
	};

	match.$or = scheduleDates.map(date => {
		const startDate = moment(date, 'MM/DD/YYYY').startOf('day').toDate();
		const endDate = moment(date, 'MM/DD/YYYY').endOf('day').toDate();
		return {
			date: {
				$gte: startDate,
				$lte: endDate,
			},
		};
	});

	if (sectionId) match.sectionId = mongoose.Types.ObjectId(sectionId);

	if (paymentStatus === 'FULL') {
		match.status = {
			$in: ['Paid', 'Late'],
		};
	}
	// 3 // general stages
	const lookupAndProject = [
		{
			$lookup: {
				from: 'students',
				let: {
					studentId: '$_id',
				},
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
							name: 1,
							parent_id: 1,
							username: 1,
							admission_no: 1,
						},
					},
				],
				as: 'student',
			},
		},
		{
			$unwind: '$student',
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					sectionId: '$sectionId',
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
			$unwind: '$section',
		},
		{
			$lookup: {
				from: 'parents',
				let: {
					parentId: '$student.parent_id',
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
		{
			$project: {
				studentName: '$student.name',
				parentName: '$parent.name',
				sectionName: '$section.className',
				username: '$student.username',
				admission_no: '$student.admission_no',
				totalAmount: 1,
				discountAmount: 1,
				paidAmount: 1,
				dueAmount: 1,
			},
		},
	];
	// 2 without payment Status filter
	const addFieldStage = {
		$addFields: {
			dueAmount: {
				$subtract: ['$netAmount', '$paidAmount'],
			},
		},
	};

	const groupByStudent = {
		$group: {
			_id: '$studentId',
			recCount: {
				$sum: 1,
			},
			sectionId: {
				$first: '$sectionId',
			},
			totalAmount: {
				$sum: '$totalAmount',
			},
			discountAmount: {
				$sum: '$totalDiscountAmount',
			},
			paidAmount: {
				$sum: '$paidAmount',
			},
			dueAmount: {
				$sum: '$dueAmount',
			},
		},
	};
	const aggregate = [
		{
			$match: match,
		},
	];

	if (paymentStatus) {
		switch (paymentStatus) {
			case 'FULL':
				aggregate.push(groupByStudent, {
					$match: {
						recCount: scheduleDates.length,
					},
				});
				break;
			case 'PARTIAL':
				aggregate.push(addFieldStage, groupByStudent, {
					$match: {
						$expr: {
							$lt: ['$dueAmount', '$totalAmount'],
						},
					},
				});
				break;
			case 'NOT':
				aggregate.push(
					addFieldStage,
					{
						$match: {
							$expr: {
								$eq: ['$dueAmount', '$totalAmount'],
							},
						},
					},
					groupByStudent
				);
				break;
			default:
				break;
		}
	} else {
		aggregate.push(addFieldStage, groupByStudent);
	}

	aggregate.push(...lookupAndProject);

	const result = await FeeInstallment.aggregate(aggregate);

	if (!result.length) {
		return next(new ErrorResponse('No Dues Found', 404));
	}

	const workbook = new excel.Workbook();
	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Student Due Excel');
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	// TODO resort cell number
	worksheet.cell(1, 1).string('Student Name').style(style);
	worksheet.cell(1, 2).string('Admission No').style(style);
	worksheet.cell(1, 3).string('Parent Name').style(style);
	worksheet.cell(1, 4).string('Phone Number').style(style);
	worksheet.cell(1, 5).string('Class').style(style);
	worksheet.cell(1, 6).string('Total Fees').style(style);
	worksheet.cell(1, 7).string('Paid Fees').style(style);
	worksheet.cell(1, 8).string('Discount').style(style);
	worksheet.cell(1, 9).string('Balance Fee').style(style);

	result.forEach((row, index) => {
		const {
			studentName,
			parentName = '',
			username,
			admission_no = '',
			sectionName = '',
			totalAmount,
			paidAmount,
			discountAmount,
			dueAmount,
		} = row;

		worksheet.cell(index + 2, 1).string(studentName);
		worksheet.cell(index + 2, 2).string(admission_no || '');
		worksheet.cell(index + 2, 3).string(parentName);
		worksheet.cell(index + 2, 4).string(username);
		worksheet.cell(index + 2, 5).string(sectionName);
		worksheet.cell(index + 2, 6).number(totalAmount);
		worksheet.cell(index + 2, 7).number(paidAmount);
		worksheet.cell(index + 2, 8).number(discountAmount);
		worksheet.cell(index + 2, 9).number(dueAmount);
	});

	workbook.write(`student-List.xlsx`);
	let buffer = await workbook.writeToBuffer();
	buffer = buffer.toJSON().data;

	res.status(200).json(SuccessResponse(buffer, 1, 'Fetched SuccessFully'));
});

const getClassList = CatchAsync(async (req, res, next) => {
	const {
		scheduleId = null,
		scheduleDates = [],
		page = 0,
		limit = 6,
		searchTerm = null,
	} = req.body;
	const { school_id } = req.user;
	const skip = page * limit;
	let sectionIds = null;

	if (!scheduleId || !scheduleDates.length) {
		return next(new ErrorResponse('Please Provide ScheduleId And Dates', 422));
	}

	const match = {
		schoolId: mongoose.Types.ObjectId(school_id),
		scheduleTypeId: mongoose.Types.ObjectId(scheduleId),
		status: {
			$in: ['Due', 'Upcoming'],
		},
	};

	match.$or = scheduleDates.map(date => {
		const startDate = moment(date, 'MM/DD/YYYY').startOf('day').toDate();
		const endDate = moment(date, 'MM/DD/YYYY').endOf('day').toDate();
		return {
			date: {
				$gte: startDate,
				$lte: endDate,
			},
		};
	});

	if (searchTerm) {
		const searchPayload = {
			school: mongoose.Types.ObjectId(school_id),
			className: {
				$regex: searchTerm,
			},
		};
		sectionIds = await Sections.find(searchPayload)
			.project({ _id: 1 })
			.toArray();
		match.sectionId = {
			$in: sectionIds.map(section => mongoose.Types.ObjectId(section._id)),
		};
	}

	const facetedStages = {
		data: [
			{
				$match: match,
			},
			{
				$addFields: {
					dueAmount: {
						$subtract: ['$netAmount', '$paidAmount'],
					},
				},
			},
			{
				$group: {
					_id: '$studentId',
					sectionId: {
						$first: '$sectionId',
					},
					paidAmount: {
						$sum: '$paidAmount',
					},
					netAmount: {
						$sum: '$netAmount',
					},
					dueAmount: {
						$sum: '$dueAmount',
					},
				},
			},
			{
				$group: {
					_id: '$sectionId',
					dueStudents: {
						$sum: 1,
					},
					totalPaidAmount: {
						$sum: '$paidAmount',
					},
					totalNetAmount: {
						$sum: '$netAmount',
					},
					totalDueAmount: {
						$sum: '$dueAmount',
					},
				},
			},
			{
				$sort: {
					totalDueAmount: -1,
				},
			},
			{
				$skip: skip,
			},
			{
				$limit: limit,
			},
			{
				$lookup: {
					from: 'sections',
					let: {
						sectionId: '$_id',
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
					as: '_id',
				},
			},
			{
				$unwind: {
					path: '$_id',
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: 'students',
					let: {
						secId: '$_id._id',
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: ['$section', '$$secId'],
										},
										{
											$eq: ['$deleted', false],
										},
										{
											$eq: ['$profileStatus', 'APPROVED'],
										},
									],
								},
							},
						},
						{
							$group: {
								_id: '$section',
								count: {
									$sum: 1,
								},
							},
						},
					],
					as: 'students',
				},
			},
			{
				$project: {
					_id: 0,
					sectionId: '$_id._id',
					className: '$_id.className',
					totalStudents: {
						$first: '$students.count',
					},
					dueStudents: 1,
					totalPaidAmount: 1,
					totalNetAmount: 1,
					totalDueAmount: 1,
				},
			},
		],
		count: [
			{ $match: match },
			{
				$addFields: {
					dueAmount: {
						$subtract: ['$netAmount', '$paidAmount'],
					},
				},
			},
			{
				$group: {
					_id: '$sectionId',
				},
			},
			{ $count: 'count' },
		],
	};

	const [result] = await FeeInstallment.aggregate([
		{
			$facet: facetedStages,
		},
	]);
	const { data, count } = result;

	if (count.length === 0) {
		return next(new ErrorResponse('No Dues Found', 404));
	}

	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched SuccessFully'));
});

const getClassListExcel = CatchAsync(async (req, res, next) => {
	const { scheduleId = null, scheduleDates = [] } = req.body;
	const { school_id } = req.user;

	if (!scheduleId || !scheduleDates.length) {
		return next(new ErrorResponse('Please Provide ScheduleId And Dates', 422));
	}

	const match = {
		schoolId: mongoose.Types.ObjectId(school_id),
		scheduleTypeId: mongoose.Types.ObjectId(scheduleId),
		status: {
			$in: ['Due', 'Upcoming'],
		},
	};

	match.$or = scheduleDates.map(date => {
		const startDate = moment(date, 'MM/DD/YYYY').startOf('day').toDate();
		const endDate = moment(date, 'MM/DD/YYYY').endOf('day').toDate();
		return {
			date: {
				$gte: startDate,
				$lte: endDate,
			},
		};
	});

	const aggregate = [
		{
			$match: match,
		},
		{
			$addFields: {
				dueAmount: {
					$subtract: ['$netAmount', '$paidAmount'],
				},
			},
		},
		{
			$group: {
				_id: '$studentId',
				sectionId: {
					$first: '$sectionId',
				},
				paidAmount: {
					$sum: '$paidAmount',
				},
				netAmount: {
					$sum: '$netAmount',
				},
				dueAmount: {
					$sum: '$dueAmount',
				},
			},
		},
		{
			$group: {
				_id: '$sectionId',
				dueStudents: {
					$sum: 1,
				},
				totalPaidAmount: {
					$sum: '$paidAmount',
				},
				totalNetAmount: {
					$sum: '$netAmount',
				},
				totalDueAmount: {
					$sum: '$dueAmount',
				},
			},
		},
		{
			$sort: {
				totalDueAmount: -1,
			},
		},
		{
			$lookup: {
				from: 'sections',
				let: {
					sectionId: '$_id',
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
				as: '_id',
			},
		},
		{
			$unwind: {
				path: '$_id',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					secId: '$_id._id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: ['$section', '$$secId'],
									},
									{
										$eq: ['$deleted', false],
									},
									{
										$eq: ['$profileStatus', 'APPROVED'],
									},
								],
							},
						},
					},
					{
						$group: {
							_id: '$section',
							count: {
								$sum: 1,
							},
						},
					},
				],
				as: 'students',
			},
		},
		{
			$project: {
				_id: 0,
				sectionId: '$_id._id',
				className: '$_id.className',
				totalStudents: {
					$first: '$students.count',
				},
				dueStudents: 1,
				totalPaidAmount: 1,
				totalNetAmount: 1,
				totalDueAmount: 1,
			},
		},
	];

	const result = await FeeInstallment.aggregate(aggregate);

	if (!result.length) return next(new ErrorResponse('No Dues Found', 404));

	const workbook = new excel.Workbook();
	// Add Worksheets to the workbook
	const worksheet = workbook.addWorksheet('Class Due Excel');

	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});

	worksheet.cell(1, 1).string('Class Name').style(style);
	worksheet.cell(1, 2).string('Total Students').style(style);
	worksheet.cell(1, 3).string('Due Students').style(style);
	worksheet.cell(1, 4).string('Total Fees').style(style);
	worksheet.cell(1, 5).string('Paid Fees').style(style);
	worksheet.cell(1, 6).string('Balance Fees').style(style);

	result.forEach((row, index) => {
		const {
			className = '',
			totalStudents = 0,
			dueStudents = 0,
			totalPaidAmount,
			totalNetAmount,
			totalDueAmount,
		} = row;

		worksheet.cell(index + 2, 1).string(className);
		worksheet.cell(index + 2, 2).number(totalStudents);
		worksheet.cell(index + 2, 3).number(dueStudents);
		worksheet.cell(index + 2, 4).number(totalNetAmount);
		worksheet.cell(index + 2, 5).number(totalPaidAmount);
		worksheet.cell(index + 2, 6).number(totalDueAmount);
	});

	workbook.write(`Class-List.xlsx`);
	let buffer = await workbook.writeToBuffer();
	buffer = buffer.toJSON().data;

	res.status(200).json(SuccessResponse(buffer, 1, 'Fetched SuccessFully'));
});

const getStudentListByClass = CatchAsync(async (req, res, next) => {
	// No pagination, No search
	const { sectionId = null, scheduleDates = [], scheduleId = null } = req.body;
	const { school_id } = req.user;

	if (!sectionId || !scheduleDates.length || !scheduleId)
		return next(new ErrorResponse('Please Provide SectionId And Dates', 422));

	const match = {
		schoolId: mongoose.Types.ObjectId(school_id),
		sectionId: mongoose.Types.ObjectId(sectionId),
	};

	match.$or = scheduleDates.map(date => {
		const startDate = moment(date, 'MM/DD/YYYY').startOf('day').toDate();
		const endDate = moment(date, 'MM/DD/YYYY').endOf('day').toDate();
		return {
			date: {
				$gte: startDate,
				$lte: endDate,
			},
		};
	});

	const aggregate = [
		{
			$match: match,
		},
		{
			$addFields: {
				dueAmount: {
					$subtract: ['$netAmount', '$paidAmount'],
				},
			},
		},
		{
			$match: {
				dueAmount: {
					$gt: 0,
				},
			},
		},
		{
			$group: {
				_id: '$studentId',
				sectionId: {
					$first: '$sectionId',
				},
				totalAmount: {
					$sum: '$totalAmount',
				},
				dueAmount: {
					$sum: '$dueAmount',
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					studentId: '$_id',
				},
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
							name: 1,
							username: 1,
							profile_image: 1,
							admission_no: 1,
							parent_id: 1,
						},
					},
				],
				as: 'student',
			},
		},
		{
			$unwind: '$student',
		},
		{
			$lookup: {
				from: 'parents',
				let: {
					parentId: '$student.parent_id',
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
		{
			$project: {
				studentName: '$student.name',
				parentName: '$parent.name',
				admission_no: '$student.admission_no',
				username: '$student.username',
				profileImage: '$student.profile_image',
				totalAmount: 1,
				dueAmount: 1,
			},
		},
	];

	const result = await FeeInstallment.aggregate(aggregate);

	if (!result) {
		return next(new ErrorResponse('No Dues Found', 404));
	}

	res
		.status(200)
		.json(SuccessResponse(result, result.length, 'Fetched SuccessFully'));
});

module.exports = {
	getSummary,
	getStudentList,
	getStudentListExcel,
	getClassList,
	getClassListExcel,
	getStudentListByClass,
};
