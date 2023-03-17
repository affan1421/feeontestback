const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const feeDetailsSchema = new Schema({
	feeTypeId: {
		type: Schema.Types.ObjectId,
		ref: 'FeeType',
		required: false,
	},
	scheduleTypeId: {
		type: Schema.Types.ObjectId,
		ref: 'FeeSchedule',
		required: false,
	},
	scheduledDates: {
		type: [
			{
				date: Date,
				amount: Number,
			},
		],
	},
	totalAmount: Number,
	breakdown: Number,
});

const feeStructureSchema = new Schema({
	feeStructureName: {
		type: String,
		required: [true, 'Fee Structure Name is Mandatory'],
	},
	academicYear: {
		type: String,
		required: [true, 'Academic Year is Mandatory'],
		default: '2023-2024',
	},
	classes: {
		type: [
			{
				name: String,
				sectionId: {
					type: Schema.Types.ObjectId,
					ref: 'Section',
					required: true,
				},
			},
		],
		default: [],
	},
	description: String,
	fees: {
		type: [feeDetailsSchema],
		default: [],
	},

	totalAmount: {
		type: Number,
		required: [true, 'Total Amount is Mandatory'],
	},
});

module.exports = model('FeeStructure', feeStructureSchema);
