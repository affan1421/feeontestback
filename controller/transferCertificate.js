const mongoose = require('mongoose');

const studentsCollection = mongoose.connection.db.collection('students');
const StudentTransfer = require('../models/transferCertificate');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

async function createStudentTransfer(req, res, next) {
	try {
		const { studentId, classId, tcType, reason, transferringSchool, status } =
			req.body;
		console.log(req.body, 'bodyy');
		const newStudentTransfer = new StudentTransfer({
			studentId,
			classId,
			tcType,
			reason,
			transferringSchool,
			status,
		});

		await newStudentTransfer.save();
		res
			.status(200)
			.json(
				SuccessResponse(
					newStudentTransfer,
					1,
					'Student transfer record created successfully'
				)
			);
	} catch (error) {
		console.error('Error creating student transfer record:', error);
		console.log('error', error.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
}

async function getUsers(req, res, next) {
	try {
		const { searchQuery, classId, page } = req.query;
		const regexName = new RegExp(searchQuery, 'i');
		const query = {};
		const pageNumber = parseInt(page) || 1;
		const pageSize = 10; // we put it 10 as default
		const skip = (pageNumber - 1) * pageSize;
		const limit = skip + pageSize;

		if (searchQuery) {
			query.name = regexName;
		}

		if (classId) {
			query.class = mongoose.Types.ObjectId(classId);
		}
		const result = await studentsCollection
			.find(query)
			.skip(skip)
			.limit(limit)
			.toArray();
		res
			.status(200)
			.json(SuccessResponse(result, 1, 'Student details fetch successfully'));
	} catch (error) {
		console.error('Error creating student transfer record:', error);
		console.log('error', error.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
}

module.exports = {
	createStudentTransfer,
	getUsers,
};
