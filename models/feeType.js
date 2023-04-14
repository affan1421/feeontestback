const { Schema, model } = require('mongoose');
const mongoose_delete = require('mongoose-delete');
const { academicYearPlugin } = require('../middleware/academicYear');

const feetypeSchema = new Schema(
	{
		feeType: {
			type: String,
			required: [true, 'Please enter feetype name'],
			trim: true,
		},
		description: {
			type: String,
			required: [false, 'Please enter feetype description'],
			default: '',
			trim: true,
		},
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
		accountType: {
			type: String,
			enum: [
				'Savings',
				'Current',
				'FixedDeposit',
				'Assets',
				'Liabilities',
				'Equity',
				'Revenue',
				'Expenses',
				'Debits',
				'Credits',
				'AccountsPayable',
				'AccountsReceivable',
				'Cash',
			],
			required: [true, 'Please enter account type'],
		},
		categoryId: {
			type: Schema.Types.ObjectId,
			ref: 'FeeCategory',
			required: [true, 'Please enter category id'],
		},
		academicYearId: {
			type: Schema.Types.ObjectId,
			ref: 'AcademicYear',
			required: [false, 'Please enter academic year id'],
		},
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: [true, 'Please enter school id'],
		},
	},
	{ timestamps: true }
);

feetypeSchema.plugin(mongoose_delete, {
	deletedAt: true,
	overrideMethods: true,
});

feetypeSchema.plugin(academicYearPlugin, { refPath: 'academicYearId' });

const Feetype = model('Feetype', feetypeSchema);

module.exports = Feetype;
