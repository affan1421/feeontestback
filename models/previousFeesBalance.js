const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const previousBalanceSchema = new Schema({
	isEnrolled: {
		type: Boolean,
		required: true,
	},
	dueDate: {
		type: Date,
		default: Date.now(),
	},
	schoolId: {
		type: Schema.Types.ObjectId,
		ref: 'School',
		required: true,
	},
	studentId: {
		type: Schema.Types.ObjectId,
		ref: 'Student',
	},
	studentName: {
		type: String,
		required: true,
	},
	parentName: {
		type: String,
		required: true,
	},
	status: {
		type: String,
		required: true,
	},
	username: {
		type: String,
		required: true,
	},
	gender: {
		type: String,
		required: true,
	},
	sectionId: {
		type: Schema.Types.ObjectId,
		ref: 'Section',
		required: true,
	},
	academicYearId: {
		type: Schema.Types.ObjectId,
		ref: 'AcademicYear',
		required: true,
	},
	pendingAmount: {
		type: Number,
		required: true,
	},
	receiptId: {
		type: Schema.Types.ObjectId,
		ref: 'FeeReceipt',
	},
});

const previousFeesBalance = model('previousFeesBalance', previousBalanceSchema);

module.exports = previousFeesBalance;
