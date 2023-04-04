const mongoose = require('mongoose');
const ErrorResponse = require('../utils/errorResponse');

const academicYearPlugin = function (schema, options) {
	const academicYearModelName = 'AcademicYear';

	async function filterByActiveAcademicYearMiddleware(next) {
		const { schoolId } = this._conditions;
		console.log('schoolId - findOne', this._conditions);
		const activeAcademicYear = await mongoose
			.model(academicYearModelName)
			.findOne({ isActive: true, schoolId })
			.lean();

		if (!activeAcademicYear)
			return next(new ErrorResponse('Please Select An Academic Year', 400));

		const activeAcademicYearId = activeAcademicYear._id;

		const filter = {
			$and: [
				{ [options.refPath]: activeAcademicYearId },
				this._conditions || {},
			],
		};

		this._conditions = filter;

		next();
	}

	async function filterAggregatedAcademicYear(next) {
		const { schoolId } = this._pipeline[0].$facet.data[0].$match;
		console.log('pipeline', schoolId);
		const activeAcademicYear = await mongoose
			.model(academicYearModelName)
			.findOne({ isActive: true, schoolId })
			.lean();

		if (!activeAcademicYear)
			return next(new ErrorResponse('Please Select An Academic Year', 400));

		const activeAcademicYearId = activeAcademicYear._id;

		const filter = {
			$match: {
				[options.refPath]: activeAcademicYearId,
			},
		};

		if (this._pipeline.length > 0) {
			this._pipeline.unshift(filter);
		} else {
			this._pipeline.push(filter);
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

			if (!activeAcademicYear)
				return next(new ErrorResponse('Please Select An Academic Year', 400));

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
			schema.pre('aggregate', filterAggregatedAcademicYear);
		}
	});
};

module.exports = academicYearPlugin;
