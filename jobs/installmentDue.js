const cron = require('node-cron');
const FeeInstallment = require('../models/feeInstallment');

// Update the status of Fee Installment every 24 hours at 12:00 AM.
cron.schedule('0 0 * * *', async () => {
	const today = new Date();
	const feeInstallments = await FeeInstallment.find({
		date: today,
		status: 'Pending',
	});

	const promises = feeInstallments.map(async feeInstallment => {
		feeInstallment.status = 'Due';
		await feeInstallment.save();
	});

	await Promise.allSettled(promises);

	const rejectedPromises = promises.filter(p => p.status === 'rejected');

	if (rejectedPromises.length > 0) {
		console.error(
			`Error while updating Fee Installment status: ${rejectedPromises[0].reason.message}`
		);
	}
});
