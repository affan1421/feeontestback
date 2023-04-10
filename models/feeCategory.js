const { Schema, model } = require('mongoose');
const { academicYearPlugin } = require('../middleware/academicYear');

const feeCategorySchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
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
		description: {
			type: String,
			trim: true,
			default: '',
		},
	},
	{
		timestamps: true,
	}
);

feeCategorySchema.plugin(academicYearPlugin, {
	refPath: 'academicYearId',
});

module.exports = model('FeeCategory', feeCategorySchema);
