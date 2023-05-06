const mongoose = require('mongoose');
const mongoose_delete = require('mongoose-delete');
const autoIncrement = require('mongoose-auto-increment');

autoIncrement.initialize(mongoose);

const expenseSchema = new mongoose.Schema(
	{
		reason: {
			type: String,
		},
		voucherNumber: {
			type: Number,
		},
		amount: {
			type: Number,
			required: true,
		},
		expenseDate: {
			type: Date,
			required: true,
		},
		paymentMethod: {
			type: String,
			required: true,
			enum: ['UPI', 'NetBanking', 'Cheque', 'NEFT', 'Cash'],
		},
		schoolId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'School',
			required: true,
		},
		expenseType: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'ExpenseType',
			required: true,
		},
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User', // change model name if wrong
			required: true,
		},
		approvedBy: {
			type: String,
		},
	},
	{
		timestamps: true,
	}
);

expenseSchema.plugin(mongoose_delete, {
	deletedAt: true,
	deletedBy: true,
	overrideMethods: true,
});
expenseSchema.plugin(autoIncrement.plugin, {
	model: 'Expense',
	field: 'voucherNumber',
	startAt: 100000,
});

module.exports = mongoose.model('Expense', expenseSchema);
