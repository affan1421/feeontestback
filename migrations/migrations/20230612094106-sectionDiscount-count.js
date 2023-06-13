const mongoose = require('mongoose');

module.exports = {
	async up(db) {
		const sectionDiscounts = await db
			.collection('sectiondiscounts')
			.find({})
			.toArray();

		const operations = sectionDiscounts.map(sectionDiscount => {
			const { feeStructureId, sectionId, discountId } = sectionDiscount;
			return db
				.collection('feeinstallments')
				.aggregate([
					{
						$match: {
							feeStructureId: mongoose.Types.ObjectId(feeStructureId),
							sectionId: mongoose.Types.ObjectId(sectionId),
							'discounts.discountId': mongoose.Types.ObjectId(discountId),
						},
					},
					{
						$unwind: {
							path: '$discounts',
							preserveNullAndEmptyArrays: true,
						},
					},
					{
						$match: {
							'discounts.discountId': mongoose.Types.ObjectId(discountId),
						},
					},
					{
						$group: {
							_id: '$studentId',
							firstDoc: {
								$first: '$$ROOT',
							},
						},
					},
					{
						$project: {
							studentId: '$_id',
							approvedCount: {
								$cond: [
									{
										$eq: ['$firstDoc.discounts.status', 'Approved'],
									},
									1,
									0,
								],
							},
							pendingCount: {
								$cond: [
									{
										$eq: ['$firstDoc.discounts.status', 'Pending'],
									},
									1,
									0,
								],
							},
						},
					},
					{
						$group: {
							_id: null,
							totalStudents: {
								$sum: 1,
							},
							pendingCount: {
								$sum: '$pendingCount',
							},
							approvedCount: {
								$sum: '$approvedCount',
							},
						},
					},
				])
				.toArray()
				.then(data => {
					if (data.length) {
						console.log('data', data);
						// update the section discount for the total students, approved students and pending students
						const { totalStudents, approvedCount, pendingCount } = data[0];
						db.collection('sectiondiscounts').updateOne(
							{
								_id: mongoose.Types.ObjectId(sectionDiscount._id),
							},
							{
								$set: {
									totalStudents,
									totalApproved: approvedCount,
									totalPending: pendingCount,
								},
							}
						);
					}
				});
		});

		return Promise.all(operations);
	},

	async down(db, client) {
		// Nothing
		return Promise.resolve('ok');
	},
};
