const mongoose = require('mongoose');
const { academicYearPlugin } = require('../middleware/academicYear');

const { Schema, model } = mongoose;

const feeScheduleSchema = new Schema(
	{
		scheduleName: {
			type: String,
			required: [true, 'Please add a schedule name'],
			trim: true,
		},
		description: {
			type: String,
			required: [false, 'Please add a description'],
			default: '',
			trim: true,
		},
		academicYearId: {
			type: Schema.Types.ObjectId,
			ref: 'AcademicYear',
			required: [false, 'Please add an academic year id'],
		},
		day: {
			type: Number,
			required: [true, 'Please add a day'],
		},
		months: {
			type: [Number],
			required: [true, 'Please add months'],
		},
		categoryId: {
			type: Schema.Types.ObjectId,
			ref: 'FeeCategory',
			required: [true, 'Please add a category id'],
		},
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

feeScheduleSchema.plugin(academicYearPlugin, {
	refPath: 'academicYearId',
});

module.exports = model('FeeSchedule', feeScheduleSchema);
