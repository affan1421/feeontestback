const mongoose = require('mongoose');
const moment = require('moment');
const FeeInstallment = require('../models/feeInstallment');
const CatchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

const Sections = mongoose.connection.db.collection('sections');

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
			$facet: {
				classes: [
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
						$addFields: {
							dueAmount: {
								$subtract: ['$netAmount', '$paidAmount'],
							},
						},
					},
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
			},
		},
	];

	const [result] = await FeeInstallment.aggregate(aggregate);

	const { classes, duesAmount } = result;

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

	res.status(200).json(SuccessResponse(response, 1, 'Fetched SuccessFully'));
});

const getStudentList = async (req, res, next) => {};

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
