const mongoose = require('mongoose');

const mongoose_delete = require('mongoose-delete');

const { Schema, model } = mongoose;
// TODO: Make indexes for filters:

const FeeInstallmentSchema = new Schema(
	{
		feeTypeId: { type: Schema.Types.ObjectId, ref: 'FeeType', required: true }, // populate
		scheduleTypeId: {
			type: Schema.Types.ObjectId,
			ref: 'FeeSchedule',
			required: true,
		}, // populate
		rowId: {
			type: Schema.Types.ObjectId, // feeDetails _id
			required: true,
		}, // filter
		deleted: {
			type: Boolean,
			default: false,
		},
		deletedAt: {
			type: Date,
			default: null,
		},
		deletedBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},
		feeStructureId: {
			type: Schema.Types.ObjectId,
			ref: 'FeeStructure',
			required: true,
		}, // just for reference
		academicYearId: {
			type: Schema.Types.ObjectId,
			ref: 'AcademicYear',
			required: true,
		}, // populate
		classId: { type: Schema.Types.ObjectId, ref: 'Class', required: false },
		sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true }, // filter
		schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true }, // filter
		studentId: {
			type: Schema.Types.ObjectId,
			ref: 'Student',
			required: true,
		}, // filter
		date: { type: Date, required: true },
		paidDate: { type: Date, required: false },
		totalAmount: { type: Number, required: true },
		discounts: {
			type: [
				{
					_id: 0,
					discountId: {
						type: Schema.Types.ObjectId,
						ref: 'DiscountCategory',
						required: true,
					},
					isPercentage: { type: Boolean, required: true },
					value: { type: Number, required: true },
					discountAmount: { type: Number, required: false, default: 0 },
					status: {
						type: String,
						enum: ['Approved', 'Pending', 'Rejected'],
						default: 'Pending',
					},
				},
			],
			required: false,
			default: [],
		},
		discountAmount: { type: Number, required: false, default: 0 },
		netAmount: { type: Number, required: true },
		status: {
			type: String,
			enum: ['Paid', 'Upcoming', 'Due'],
			default: 'Upcoming',
		},
		categoryId: {
			type: Schema.Types.ObjectId,
			ref: 'FeeCategory',
			required: true,
		},
		// feeReceiptId: { type: Schema.Types.ObjectId, ref: 'FeeReceipt' },
	},
	{ timestamps: true }
);

FeeInstallmentSchema.plugin(mongoose_delete, {
	deletedAt: true,
	overrideMethods: true,
	deletedBy: true,
});

module.exports = model('FeeInstallment', FeeInstallmentSchema);
