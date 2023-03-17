const FeeStructure = require('../models/feeStructure');

// CREATE
exports.create = async (req, res) => {
	try {
		const feeStructure = new FeeStructure({
			name: req.body.name,
			description: req.body.description,
			academicYear: req.body.academicYear,
			class: req.body.class,
			feeDetails: req.body.feeDetails,
			totalAmount: req.body.totalAmount,
		});
		await feeStructure.save();
		res.status(201).json(feeStructure);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
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
