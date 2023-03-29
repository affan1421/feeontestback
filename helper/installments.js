const mongoose = require('mongoose');
const flatted = require('flatted');
const FeeInstallments = require('../models/feeInstallment');

const args = process.argv.slice(2);

const feeDetails = flatted.parse(args[0]);
const studentList = flatted.parse(args[1]);
const feeStructure = args[2];
const schoolId = args[3];
const academicYear = args[4];

async function insertFeeInstallments() {
	// Connect to the database
	await mongoose.connect(process.env.MONGO_URI);

	try {
		// Create an array of fee installments to be inserted into the database.
		const feeInstallments = [];
		for (const fee of feeDetails) {
			const { feeTypeId, scheduleTypeId } = fee;
			for (const scheduledDate of fee.scheduledDates) {
				const { date, amount } = scheduledDate;
				const newFee = {
					feeTypeId,
					scheduleTypeId,
					academicYear,
					scheduledDate: date,
					totalAmount: amount,
					schoolId,
					netAmount: amount,
				};
				feeInstallments.push(newFee);
			}
		}

		// Insert the fee installments into the database using a bulk insert operation.
		const feeInstallmentsByStudent = studentList.map(student => {
			const feeInstallmentsForStudent = feeInstallments.map(fee => ({
				studentId: student._id,
				feeStructureId: feeStructure,
				sectionId: student.section,
				feeTypeId: fee.feeTypeId,
				date: fee.scheduledDate,
				scheduleTypeId: fee.scheduleTypeId,
				academicYear: fee.academicYear,
				scheduledDate: fee.scheduledDate,
				totalAmount: fee.totalAmount,
				schoolId: fee.schoolId,
				netAmount: fee.netAmount,
			}));
			return feeInstallmentsForStudent;
		});

		const flattenedFeeInstallments = feeInstallmentsByStudent.flat();

		await FeeInstallments.insertMany(flattenedFeeInstallments);
	} catch (err) {
		console.error('Error while inserting data:', err);
	} finally {
		// Disconnect from the database
		await mongoose.disconnect();
	}
}

insertFeeInstallments();
