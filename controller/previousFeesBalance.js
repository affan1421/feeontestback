/* eslint-disable no-unused-expressions */
/* eslint-disable prefer-destructuring */
const mongoose = require('mongoose');
const moment = require('moment');
const excel = require('excel4node');
const PreviousBalance = require('../models/previousFeesBalance');

const Schools = mongoose.connection.db.collection('schools');
const Students = mongoose.connection.db.collection('students');
const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');
const CatchAsync = require('../utils/catchAsync');

const Student = mongoose.connection.db.collection('students');

const lockCell = (worksheet, range) => {
	worksheet.addDataValidation({
		type: 'textLength',
		error: 'This cell is locked',
		operator: 'equal',
		sqref: range,
		formulas: [''],
	});
};

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

const existingStudentExcel = CatchAsync(async (req, res, next) => {
	let { schoolId, studentList, academicYearName } = req.body;
	studentList = studentList.map(student => mongoose.Types.ObjectId(student));
	const workbook = new excel.Workbook();

	const school = await Schools.findOne({
		_id: mongoose.Types.ObjectId(schoolId),
	});

	const worksheet = workbook.addWorksheet(`${school.schoolName}`);
	const style = workbook.createStyle({
		font: {
			bold: true,
			color: '#000000',
			size: 12,
		},
		numberFormat: '$#,##0.00; ($#,##0.00); -',
	});
	worksheet.cell(1, 1).string('STUDENTID').style(style);
	worksheet.cell(1, 2).string('NAME').style(style);
	worksheet.cell(1, 3).string('CLASS').style(style);
	worksheet.cell(1, 4).string('PARENT').style(style);
	worksheet.cell(1, 5).string('BALANCE FEES').style(style);
	const students = await Students.aggregate([
		{
			$match: {
				_id: {
					$in: studentList,
				},
			},
		},
		{
			$project: {
				_id: 1,
				name: 1,
				section: 1,
				class: 1,
				parent_id: 1,
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
								$eq: ['$$classId', '$_id'],
							},
						},
					},
					{
						$project: {
							name: 1,
							sequence_number: 1,
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
								$eq: ['$$sectionId', '$_id'],
							},
						},
					},
					{
						$project: {
							name: 1,
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
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$$parentId', '$_id'],
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
			$project: {
				_id: 1,
				className: {
					$arrayElemAt: ['$class.name', 0],
				},
				section: {
					$arrayElemAt: ['$section.name', 0],
				},
				name: 1,
				parent: {
					$arrayElemAt: ['$parent.name', 0],
				},
				sequence_number: {
					$arrayElemAt: ['$class.sequence_number', 0],
				},
			},
		},
		{
			$sort: {
				sequence_number: 1,
			},
		},
	]).toArray();
	let row = 2;
	let col = 1;
	students.forEach(async stud => {
		const { _id, name, className, section, parent } = stud;
		worksheet.cell(row, col).string(_id.toString());
		worksheet.cell(row, col + 1).string(name);
		worksheet.cell(row, col + 2).string(`${className} - ${section}`);
		worksheet.cell(row, col + 3).string(parent);
		worksheet.cell(row, col + 4).number(0);
		row += 1;
		col = 1;
	});

	// Locking the cells
	lockCell(worksheet, `A1:D${students.length + 1}`);

	workbook.write(`Previous Balance - (${academicYearName}).xlsx`);
	// Previous Balance - (2020-2021).xlsx

	let data = await workbook.writeToBuffer();
	data = data.toJSON().data;

	res
		.status(200)
		.json(SuccessResponse(data, data.length, 'Fetched Successfully'));
});

module.exports = {
	GetAllByFilter,
	existingStudentExcel,
	GetById,
	CreatePreviousBalance,
	UpdatePreviousBalance,
	DeletePreviousBalance,
	BulkCreatePreviousBalance,
};
