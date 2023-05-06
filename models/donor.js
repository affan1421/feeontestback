const { Schema, model } = require('mongoose');
const mongoose_delete = require('mongoose-delete');

const donorSchema = new Schema(
	{
		name: {
			type: String,
		},
		email: {
			type: String,
		},
		address: {
			type: String,
		},
		contactNumber: {
			type: Number,
		},
		IFSC: {
			type: String,
		},
		bank: {
			type: String,
		},
		accountNumber: {
			type: Number,
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
		donorType: {
			type: String,
			enum: ['Individual', 'Trust', 'Company'],
			required: [true, 'Please enter donor type'],
		},
		studentList: {
			type: [
				{
					amount: Number,
					date: Date,
					paymentType: String,
					studentId: {
						type: Schema.Types.ObjectId,
						ref: 'Student',
					},
					classId: {
						type: Schema.Types.ObjectId,
						ref: 'Class',
					},
				},
			],
			default: [],
		},
	},
	{ timestamps: true }
);

const options = {
	deletedAt: true,
	overrideMethods: true,
	deletedBy: true,
};

donorSchema.plugin(mongoose_delete, options);

const Donor = model('Donor', donorSchema);

module.exports = Donor;