const mongoose = require('mongoose');
const DonorModel = require('../models/donor');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');

// CREATE
exports.create = async (req, res, next) => {
	const {
		name,
		email,
		address,
		contactNumber,
		bank,
		IFSC,
		accountNumber,
		accountType,
		donorType,
		studentList,
	} = req.body;
	if (
		!name ||
		!email ||
		!address ||
		!bank ||
		!IFSC ||
		!accountNumber ||
		!accountType ||
		!donorType ||
		!contactNumber
	) {
		return next(new ErrorResponse('All Fields are Mandatory', 422));
	}

	const isExist = await DonorModel.findOne({ name, email, contactNumber });
	if (isExist) {
		return next(new ErrorResponse('Donor Already Exist', 400));
	}

	let newDonor;
	try {
		newDonor = await DonorModel.create({
			name,
			email,
			address,
			contactNumber,
			bank,
			IFSC,
			accountNumber,
			accountType,
			donorType,
			studentList: studentList ?? [],
		});
	} catch (error) {
		console.log('error', error);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
	return res
		.status(201)
		.json(SuccessResponse(newDonor, 1, 'Created Successfully'));
};

// GET
exports.get = catchAsync(async (req, res, next) => {
	let { page = 0, limit = 5 } = req.query;
	page = +page;
	limit = +limit;
	const payload = {};
	const donorList = await DonorModel.aggregate([
		{
			$facet: {
				data: [
					{ $match: payload },
					{ $sort: 'updatedAt' },
					{ $skip: page * limit },
					{ $limit: limit },
				],
				count: [{ $match: payload }, { $count: 'count' }],
			},
		},
	]);
	const { data, count } = donorList[0];

	if (count.length === 0) {
		return next(new ErrorResponse('No Donor Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched Successfully'));
});

// READ
exports.read = catchAsync(async (req, res, next) => {
	const { id } = req.query;
	const donorList = await DonorModel.findOne({ _id: id }).populate([
		{
			path: 'studentList.student_id',
			select: 'name profile_image class section',
			populate: [
				{ path: 'class', select: 'name' },
				{ path: 'section', select: 'name' },
			],
		},
	]);
	const donatedAmount = donorList.studentList.reduce(
		(acc, obj) => acc + obj.amount,
		0
	);
	donorList.donatedAmount = donatedAmount;
	if (donorList === null) {
		return next(new ErrorResponse('Donor Not Found', 404));
	}
	res.status(200).json(SuccessResponse(donorList, 1, 'Fetched Successfully'));
});

// UPDATE
exports.update = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const donor = await DonorModel.findOneAndUpdate({ _id: id }, req.body);
	if (donor === null) {
		return next(new ErrorResponse('Donor Not Found', 404));
	}
	res.status(200).json(SuccessResponse(donor, 1, 'Updated Successfully'));
});

// update student list
exports.updateStudentList = catchAsync(async (req, res, next) => {
	const { id, studentList } = req.body;

	await Promise.all(
		studentList.map(async student => {
			await DonorModel.updateOne(
				{ _id: id },
				{ $addToSet: { studentList: student } }
			);
		})
	);
	res.status(200).json(SuccessResponse(null, 1, 'Updated Successfully'));
});

// DELETE
exports.donorDelete = catchAsync(async (req, res, next) => {
	const { id } = req.params;

	const donor = await DonorModel.findOneAndDelete({
		_id: id,
	});
	if (donor === null) {
		return next(new ErrorResponse('Donor Not Found', 404));
	}
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
});
