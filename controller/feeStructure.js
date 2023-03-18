const FeeStructure = require('../models/feeStructure');
const ErrorResponse = require('../utils/errorResponse');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');

// CREATE
exports.create = async (req, res, next) => {
	const {
		feeStructureName,
		academicYear = '2023-2024',
		schoolId,
		classes,
		description = '',
		feeDetails,
		totalAmount,
	} = req.body;
	let feeStructure = null;
	if (!feeStructureName || !classes || !feeDetails || !totalAmount)
		return next(new ErrorResponse('Please Provide All Required Fields', 400));
	try {
		feeStructure = await FeeStructure.create({
			feeStructureName,
			academicYear,
			classes,
			description,
			feeDetails,
			totalAmount,
		});
	} catch (err) {
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
	res.status(201).json(feeStructure);
};

// READ
exports.read = async (req, res) => {
	try {
		const feeStructure = await FeeStructure.findById(req.params.id).populate(
			'feeDetails.feeType'
		);
		if (!feeStructure) throw new Error('FeeStructure not found');
		res.json(feeStructure);
	} catch (err) {
		res.status(404).json({ message: err.message });
	}
};

// UPDATE
exports.update = async (req, res) => {
	try {
		const feeStructure = await FeeStructure.findById(req.params.id);
		if (!feeStructure) throw new Error('FeeStructure not found');

		feeStructure.name = req.body.name;
		feeStructure.description = req.body.description;
		feeStructure.academicYear = req.body.academicYear;
		feeStructure.class = req.body.class;
		feeStructure.feeDetails = req.body.feeDetails;
		feeStructure.totalAmount = req.body.totalAmount;

		await feeStructure.save();
		res.json(feeStructure);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
};

// DELETE
exports.delete = async (req, res) => {
	try {
		const feeStructure = await FeeStructure.findById(req.params.id);
		if (!feeStructure) throw new Error('FeeStructure not found');

		await feeStructure.remove();
		res.json({ message: 'FeeStructure deleted' });
	} catch (err) {
		res.status(404).json({ message: err.message });
	}
};

// LIST
exports.list = async (req, res) => {
	try {
		const feeStructures = await FeeStructure.find().populate(
			'feeDetails.feeType'
		);
		res.json(feeStructures);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
};
