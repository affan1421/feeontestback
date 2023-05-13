const mongoose = require('mongoose');
const moment = require('moment');

module.exports = {
	async up(db, client) {
		// TODO write your migration here.
		// find all schools
		const schools = await db
			.collection('schools')
			.find({ _id: mongoose.Types.ObjectId('6288adebe5eff0eb57fce8ad') })
			.toArray();
		const operations = await Promise.all(
			schools.map(async school => {
				const applicationFee = await db
					.collection('applicationfees')
					.find({ 'receipt.school.schoolId': school._id })
					.toArray();

				if (applicationFee.length > 0) {
					console.log(school._id, school.name, applicationFee.length);
					let lastReceipt = await db
						.collection('feereceipts')
						.find({ 'school.schoolId': school._id })
						.sort({ createdAt: -1 })
						.limit(1)
						.toArray();
					let newCount = '00001';

					lastReceipt = lastReceipt[0] ?? null;
					if (lastReceipt && lastReceipt.receiptId) {
						newCount = lastReceipt.receiptId // 00006
							.slice(-5)
							.replace(/\d+/, n => String(Number(n)).padStart(n.length, '0'));
					}

					const feeTypeId = mongoose.Types.ObjectId();
					const curAcYr = await db
						.collection('academicyears')
						.findOne({ schoolId: school._id, isActive: true });

					await db.collection('feetypes').insertOne({
						_id: feeTypeId,
						feeType: 'Application Fee',
						accountType: 'Revenue',
						schoolId: school._id,
						description: 'Application Fee',
						academicYearId: curAcYr._id,
						isMisc: true,
					});

					for (const appFee of applicationFee) {
						newCount = String(Number(newCount) + 1).padStart(5, '0');
						const date = moment(appFee.createdAt).format('DDMMYY');
						const unireceiptId = `AP${date}${newCount}`;

						const receiptId = mongoose.Types.ObjectId();
						const { receipt } = appFee;
						receipt.items[0].feeTypeId = feeTypeId;
						receipt.payment.method = 'CASH';

						await db.collection('applicationfees').updateOne(
							{ _id: appFee._id },
							{
								$set: {
									schoolId: school._id,
									receiptId,
									course: appFee.course ?? '',
									academicYearId: curAcYr._id,
									feeTypeId,
									createdAt: appFee.createdAt,
									updatedAt: appFee.updatedAt,
								},
							}
						);
						console.log('receipt', unireceiptId);
						await db.collection('feereceipts').insertOne({
							_id: receiptId,
							deleted: false,
							receiptId: unireceiptId,
							receiptType: 'APPLICATION',
							totalAmount: appFee.amount,
							paidAmount: appFee.amount,
							createdAt: appFee.createdAt,
							updatedAt: appFee.updatedAt,
							dueAmount: 0,
							...receipt,
						});
					}
				}
			})
		);
	},

	async down(db, client) {
		// TODO write the statements to rollback your migration (if possible)
		// Example:
		// await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
	},
};
