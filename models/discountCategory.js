const mongoose = require('mongoose');

const { Schema } = mongoose;

const discountSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
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
		budgetAllocated: {
			type: Number,
			required: true,
		},
		budgetRemaining: {
			type: Number,
			required: true,
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
	},
	{ timestamps: true }
);

module.exports = mongoose.model('DiscountCategory', discountSchema);
