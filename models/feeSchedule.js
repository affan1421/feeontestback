const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const feeScheduleSchema = new Schema(
	{
		scheduleName: {
			type: String,
			required: [true, 'Please add a schedule name'],
		},
		description: {
			type: String,
			required: [false, 'Please add a description'],
			default: '',
		},
		scheduleType: {
			type: String,
			required: [true, 'Please add a schedule type'],
			enum: ['Monthly', 'Yearly'],
		},
		startDate: {
			type: Date,
			required: [true, 'Please add a start date'],
		},
		endDate: {
			type: Date,
			required: [true, 'Please add an end date'],
		},
		interval: {
			type: Number,
			required: [true, 'Please add an interval'],
			default: 1,
		},
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: [true, 'Please add a school id'],
		},
		// The array length will be breakdown property in fee structure
		scheduledDates: {
			type: [Date],
			required: false,
			default: [],
		},
	},
	{ timestamps: true }
);

module.exports = model('FeeSchedule', feeScheduleSchema);
