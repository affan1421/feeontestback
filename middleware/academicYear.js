const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');

const academicYearPlugin = function (schema, options) {
	const academicYearModelName = 'AcademicYear';

	async function filterByActiveAcademicYearMiddleware(next) {
		let schoolId;
		let pipeline;
		let isAggregation;

		if (this._conditions) {
			// For find and findOne
			schoolId = this._conditions.schoolId;
			isAggregation = false;
		} else if (this._pipeline) {
			// For aggregate
			const [facet] = this._pipeline.filter(stage => stage.$facet);
			const matchStage = facet?.data[0].$match || this._pipeline[0].$match;
			schoolId = matchStage.schoolId;
			pipeline = this._pipeline;
			isAggregation = true;
		}

		const activeAcademicYear = await mongoose
			.model(academicYearModelName)
			.findOne({ isActive: true, schoolId })
			.lean();

		if (!activeAcademicYear) {
			return next(new ErrorResponse('Please Select An Academic Year', 400));
		}

		const activeAcademicYearId = activeAcademicYear._id;

		const filter = {
			$match: {
				[options.refPath]: activeAcademicYearId,
			},
		};

		if (isAggregation) {
			if (pipeline.length > 0) {
				pipeline.unshift(filter);
			} else {
				pipeline.push(filter);
			}
		} else {
			const conditions = {
				$and: [{ [options.refPath]: activeAcademicYearId }, this._conditions],
			};
			this._conditions = conditions;
		}

		next();
	}

	async function addAcademicYearId(next) {
		const { schoolId } = this;
		if (!this.get('academicYearId')) {
			const activeAcademicYear = await mongoose
				.model(academicYearModelName)
				.findOne({ isActive: true, schoolId })
				.lean()
				.exec();

			if (!activeAcademicYear) {
				return next(new ErrorResponse('Please Select An Academic Year', 400));
			}

			this.academicYearId = activeAcademicYear._id;
		}

		next();
	}

	Object.keys(schema.paths).forEach(path => {
		const { ref } = schema.paths[path].options;
		if (ref && ref === academicYearModelName) {
			schema.pre('save', addAcademicYearId);
			schema.pre('find', filterByActiveAcademicYearMiddleware);
			schema.pre('findOne', filterByActiveAcademicYearMiddleware);
			schema.pre('aggregate', filterByActiveAcademicYearMiddleware);
		}
	});
};

module.exports = academicYearPlugin;
