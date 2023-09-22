const mongoose = require('mongoose');

const studentsCollection = mongoose.connection.db.collection('students');
const StudentTransfer = require('../models/transferCertificate');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

async function createStudentTransfer(req, res, next) {
	try {
		const {
			studentId,
			classId,
			tcType,
			reason,
			transferringSchool,
			status,
			attachments,
		} = req.body;
		console.log(req.body, 'bodyy');
		const newStudentTransfer = new StudentTransfer({
			studentId,
			classId,
			tcType,
			reason,
			transferringSchool,
			status,
			attachments,
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
		console.error('Error Student details fetch:', error);
		console.log('error', error.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
}

async function changeStatus(req, res, next) {
	try {
		const transferId = req.parms.id;
		const { status } = req.query;

		if (!transferId || !status) {
			return res
				.status(400)
				.json({ message: 'Transfer Id and status are required' });
		}

		const transfer = await StudentTransfer.findById(transferId);

		if (!transfer) {
			return res
				.status(404)
				.json({ message: 'Transfer certificate not found' });
		}

		// Update transfer status
		transfer.status = status;
		await transfer.save();
		res
			.status(200)
			.json(
				SuccessResponse(
					null,
					1,
					'Transfer certificate status updated successfully'
				)
			);
	} catch (error) {
		console.error('Error on update status:', error);
		console.log('error', error.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
}

async function getStudentIdByName(name) {
	const regexName = new RegExp(name, 'i');
	const student = await studentsCollection.find({ name: regexName });
	if (student.length === 0) {
		return null;
	}
	return student;
}

async function getTc(req, res, next) {
	try {
		const { searchQuery, classes, tcType, tcStatus } = req.query;
		const query = {};
		let stdIds = null;
		if (searchQuery) {
			stdIds = await getStudentIdByName(searchQuery);
		}
		if (stdIds) {
			query.studentId = { $in: stdIds };
		}
		if (classes) {
			query.classId = mongoose.Types.ObjectId(classes);
		}

		if (tcType) {
			query.tcType = tcType;
		}

		if (tcStatus) {
			query.status = tcStatus;
		}

		const result = await StudentTransfer.find(query).toArray();

		res
			.status(200)
			.json(
				SuccessResponse(
					result,
					1,
					'Transfer certificate status updated successfully'
				)
			);
	} catch (error) {
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
}

module.exports = {
	createStudentTransfer,
	getUsers,
	changeStatus,
	getTc,
};
