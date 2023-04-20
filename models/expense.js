const { Schema, model } = require('mongoose');
const mongoose_delete = require('mongoose-delete');

const expenseSchema = new Schema(
	{
		reason: {
			type: String,
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
			enum: ['UPI', 'Net Banking', 'Cheque', 'NEFT', 'Cash'],
		},
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: true,
		},
		expenseType: {
			type: Schema.Types.ObjectId,
			ref: 'ExpenseType',
			required: true,
		},
		// userId: {
		// 	type: Schema.Types.ObjectId,
		// 	ref: 'User', // change model name if wrong
		// 	required: true,
		// },
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

module.exports = model('Expense', expenseSchema);
