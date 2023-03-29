const mongoose = require('mongoose');

const { Schema } = mongoose;

const discountSchema = new Schema(
	{
		discountName: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		discountType: {
			type: String,
			enum: ['FeeDiscount', 'Scholarship'],
			required: true,
		},
		feeTypeId: {
			type: Schema.Types.ObjectId,
			ref: 'FeeType',
			required: true,
		},
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
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
			required: false,
			default: false,
		},
		appliedTo: {
			type: [
				{
					studentId: {
						type: Schema.Types.ObjectId,
						ref: 'Student',
						required: true,
					},
					sectionId: {
						type: Schema.Types.ObjectId,
						ref: 'Section',
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
						required: false,
						default: false,
					},
				},
			],
			default: [],
		},
		approvedOn: {
			type: Date,
			required: false,
		},
		approvedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: false,
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model('Discount', discountSchema);
