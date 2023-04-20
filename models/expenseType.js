const { Schema, model } = require('mongoose');
const mongoose_delete = require('mongoose-delete');

const expenseTypeSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: true,
		},
		userId: {
			type: Schema.Types.ObjectId,
			ref: 'User', // change model name if wrong
			required: true,
		},
		budget: {
			type: Number,
		},
		remainignBudget: {
			type: Number,
		},
	},
	{
		timestamps: true,
	}
);

expenseTypeSchema.plugin(mongoose_delete, {
	deletedAt: true,
	deletedBy: true,
	overrideMethods: true,
});

module.exports = model('ExpenseType', expenseTypeSchema);
