const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const feeDetailSchema = new Schema({
	feeType: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'FeeType',
		required: true,
	},
	feeSchedule: {
		type: String,
		required: true,
	},
	amount: {
		type: Number,
		required: true,
	},
	breakdown: {
		type: String,
	},
});

const feeStructureSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	description: {
		type: String,
		required: true,
	},
	academicYear: {
		type: String,
		required: true,
	},
	class: {
		type: String,
		required: true,
	},
	feeDetails: [feeDetailSchema],
	totalAmount: {
		type: Number,
		required: true,
	},
});

module.exports = model('FeeStructure', feeStructureSchema);
