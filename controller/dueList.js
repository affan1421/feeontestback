const mongoose = require('mongoose');
const moment = require('moment');
const FeeInstallment = require('../models/feeInstallment');
const CatchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

const Sections = mongoose.connection.db.collection('sections');

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
											$eq: ['$gender', 'Male'],
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
											$eq: ['$gender', 'Female'],
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
	} = req.body;
	// const { school_id } = req.user;

	if (!scheduleId || !scheduleDates.length) {
		return next(new ErrorResponse('Please Provide ScheduleId And Dates', 422));
	}

	const match = {
		scheduleTypeId: mongoose.Types.ObjectId(scheduleId),
		// schoolId: mongoose.Types.ObjectId(school_id),
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
			$group: {
				_id: '$studentId',
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
				totalAmount: 1,
				discountAmount: 1,
				paidAmount: 1,
				dueAmount: 1,
			},
		},
	];

	const result = await FeeInstallment.aggregate(aggregate);

	if (!result.length) {
		return next(new ErrorResponse('No Dues Found', 404));
	}

	res
		.status(200)
		.json(SuccessResponse(result, result.length, 'Fetched SuccessFully'));
});

const getStudentListExcel = async (req, res, next) => {};

const getClassList = async (req, res, next) => {};

const getClassListExcel = async (req, res, next) => {};

const getStudentListByClass = async (req, res, next) => {};

module.exports = {
	getSummary,
	getStudentList,
	getStudentListExcel,
	getClassList,
	getClassListExcel,
	getStudentListByClass,
};
