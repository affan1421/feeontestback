const mongoose = require('mongoose');

const { Schema, model } = mongoose;

const FeeInstallmentSchema = new Schema(
	{
		feeTypeId: { type: Schema.Types.ObjectId, ref: 'FeeType', required: true }, // populate
		scheduleTypeId: {
			type: Schema.Types.ObjectId,
			ref: 'FeeSchedule',
			required: true,
		}, // populate
		feeStructureId: { type: Schema.Types.ObjectId, ref: 'FeeStructure' }, // just for reference
		sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true }, // filter
		academicYear: { type: String, required: true }, // filter
		schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true }, // filter
		studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, // filter
		date: { type: Date, required: true },
		totalAmount: { type: Number, required: true },
		discountId: { type: Schema.Types.ObjectId, ref: 'Discount' }, // populate
		netAmount: { type: Number, required: true },
		status: {
			type: String,
			enum: ['Paid', 'Upcoming', 'Due'],
			default: 'Upcoming',
		},
		// feeReceiptId: { type: Schema.Types.ObjectId, ref: 'FeeReceipt' },
	},
	{ timestamps: true }
);

module.exports = model('FeeInstallment', FeeInstallmentSchema);
