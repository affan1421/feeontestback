/* eslint-disable no-unused-expressions */
/* eslint-disable prefer-destructuring */
const mongoose = require('mongoose');
const moment = require('moment');
const PreviousBalance = require('../models/previousFeesBalance');
const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');
const CatchAsync = require('../utils/catchAsync');

const Student = mongoose.connection.db.collection('students');

const GetAllByFilter = CatchAsync(async (req, res, next) => {
	let {
		schoolId,
		academicYearId,
		isEnrolled = false,
		page,
		limit,
		sectionId,
	} = req.query;
	const payload = {};

	if (schoolId) {
		payload.schoolId = mongoose.Types.ObjectId(schoolId);
	} else {
		return next(new ErrorResponse('Please Provide The School Id', 422));
	}
	if (academicYearId) {
		payload.academicYearId = mongoose.Types.ObjectId(academicYearId);
	}
	if (isEnrolled) {
		payload.isEnrolled = isEnrolled === 'true';
	}
	if (sectionId) {
		payload.sectionId = mongoose.Types.ObjectId(sectionId);
	}
	// Optional Pagination
	const dataFacet = [{ $match: payload }];
	if (page && limit) {
		page = +page;
		limit = +limit;
		dataFacet.push({ $skip: page * limit }, { $limit: limit });
	}
	const previousBalances = await PreviousBalance.aggregate([
		{
			$facet: {
				data: dataFacet,
				count: [{ $match: payload }, { $count: 'count' }],
			},
		},
	]);
	const { data, count } = previousBalances[0];

	if (count.length === 0) {
		return next(new ErrorResponse('No Previous Fee Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched Successfully'));
});

const CreatePreviousBalance = CatchAsync(async (req, res, next) => {
	let {
		studentId = null,
		dueDate = moment().subtract(1, 'days').format('MM-DD-YYYY'),
		studentName, // Left
		parentName, // Left
		username, // Left
		gender, // Left
		schoolId,
		sectionId,
		academicYearId,
		pendingAmount,
	} = req.body;
	const isEnrolled = !!studentId;
	if (
		(!studentId && (!studentName || !parentName || !username || !gender)) ||
		!academicYearId ||
		!schoolId ||
		!sectionId ||
		!pendingAmount
	) {
		return next(new ErrorResponse('Please Provide All The Input Fields', 422));
	}

	// Fetch student, parent, username and gender from studentId
	if (studentId) {
		const student = await Student.aggregate([
			{
				$match: {
					_id: mongoose.Types.ObjectId(studentId),
				},
			},
			{
				$lookup: {
					from: 'parents',
					localField: 'parent_id',
					foreignField: '_id',
					as: 'parent',
				},
			},
			{
				$project: {
					_id: 0,
					studentName: '$name',
					parentName: {
						$first: '$parent.name',
					},
					username: 1,
					gender: 1,
				},
			},
		]).toArray();
		({ studentName, parentName, username, gender } = student[0]);
	}

	// Status
	// TODO: Configure the cron job to update the status of previous balance
	const status = moment(dueDate, 'MM-DD-YYYY').isBefore(moment())
		? 'Due'
		: 'Upcoming';

	const creationPayload = {
		dueDate: new Date(dueDate),
		isEnrolled,
		studentName,
		parentName,
		username,
		status,
		gender,
		schoolId,
		sectionId,
		academicYearId,
		pendingAmount,
	};
	studentId ? (creationPayload.studentId = studentId) : null;

	const previousBalance = await PreviousBalance.create(creationPayload);

	if (!previousBalance) {
		return next(new ErrorResponse('Unable To Create Previous Balance', 500));
	}

	res
		.status(201)
		.json(SuccessResponse(previousBalance, 1, 'Created Successfully'));
});

const BulkCreatePreviousBalance = async (req, res) => {};

const GetById = async (req, res) => {};

const UpdatePreviousBalance = async (req, res) => {};

const DeletePreviousBalance = async (req, res) => {};

module.exports = {
	GetAllByFilter,
	GetById,
	CreatePreviousBalance,
	UpdatePreviousBalance,
	DeletePreviousBalance,
	BulkCreatePreviousBalance,
};
