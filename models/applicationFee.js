// Require mongoose and mongoose schema
const { Schema, model } = require('mongoose');
const mongoose_delete = require('mongoose-delete');

const applicationFeeSchema = new Schema(
	{
		student: {
			name: {
				type: String,
				required: [true, 'student name is required'],
			},
			class: {
				name: {
					type: String,
					required: [true, 'class name is required'],
				},
				classId: {
					type: Schema.Types.ObjectId,
					ref: 'Class',
					required: [true, 'classId is required'],
				},
			},
		},
		parent: {
			name: {
				type: String,
				required: [true, 'parent name is required'],
			},
			mobile: {
				type: Number,
				required: [true, 'Parent mobile is required'],
			},
		},
		course: String,
		amount: {
			type: Number,
			required: [true, 'Amount Is Required'],
		},
		academicYear: {
			name: {
				type: String,
				required: [true, 'academic year is required'],
			},
			academicYearId: {
				type: Schema.Types.ObjectId,
				ref: 'AcademicYear',
				required: [true, 'academicYearId is required'],
			},
		},
		school: {
			name: {
				type: String,
				required: [true, 'school name is required'],
			},
			address: {
				type: String,
				required: [true, 'school address is required'],
			},
			schoolId: {
				type: Schema.Types.ObjectId,
				ref: 'School',
				required: [true, 'schoolId is required'],
			},
		},
		// receipt details
		receiptId: {
			type: String,
			required: [true, 'Reciept id is required'],
		},
		accountType: {
			type: String,
			enum: ['Income', 'Expense', 'Revenue'],
			default: 'Revenue',
		},
		issueDate: Date,
		payment: {
			method: {
				type: String,
				enum: ['Cash', 'UPI'],
			},
		},
		item: [
			{
				feeTypeId: {
					feeType: {
						type: String,
						required: true,
					},
				},
				netAmount: Number,
				paidAmount: Number,
			},
		],
	},
	{ timestamps: true }
);

// index schoolId and academicYearId
applicationFeeSchema.index({
	'school.schoolId': 1,
	'academicYear.academicYearId': 1,
});

// soft delete plugin
applicationFeeSchema.plugin(mongoose_delete, {
	deletedAt: true,
	deletedBy: true,
	overrideMethods: true,
});

module.exports = model('ApplicationFee', applicationFeeSchema);
