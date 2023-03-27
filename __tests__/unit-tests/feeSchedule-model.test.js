/* eslint-disable no-undef */
const mongoose = require('mongoose');
const FeeSchedule = require('../../models/feeSchedule');

describe('FeeSchedule Model', () => {
	it('should be invalid if required fields are empty', () => {
		const feeSchedule = new FeeSchedule();

		const error = feeSchedule.validateSync();
		expect(error.errors.scheduleName.message).toEqual(
			'Please add a schedule name'
		);
		expect(error.errors.scheduleType.message).toEqual(
			'Please add a schedule type'
		);
		expect(error.errors.startDate.message).toEqual('Please add a start date');
		expect(error.errors.endDate.message).toEqual('Please add an end date');
		expect(error.errors.schoolId.message).toEqual('Please add a school id');
	});

	it('should be invalid if scheduleType is not one of the allowed enum values', () => {
		const feeSchedule = new FeeSchedule({
			scheduleName: 'Tuition Fees',
			description: 'Tuition fees for the academic year',
			scheduleType: 'Invalid',
			startDate: new Date('2023-04-01'),
			endDate: new Date('2023-12-31'),
			interval: 1,
			schoolId: mongoose.Types.ObjectId(),
			scheduledDates: [],
		});

		const error = feeSchedule.validateSync();
		expect(error.errors.scheduleType.message).toEqual(
			'`Invalid` is not a valid enum value for path `scheduleType`.'
		);
	});

	it('should be valid if all required fields are provided', () => {
		const feeSchedule = new FeeSchedule({
			scheduleName: 'Tuition Fees',
			description: 'Tuition fees for the academic year',
			scheduleType: 'Yearly',
			startDate: new Date('2023-04-01'),
			endDate: new Date('2023-12-31'),
			interval: 1,
			schoolId: mongoose.Types.ObjectId(),
			scheduledDates: [],
		});

		const error = feeSchedule.validateSync();
		expect(error).toBeUndefined();
	});

	it('should be valid if description field is missing', () => {
		const feeSchedule = new FeeSchedule({
			scheduleName: 'Tuition Fees',
			scheduleType: 'Monthly',
			startDate: new Date('2023-04-01'),
			endDate: new Date('2023-12-31'),
			interval: 1,
			schoolId: mongoose.Types.ObjectId(),
			scheduledDates: [],
		});

		const error = feeSchedule.validateSync();
		expect(error).toBeUndefined();
	});

	it('should be valid if interval field is missing', () => {
		const feeSchedule = new FeeSchedule({
			scheduleName: 'Tuition Fees',
			description: 'Tuition fees for the academic year',
			scheduleType: 'Yearly',
			startDate: new Date('2023-04-01'),
			endDate: new Date('2023-12-31'),
			schoolId: mongoose.Types.ObjectId(),
			scheduledDates: [],
		});

		const error = feeSchedule.validateSync();
		expect(error).toBeUndefined();
	});

	it('should be valid if scheduledDates field is missing', () => {
		const feeSchedule = new FeeSchedule({
			scheduleName: 'Tuition Fees',
			description: 'Tuition fees for the academic year',
			scheduleType: 'Yearly',
			startDate: new Date('2023-04-01'),
			endDate: new Date('2023-12-31'),
			interval: 1,
			schoolId: mongoose.Types.ObjectId(),
		});

		const error = feeSchedule.validateSync();
		expect(error).toBeUndefined();
	});
});
