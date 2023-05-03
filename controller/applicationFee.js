const ApplicationFee = require('../models/applicationFee');
const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');

// Create a new application fee record
const createApplicationFee = async (req, res) => {
	try {
		const {
			studentName,
			classId,
			parentName,
			phoneNumber,
			course,
			amount,
			schoolId,
			receiptNumber,
			receiptDate,
			paymentMode,
		} = req.body;

		const applicationFee = new ApplicationFee({
			studentName,
			classId,
			className: classId.name,
			parentName,
			phoneNumber,
			course,
			amount,
			schoolId,
			receiptNumber,
			receiptDate,
			paymentMode,
		});

		await applicationFee.save();

		res.status(201).json({ success: true, data: applicationFee });
	} catch (error) {
		console.log(error);
		res.status(500).json({ success: false, message: 'Server Error' });
	}
};

// Get all application fee records
const getAllApplicationFees = async (req, res) => {
	try {
		const applicationFees = await ApplicationFee.find();

		res.status(200).json({ success: true, data: applicationFees });
	} catch (error) {
		console.log(error);
		res.status(500).json({ success: false, message: 'Server Error' });
	}
};

// Get a single application fee record by ID
const getApplicationFeeById = async (req, res) => {
	try {
		const applicationFee = await ApplicationFee.findById(req.params.id);

		if (!applicationFee) {
			return res
				.status(404)
				.json({ success: false, message: 'Record not found' });
		}

		res.status(200).json({ success: true, data: applicationFee });
	} catch (error) {
		console.log(error);
		res.status(500).json({ success: false, message: 'Server Error' });
	}
};

// Update an application fee record
const updateApplicationFee = async (req, res) => {
	try {
		const {
			studentName,
			classId,
			parentName,
			phoneNumber,
			course,
			amount,
			schoolId,
			receiptNumber,
			receiptDate,
			paymentMode,
		} = req.body;

		const applicationFee = await ApplicationFee.findByIdAndUpdate(
			req.params.id,
			{
				studentName,
				classId,
				className: classId.name,
				parentName,
				phoneNumber,
				course,
				amount,
				schoolId,
				receiptNumber,
				receiptDate,
				paymentMode,
			},
			{ new: true, runValidators: true }
		);

		if (!applicationFee) {
			return res
				.status(404)
				.json({ success: false, message: 'Record not found' });
		}

		res.status(200).json({ success: true, data: applicationFee });
	} catch (error) {
		console.log(error);
		res.status(500).json({ success: false, message: 'Server Error' });
	}
};

// Delete an application fee record
const deleteApplicationFee = async (req, res) => {
	try {
		const applicationFee = await ApplicationFee.findByIdAndDelete(
			req.params.id
		);

		if (!applicationFee) {
			return res
				.status(404)
				.json({ success: false, message: 'Record not found' });
		}

		res
			.status(200)
			.json({ success: true, message: 'Record deleted successfully' });
	} catch (error) {
		console.log(error);
		res.status(500).json({ success: false, message: 'Server Error' });
	}
};

module.exports = {
	createApplicationFee,
	getAllApplicationFees,
	getApplicationFeeById,
	updateApplicationFee,
	deleteApplicationFee,
};
