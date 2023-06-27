const mongoose = require('mongoose');

// New previous academic year mapping (2022-2023).
// If the length of receipt.items is 1, then update the receiptId(PYDDMMYY#####) and receiptType to 'PREVIOUS_BALANCE'.

module.exports = {
	async up(db) {
		const feeInstallments = await db
			.collection('feeinstallments')
			.find({
				feeTypeId: {
					$in: [
						mongoose.Types.ObjectId('64565aca23b727b3b7d89772'),
						mongoose.Types.ObjectId('645693c223b727b3b7d89e58'),
						mongoose.Types.ObjectId('6456986b23b727b3b7d89f2b'),
						mongoose.Types.ObjectId('64569b9023b727b3b7d8a00a'),
						mongoose.Types.ObjectId('6457305b23b727b3b7d8a4d5'),
						mongoose.Types.ObjectId('6457397b23b727b3b7d8a668'),
						mongoose.Types.ObjectId('64573ba723b727b3b7d8a72a'),
						mongoose.Types.ObjectId('64573ddd23b727b3b7d8a7e6'),
						mongoose.Types.ObjectId('64573fb623b727b3b7d8a8ac'),
						mongoose.Types.ObjectId('645c83ec23b727b3b7d8c83c'),
						mongoose.Types.ObjectId('646c5b5d507a1e1f0a70de8e'),
						mongoose.Types.ObjectId('6475e07717550b6b61dcf795'),
						mongoose.Types.ObjectId('6475edfb17550b6b61dcfa42'),
						mongoose.Types.ObjectId('647b24c5ecb0e33e17a863ac'),
						mongoose.Types.ObjectId('64807f21ecb0e33e17a8cae5'),
						mongoose.Types.ObjectId('6482a918ecb0e33e17a8f288'),
						mongoose.Types.ObjectId('648fe1364dcd693bac7bce48'),
					],
				},
				totalAmount: {
					$gt: 0,
				},
			})
			.toArray();

		// If paid amount is 0, then create previous balance object.
		const Operations = feeInstallments.map(async feeInstallment => {
			const {
				studentId,
				feeTypeId,
				totalAmount,
				_id,
				netAmount,
				paidAmount,
				sectionId,
				academicYearId,
				paidDate = null,
			} = feeInstallment;
			const receiptId = null;
			const studentInfo = await db
				.collection('students')
				.findOne({ _id: mongoose.Types.ObjectId(studentId) });
			const { name, username, parentId, gender } = studentInfo;
			const parentInfo = await db
				.collection('parents')
				.findOne({ _id: mongoose.Types.ObjectId(parentId) });
			const parentName = parentInfo?.name || `${name} Parent`;
			const previousBalance = {
				isEnrolled: true,
				studentId,
				studentName: name,
				parentName,
				status: 'Due',
				username,
				gender,
				sectionId,
				academicYearId,
				totalAmount,
				paidAmount,
				dueAmount: totalAmount - paidAmount,
			};
			if (paidAmount > 0) {
				previousBalance.status = paidAmount === totalAmount ? 'Paid' : 'Due';
				previousBalance.lastPaidDate = paidDate;
				const feereceipts = await db
					.collection('feereceipts')
					.find({ 'items.installmentId': mongoose.Types.ObjectId(_id) })
					.toArray();

				if (feereceipts.length) {
					if (feereceipts.length > 1) {
						for (const { _id: receipt, items } of feereceipts) {
							if (items.length === 1) {
								const typeChange = 'PREVIOUS_BALANCE';
								await db.collection('feereceipts').updateOne(
									{ _id: mongoose.Types.ObjectId(receipt) },
									{
										$set: {
											receiptType: typeChange,
										},
									}
								);
							}
						}
					} else {
						previousBalance.receiptId = [
							mongoose.Types.ObjectId(feereceipts[0]._id),
						];
					}
				}
			}
			await db.collection('previousfeesbalances').insertOne(previousBalance);
		});

		return Promise.all(Operations);
	},

	async down(db, client) {
		return Promise.resolve('ok');
	},
};
