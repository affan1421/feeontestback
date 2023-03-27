/* eslint-disable no-undef */
const mongoose = require('mongoose');
const FeeInstallment = require('../../models/feeInstallment');

describe('FeeInstallment Model', () => {
	it('should be invalid if required fields are missing', () => {
		const feeInstallment = new FeeInstallment();

		const errors = feeInstallment.validateSync();
		expect(errors.errors.sectionId.message).toEqual(
			'Path `sectionId` is required.'
		);
		expect(errors.errors.academicYear.message).toEqual(
			'Path `academicYear` is required.'
		);
		expect(errors.errors.schoolId.message).toEqual(
			'Path `schoolId` is required.'
		);
		expect(errors.errors.studentId.message).toEqual(
			'Path `studentId` is required.'
		);
		expect(errors.errors.date.message).toEqual('Path `date` is required.');
		expect(errors.errors.totalAmount.message).toEqual(
			'Path `totalAmount` is required.'
		);
		expect(errors.errors.netAmount.message).toEqual(
			'Path `netAmount` is required.'
		);
		expect(errors.errors.feeTypeId.message).toEqual(
			'Path `feeTypeId` is required.'
		);
		expect(errors.errors.scheduleTypeId.message).toEqual(
			'Path `scheduleTypeId` is required.'
		);
	});

	it('should be valid if all required fields are present', () => {
		const feeInstallment = new FeeInstallment({
			feeTypeId: mongoose.Types.ObjectId(),
			scheduleTypeId: mongoose.Types.ObjectId(),
			sectionId: mongoose.Types.ObjectId(),
			academicYear: '2022-2023',
			schoolId: mongoose.Types.ObjectId(),
			studentId: mongoose.Types.ObjectId(),
			date: new Date(),
			totalAmount: 100,
			netAmount: 80,
		});

		const errors = feeInstallment.validateSync();
		expect(errors).toBe(undefined);
	});
});
