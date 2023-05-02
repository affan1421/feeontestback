const { Schema, model } = require('mongoose');

const feeRecieptSchema = new Schema(
	{
		student: {
			name: {
				type: String,
				required: [true, 'student name is required'],
			},
			studentId: {
				type: Schema.Types.ObjectId,
				ref: 'Student',
				required: [true, 'studentid is required'],
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
		category: {
			feeCategoryId: {
				type: Schema.Types.ObjectId,
				ref: 'FeeCategory',
				required: [true, 'Fee category is required'],
			},
			name: {
				type: String,
				required: [true, 'Fee category name is required'],
			},
		},
		recieptId: {
			type: String,
			required: [true, 'Reciept id is required'],
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
			parentId: {
				type: Schema.Types.ObjectId,
				ref: 'Parent',
				required: [true, 'parentid is required'],
			},
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
		totalAmount: {
			type: Number,
			required: [true, 'total amount is required'],
		},
		paidAmount: {
			type: Number,
			required: [true, 'paid amount is required'],
		},
		dueAmount: {
			type: Number,
			required: [true, 'due amount is required'],
		},
		payment: {
			method: {
				type: String,
				enum: [
					'CASH',
					'CHEQUE',
					'ONLINE_TRANSFER',
					'UPI',
					'DD',
					'DEBIT_CARD',
					'CREDIT_CARD',
				],
				required: [true, 'payment method is required'],
			},
			bankName: String,
			chequeDate: Date,
			chequeNumber: Number,
			transactionDate: Date,
			transactionId: String,
			upiId: String,
			payerName: String,
			ddNumber: Number,
			ddDate: Date,
		},
		issueDate: {
			type: Date,
		},
		items: {
			type: [
				{
					installmentId: {
						type: Schema.Types.ObjectId,
						ref: 'FeeInstallment',
					},
					feeTypeId: {
						type: Schema.Types.ObjectId,
						ref: 'Feetype',
					},
					netAmount: Number,
					paidAmount: Number,
				},
			],
			default: [],
		},
	},
	{
		timestamps: true,
	}
);

module.exports = model('FeeReciept', feeRecieptSchema);
