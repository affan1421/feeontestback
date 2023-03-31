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
		day: {
			type: Number,
			required: [true, 'Please add a day'],
		},
		months: {
			type: [Number],
			required: [true, 'Please add months'],
		},
		// TODO: Remove this property as it is not needed
		// scheduleType: {
		// 	type: String,
		// 	required: [true, 'Please add a schedule type'],
		// 	enum: ['Monthly', 'Yearly'],
		// },
		// TODO: Remove this property as it is not needed
		// startDate: {
		// 	type: Date,
		// 	required: [true, 'Please add a start date'],
		// },
		// TODO: Remove this property as it is not needed
		// endDate: {
		// 	type: Date,
		// 	required: [true, 'Please add an end date'],
		// },
		// TODO: Remove this property as it is not needed
		// interval: {
		// 	type: Number,
		// 	required: [false, 'Please add an interval'],
		// 	default: 1,
		// },
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: [true, 'Please add a school id'],
		},
		// The array will be received as date string from frontend
		scheduledDates: {
			type: [Date],
			required: false,
			default: [],
		},
	},
	{ timestamps: true }
);

module.exports = model('FeeSchedule', feeScheduleSchema);
