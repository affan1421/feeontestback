const mongoose = require('mongoose');
const moment = require('moment');
const ApplicationFee = require('../models/applicationFee');
const AcademicYear = require('../models/academicYear');
const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');

const School = mongoose.connection.db.collection('schools');

// Create a new application fee record
const createApplicationFee = async (req, res, next) => {
	const formattedDate = moment().format('DDMMYY');
	const issueDate = new Date();
	try {
		const {
			studentName,
			classId,
			className,
			parentName,
			phoneNumber,
			course = '',
			amount,
			schoolId,
			paymentMode = 'Cash',
		} = req.body;
		if (
			!studentName ||
			!classId ||
			!className ||
			!parentName ||
			!phoneNumber ||
			!amount ||
			!schoolId
		) {
			return next(new ErrorResponse('Please Provide All Field', 422));
		}

		const { schoolName, address } = await School.findOne({
			_id: mongoose.Types.ObjectId(schoolId),
		});
		const { _id: academicYearId, name: academicYearName } =
			await AcademicYear.findOne({
				isActive: true,
				schoolId,
			});

		// Generate receipt number, sort it in descending order and increment by 1
		let newCount = '0001';
		const lastReceipt = await ApplicationFee.findOne({
			'school.schoolId': schoolId,
		})
			.sort({ createdAt: -1 })
			.lean();
		if (lastReceipt && lastReceipt.receiptId) {
			newCount = lastReceipt.receiptId
				.slice(-4)
				.replace(/\d+/, n => String(Number(n) + 1).padStart(n.length, '0'));
		}
		const receiptId = `AP${formattedDate}${newCount}`;
		const payload = {
			studentName,
			classId,
			className,
			parentName,
			phoneNumber,
			course,
			amount,
			receipt: {
				student: {
					name: studentName,
					class: {
						classId,
						name: className,
					},
				},
				parent: {
					name: parentName,
					mobile: phoneNumber,
				},
				school: {
					name: schoolName,
					address,
					schoolId,
				},
				academicYear: {
					name: academicYearName,
					academicYearId,
				},
				receiptId,
				issueDate,
				payment: {
					method: paymentMode,
				},
				items: [
					{
						feeTypeId: {
							feeType: 'Application Fee',
						},
						netAmount: amount,
						paidAmount: amount,
					},
				],
			},
		};
		const applicationFee = new ApplicationFee(payload);

		await applicationFee.save();

		res
			.status(201)
			.json(SuccessResponse(applicationFee, 1, 'Created Successfully'));
	} catch (error) {
		console.log(error);
		return next(new ErrorResponse('Something went wrong', 500));
	}
};

// Get all application fee records
const getAllApplicationFees = catchAsync(async (req, res, next) => {
	let { schoolId, classId, page = 0, limit = 5 } = req.query;
	page = +page;
	limit = +limit;
	const payload = {};
	if (schoolId) {
		payload['receipt.school.schoolId'] = mongoose.Types.ObjectId(schoolId);
	}
	if (classId) {
		payload.classId = mongoose.Types.ObjectId(classId);
	}
	// find active academic year
	const { _id: academicYearId } = await AcademicYear.findOne({
		isActive: true,
		schoolId,
	});
	payload['receipt.academicYear.academicYearId'] =
		mongoose.Types.ObjectId(academicYearId);
	const applicationFee = await ApplicationFee.aggregate([
		{
			$facet: {
				data: [{ $match: payload }, { $skip: page * limit }, { $limit: limit }],
				count: [{ $match: payload }, { $count: 'count' }],
			},
		},
	]);
	const { data, count } = applicationFee[0];

	if (count.length === 0) {
		return next(new ErrorResponse('Application Fee Not Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched Successfully'));
});

// Get a single application fee record by ID
const getApplicationFeeById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const applicationFee = await ApplicationFee.findById(id);

	if (!applicationFee) {
		return next(new ErrorResponse('Application Fee Not Found', 404));
	}

	res.status(200).json({ success: true, data: applicationFee });
});

// Update an application fee record
const updateApplicationFee = async (req, res, next) => {
	try {
		const { id } = req.params;
		const {
			studentName,
			classId,
			parentName,
			phoneNumber,
			course,
			amount,
			school,
			academicYear,
			receiptId,
			issueDate,
			paymentMode,
			className,
		} = req.body;

		const applicationFee = await ApplicationFee.findByIdAndUpdate(
			id,
			{
				studentName,
				classId,
				className,
				parentName,
				phoneNumber,
				course,
				amount,
				school,
				academicYear,
				receiptId,
				issueDate,
				paymentMode,
			},
			{ new: true }
		);

		if (!applicationFee) {
			return next(new ErrorResponse('Application Fee Not Found', 404));
		}

		res
			.status(200)
			.json(SuccessResponse(applicationFee, 1, 'Updated Successfully'));
	} catch (error) {
		console.log(error);
		return next(new ErrorResponse('Something went wrong', 500));
	}
};

// Delete an application fee record
const deleteApplicationFee = async (req, res, next) => {
	try {
		const { id } = req.params;
		const applicationFee = await ApplicationFee.findByIdAndDelete(id);

		if (!applicationFee) {
			return next({ success: false, message: 'Record not found' });
		}

		res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
	} catch (error) {
		console.log(error);
		return next(new ErrorResponse('Something went wrong', 500));
	}
};

module.exports = {
	createApplicationFee,
	getAllApplicationFees,
	getApplicationFeeById,
	updateApplicationFee,
	deleteApplicationFee,
};
