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
		sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true }, // filter
		schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true }, // filter
		studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true }, // filter
		date: { type: Date, required: true },
		totalAmount: { type: Number, required: true },
		discountId: { type: Schema.Types.ObjectId, ref: 'Discount' }, // populate
		discountAmount: { type: Number, required: false },
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

FeeInstallmentSchema.plugin(mongoose_delete, {
	deletedAt: true,
	overrideMethods: true,
	deletedBy: true, // pass userid as option
	// const options = { deletedBy: userId };
	// const result = await Model.deleteOne({ _id: id }, options);
});

module.exports = model('FeeInstallment', FeeInstallmentSchema);
