// Require mongoose and mongoose schema
const { Schema, model } = require('mongoose');
const mongoose_delete = require('mongoose-delete');

const applicationFeeSchema = new Schema(
	{
		studentName: {
			type: String,
			required: true,
			trim: [true, 'Student Name Is Required'],
		},
		classId: {
			type: Schema.Types.ObjectId,
			ref: 'Class',
			required: true,
		},
		className: String,
		parentName: {
			type: String,
			required: [true, 'Parent Name Is Required'],
			trim: true,
		},
		phoneNumber: {
			type: Number,
			required: [true, 'Phone Number Is Required'],
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
		paymentMode: {
			type: String,
			enum: ['Cash', 'UPI'],
		},
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
