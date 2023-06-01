const { Schema, model } = require('mongoose');
const mongoose_delete = require('mongoose-delete');

const feeReceiptSchema = new Schema(
	{
		student: {
			name: {
				type: String,
				required: [true, 'student name is required'],
			},
			studentId: {
				type: Schema.Types.ObjectId,
				ref: 'Student',
				required: [false, 'studentid is required'],
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
			section: {
				name: {
					type: String,
					required: [false, 'Section is required'],
				},
				sectionId: {
					type: Schema.Types.ObjectId,
					ref: 'Section',
					required: [false, 'sectionId is required'],
				},
			},
		},
		comments: String,
		category: {
			feeCategoryId: {
				type: Schema.Types.ObjectId,
				ref: 'FeeCategory',
				required: [false, 'Fee category is required'],
			},
			name: {
				type: String,
				required: [false, 'Fee category name is required'],
			},
		},
		receiptId: {
			type: String,
			required: [true, 'Receipt id is required'],
		},
		receiptType: {
			type: String,
			required: [true, 'Receipt type is required'],
			default: 'ACADEMIC',
			enum: ['ACADEMIC', 'APPLICATION', 'MISCELLANEOUS'],
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
				required: [false, 'parentid is required'],
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

// index classId, academicYearId, schoolId

feeReceiptSchema.index({
	'academicYear.academicYearId': 1,
	'school.schoolId': 1,
});

// index the student.name field as search text
feeReceiptSchema.index({ 'student.name': 'text' });

feeReceiptSchema.plugin(mongoose_delete, {
	deletedAt: true,
	deletedBy: true,
	overrideMethods: 'all',
});

module.exports = model('FeeReceipt', feeReceiptSchema);
