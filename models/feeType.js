const mongoose = require('mongoose');
const { academicYearPlugin } = require('../middleware/academicYear');

const feetypeSchema = new mongoose.Schema(
	{
		feeType: {
			type: String,
			required: [true, 'Please enter feetype name'],
		},
		description: {
			type: String,
			required: [true, 'Please enter feetype description'],
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
		academicYearId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'AcademicYear',
			required: [false, 'Please enter academic year id'],
		},
		schoolId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'School',
			required: [true, 'Please enter school id'],
		},
	},
	{ timestamps: true }
);

feetypeSchema.plugin(academicYearPlugin, { refPath: 'academicYearId' });

const Feetype = mongoose.model('Feetype', feetypeSchema);

module.exports = Feetype;
