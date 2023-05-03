// Application Fee with student details and receipt details
// ***********************************************************
// {
//     name: string;
//     classId: string;
//     className: string;
//     parentName: string;
//     phoneNumber: number;
//     course: string;
//     amount: number;
//     schoolId: string;
// }

// Require mongoose and mongoose schema
const { Schema, model } = require('mongoose');

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
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: true,
		},
		// receipt details
		receiptNumber: Number,
		receiptDate: Date,
		paymentMode: {
			type: String,
			enum: ['Cash', 'UPI'],
		},
	},
	{ timestamps: true }
);

module.exports = model('ApplicationFee', applicationFeeSchema);
