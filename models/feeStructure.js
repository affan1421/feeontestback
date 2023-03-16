const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const feeStructureSchema = new Schema({
	feeStructureName: {
		type: String,
		required: [true, 'Fee Structure Name is Mandatory'],
	},
	academicYear: {
		type: String,
		required: [true, 'Academic Year is Mandatory'],
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
		type: [
			{
				feeTypeId: {
					type: Schema.Types.ObjectId,
					ref: 'FeeType',
					required: true,
				},
				scheduleTypeId: {
					type: Schema.Types.ObjectId,
					ref: 'FeeSchedule',
					required: true,
				},
				dates: [
					{
						type: String,
					},
				],
				totalAmount: Number,
				breakdown: Number,
			},
		],
		default: [],
	},

	totalAmount: {
		type: Number,
		required: [true, 'Total Amount is Mandatory'],
	},
});

module.exports = model('FeeStructure', feeStructureSchema);
