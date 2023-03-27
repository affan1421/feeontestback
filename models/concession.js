const mongoose = require('mongoose');

const { Schema } = mongoose;

const discountSchema = new Schema({
	name: {
		type: String,
		required: true,
	},
	description: {
		type: String,
		required: true,
	},
	discountType: {
		type: String,
		enum: ['Fee Discount', 'Scholarship'],
		required: true,
	},
	feeTypeId: {
		type: Schema.Types.ObjectId,
		ref: 'FeeType',
		required: true,
	},
	amountType: {
		type: String,
		enum: ['Percentage', 'Fixed'],
		required: true,
	},
	value: {
		type: Number,
		required: true,
	},
	isApproved: {
		type: Boolean,
		required: true,
	},
	appliedTo: [
		{
			studentId: {
				type: Schema.Types.ObjectId,
				ref: 'Student',
				required: true,
			},
			studentName: {
				type: String,
				required: true,
			},
			className: {
				type: String,
				required: true,
			},
			isApproved: {
				type: Boolean,
				required: true,
			},
		},
	],
	approvedOn: {
		type: Date,
		required: true,
	},
	approvedBy: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	createdAt: {
		type: Date,
		required: true,
	},
	updatedAt: {
		type: Date,
		required: true,
	},
});

module.exports = mongoose.model('Discount', discountSchema);
