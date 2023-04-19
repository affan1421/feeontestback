const mongoose = require('mongoose');
const mongoose_delete = require('mongoose-delete');
const {
	addAcademicYearId,
	filterByActiveAcademicYearMiddleware,
} = require('../middleware/academicYear');

const { Schema } = mongoose;

const classSchema = new Schema({
	feeTypeId: {
		type: String,
		required: true,
	},
	breakdown: {
		type: Number,
		required: true,
	},
	totalFee: {
		type: Number,
		required: true,
	},
	sectionId: {
		type: String,
		required: true,
	},
	feeStructureId: {
		type: String,
		required: true,
	},
	categoryId: {
		type: String,
		required: true,
	},
	isPercentage: {
		type: Boolean,
		required: true,
	},
	value: {
		type: Number,
		required: true,
	},
	discountAmount: {
		type: Number,
		required: true,
	},
});

const discountSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			required: false,
			default: '',
		},
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: true,
		},
		academicYearId: {
			type: Schema.Types.ObjectId,
			ref: 'AcademicYear',
			required: false,
		},
		budgetAllocated: {
			type: Number,
			required: false,
			default: 0,
		},
		budgetRemaining: {
			type: Number,
			required: false,
			default: 0,
		},
		classList: {
			type: [classSchema],
			required: false,
			default: [],
		},
		totalStudents: {
			type: Number,
			required: false,
			default: 0,
		},
		totalApproved: {
			type: Number,
			required: false,
			default: 0,
		},
		totalPending: {
			type: Number,
			required: false,
			default: 0,
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
	},
	{ timestamps: true }
);

discountSchema.pre('save', addAcademicYearId);
discountSchema.pre('aggregate', filterByActiveAcademicYearMiddleware);
discountSchema.pre('findOne', filterByActiveAcademicYearMiddleware);
discountSchema.pre('findOneAndUpdate', filterByActiveAcademicYearMiddleware);

discountSchema.plugin(mongoose_delete, {
	deletedAt: true,
	overrideMethods: true,
	deletedBy: true,
});

module.exports = mongoose.model('DiscountCategory', discountSchema);
