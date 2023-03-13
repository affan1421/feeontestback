const mongoose = require('mongoose');

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
		schoolId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'School',
			required: [true, 'Please enter school id'],
		},
	},
	{ timestamps: true }
);

const Feetype = mongoose.model('Feetype', feetypeSchema);

module.exports = Feetype;
