const PreviousBalance = require('../models/previousFeesBalance');
const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');
const CatchAsync = require('../utils/catchAsync');

const GetAllByFilter = async (req, res) => {};

const CreatePreviousBalance = CatchAsync(async (req, res, next) => {
	const {
		studentId = null,
		dueDate = new Date(),
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
		!studentName ||
		!parentName ||
		!username ||
		!gender ||
		!sectionId ||
		!pendingAmount ||
		!schoolId ||
		(gender !== 'Male' && gender !== 'Female') ||
		(studentName && !studentId) ||
		(parentName && !studentId) ||
		(username && !studentId) ||
		(gender && !studentId)
	) {
		return next(new ErrorResponse('Please Provide All The Input Fields', 422));
	}

	const previousBalance = await PreviousBalance.create({
		studentId,
		amount,
		isEnrolled,
		studentName,
		parentName,
		status,
		username,
		gender,
		sectionId,
		academicYearId,
		pendingAmount,
	});

	res.status(201).json(new SuccessResponse(201, previousBalance));
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
