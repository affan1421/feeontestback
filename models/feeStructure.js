const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const feeDetailsSchema = new Schema({
	feeTypeId: {
		type: Schema.Types.ObjectId,
		ref: 'FeeType',
		required: [true, 'Fee Type is Mandatory'],
	},
	scheduleTypeId: {
		type: Schema.Types.ObjectId,
		ref: 'FeeSchedule',
		required: [true, 'Fee Schedule is Mandatory'],
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

const feeStructureSchema = new Schema(
	{
		feeStructureName: {
			type: String,
			required: [true, 'Fee Structure Name is Mandatory'],
		},
		academicYear: {
			type: String,
			required: false,
			default: '2023-2024',
		},
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: [true, 'School is Mandatory'],
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
		feeDetails: {
			type: [feeDetailsSchema],
			required: [true, 'Fee Details are Mandatory'],
			default: [],
		},

		totalAmount: {
			type: Number,
			required: [true, 'Total Amount is Mandatory'],
		},
	},
	{ timestamps: true }
);

module.exports = model('FeeStructure', feeStructureSchema);
