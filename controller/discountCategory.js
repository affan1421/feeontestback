const mongoose = require('mongoose');
const DiscountCategory = require('../models/discountCategory');
const FeeInstallment = require('../models/feeInstallment');
const FeeStructure = require('../models/feeStructure');
const SectionDiscount = require('../models/sectionDiscount');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

// Create a new discount
const createDiscountCategory = async (req, res, next) => {
	try {
		const {
			name,
			description = '',
			schoolId,
			totalBudget = 0,
			budgetRemaining = 0,
			createdBy,
		} = req.body;
		if (!name || !schoolId || !totalBudget || !budgetRemaining) {
			return next(new ErrorResponse('Please Provide All Required Fields', 422));
		}
		const isExists = await DiscountCategory.findOne({
			name,
			schoolId,
		});

		if (isExists) {
			return next(new ErrorResponse(`Discount ${name} Already Exists`, 400));
		}

		const discount = await DiscountCategory.create({
			name,
			description,
			schoolId,
			totalBudget,
			budgetRemaining,
			createdBy,
		});
		res.status(201).json(SuccessResponse(discount, 1, 'Created Successfully'));
	} catch (error) {
		console.log(error.message);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

/*
TODO: Need to fetch sectionDiscount aggregation.
With the row discount data.
[{
	sectionId: 'sectionId',
	sectionName: 'sectionName',
	totalAmount: 15000',
	totalStudents: 50,
	approvedStudents: 30,
	pendingStudents: 20,
}]
*/
const getDiscountCategoryByClass = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const classList = await SectionDiscount.aggregate([
		{
			$match: {
				discountId: mongoose.Types.ObjectId(id),
			},
		},
		{
			$group: {
				_id: {
					feeStructureId: '$feeStructureId',
					categoryId: '$categoryId',
					sectionId: '$sectionId',
					sectionName: '$sectionName',
					totalStudents: '$totalStudents',
					totalApproved: '$totalApproved',
					totalPending: '$totalPending',
					totalRejected: '$totalRejected',
				},
				totalAmount: {
					$sum: '$discountAmount',
				},
				rows: {
					$addToSet: {
						feeTypeId: '$feeTypeId',
						totalAmount: '$totalAmount',
						isPercentage: '$isPercentage',
						breakdown: '$breakdown',
						value: '$value',
					},
				},
			},
		},
		{
			$unwind: {
				path: '$rows',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$lookup: {
				from: 'feetypes',
				localField: 'rows.feeTypeId',
				foreignField: '_id',
				as: 'rows.feeTypeId',
			},
		},
		{
			$group: {
				_id: '$_id',
				totalAmount: {
					$first: '$totalAmount',
				},
				rows: {
					$push: {
						feeType: {
							$first: '$rows.feeTypeId',
						},
						totalAmount: '$rows.totalAmount',
						isPercentage: '$rows.isPercentage',
						value: '$rows.value',
						breakdown: '$rows.breakdown',
					},
				},
			},
		},
		{
			$project: {
				_id: 0,
				sectionId: '$_id.sectionId',
				feeStructureId: '$_id.feeStructureId',
				categoryId: '$_id.categoryId',

				sectionName: '$_id.sectionName',
				totalStudents: '$_id.totalStudents',
				totalAmount: 1,
				totalApproved: '$_id.totalApproved',
				totalPending: '$_id.totalPending',
				totalRejected: '$_id.totalRejected',
				rows: 1,
			},
		},
	]);
	if (classList.length === 0) {
		return next(new ErrorResponse('No Classes Mapped', 404));
	}

	res
		.status(200)
		.json(SuccessResponse(classList, classList.length, 'Fetched Successfully'));
});

const getStudentsByStructure = catchAsync(async (req, res, next) => {
	const { id, structureId } = req.params;
	let students = await FeeInstallment.aggregate([
		{
			$match: {
				feeStructureId: mongoose.Types.ObjectId(structureId),
			},
		},
		{
			$group: {
				_id: '$studentId',
				totalDiscountAmount: {
					$sum: '$totalDiscountAmount',
				},
				discounts: {
					$addToSet: {
						$filter: {
							input: '$discounts',
							as: 'discount',
							cond: {
								$eq: ['$$discount.discountId', mongoose.Types.ObjectId(id)],
							},
						},
					},
				},
			},
		},
		{
			$addFields: {
				discounts: {
					$reduce: {
						input: '$discounts',
						initialValue: [],
						in: {
							$concatArrays: ['$$value', '$$this'],
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				localField: '_id',
				foreignField: '_id',
				as: 'student',
			},
		},
		{
			$unwind: '$student',
		},
		{
			$project: {
				_id: 0,
				studentName: '$student.name',
				studentId: '$student._id',
				totalDiscountAmount: 1,
				discountStatus: {
					$arrayElemAt: ['$discounts.status', 0],
				},
			},
		},
	]);
	if (students.length === 0) {
		return next(new ErrorResponse('No Discounts Found', 404));
	}
	// check if status field exists if yes then isSelected = true else false
	students = students.map(student => {
		if (student.discountStatus) {
			student.isSelected = true;
		} else {
			student.isSelected = false;
		}
		return student;
	});
	res
		.status(200)
		.json(SuccessResponse(students, students.length, 'Fetched Successfully'));
});

const getStudentsByFilter = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const { sectionId, status, page = 0, limit = 5 } = req.query;
	const query = {
		discounts: {
			$elemMatch: {
				discountId: mongoose.Types.ObjectId(id),
			},
		},
	};
	if (sectionId) {
		query.sectionId = mongoose.Types.ObjectId(sectionId);
	}
	if (status) {
		query.discounts.$elemMatch.status = status;
	}
	const students = await FeeInstallment.aggregate([
		{
			$match: query,
		},
		{
			$unwind: {
				path: '$discounts',
				preserveNullAndEmptyArrays: true,
			},
		},
		{
			$match: {
				'discounts.discountId': mongoose.Types.ObjectId(id),
			},
		},
	]);
	res
		.status(200)
		.json(SuccessResponse(students, students.length, 'Fetched Successfully'));
});

// Get all discounts
const getDiscountCategory = catchAsync(async (req, res, next) => {
	const { schoolId, page = 0, limit = 10 } = req.query;
	const query = {};
	if (schoolId) {
		query.schoolId = mongoose.Types.ObjectId(schoolId);
	}

	const discounts = await DiscountCategory.aggregate([
		{
			$facet: {
				data: [
					{ $match: query },
					{ $skip: +page * +limit },
					{ $limit: +limit },
				],
				count: [{ $match: query }, { $count: 'count' }],
			},
		},
	]);
	const { data, count } = discounts[0];

	if (count.length === 0) {
		return next(new ErrorResponse('Discounts Not Found', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(data, count[0].count, 'Fetched Successfully'));
});

const getDiscountCategoryById = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const discount = await DiscountCategory.findOne({
		id,
		schoolId: req.user.school_id,
	});
	if (!discount) {
		return next(new ErrorResponse('Discount Not Found', 404));
	}
	res.status(200).json(SuccessResponse(discount, 1, 'Fetched Successfully'));
});

const updateDiscountCategory = async (req, res, next) => {
	const { id } = req.params;
	const { name, description, totalBudget } = req.body;
	try {
		const discount = await DiscountCategory.findById(id);

		if (!discount) {
			return next(new ErrorResponse('Discount Not Found', 404));
		}
		const budgetSpent = discount.totalBudget - discount.budgetRemaining; // budgetSpent
		// Error if totalBudget < discount.totalBudget - discount.remainingBudget
		if (totalBudget < budgetSpent) {
			return next(
				new ErrorResponse(
					'Cannot Update Total Budget Less Than Budget Spent',
					400
				)
			);
		}
		// find the difference
		const difference = totalBudget - discount.totalBudget;
		// update the remaining budget
		discount.name = name;
		discount.description = description;
		discount.totalBudget = totalBudget;
		discount.budgetRemaining += difference;
		await discount.save();

		res.status(200).json(SuccessResponse(discount, 1, 'Updated Successfully'));
	} catch (error) {
		console.log(error);
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

// Delete a discount
const deleteDiscountCategory = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const discount = await DiscountCategory.findOneAndDelete(id);
	if (!discount) {
		return next(new ErrorResponse('Discount Not Found', 404));
	}
	res.status(200).json(SuccessResponse(null, 1, 'Deleted Successfully'));
});

// TODO:
/*
1. Save the discount category in the fee installment of assigned students discount array of feeInstallment: 
{
	discountId: 'discountId',
	amount: 'amount',
	isPercentage: true,
	value: 10,
}
2. Update the budget remaining of the discount category
3. Update the discount amount of the fee installment
4. Add the classList objects in the array.
{
	feeTypeId: 'feeTypeId',
	totalFee: 'totalFee',
	sectionId: 'sectionId',
	categoryId: 'categoryId',
	feeStructureId: 'feeStructureId',
	amount: 'amount',
	breakdown: 1,
	isPercentage: true,
	value: 10,
	discountAmount: 'discountAmount',
}
Payload: 
{
	sectionId: 'sectionId',
	categoryId: 'categoryId',
	rows: [{
		rowId: 'rowId',
		breakdown: 1,
		isPercentage: true,
		value: 10,
	}],
	studentList: ['studentId', 'studentId']
}
*/
const mapDiscountCategory = async (req, res, next) => {
	try {
		const { sectionId, categoryId, rows, studentList, sectionName } = req.body;
		const { discountId } = req.params;
		let discountAmount = 0;

		if (!sectionId || !categoryId || !rows || !studentList) {
			return next(new ErrorResponse('Please Provide All Required Fields', 422));
		}

		// Fetch fee details from database
		const feeStructure = await FeeStructure.findOne(
			{
				sectionId,
				categoryId,
				schoolId: req.user.school_id,
			},
			'feeDetails'
		).lean();
		const feeDetails = feeStructure.feeDetails.reduce(
			(acc, { feeTypeId, totalAmount, scheduledDates }) => {
				acc[feeTypeId] = { totalAmount, scheduledDates };
				return acc;
			},
			{}
		);

		// Process each row in parallel
		const classList = await Promise.all(
			rows.map(async ({ rowId, feeTypeId, isPercentage, value, breakdown }) => {
				if (!rowId || isPercentage === undefined || !value) {
					return next(
						new ErrorResponse('Please Provide All Required Fields', 422)
					);
				}

				const { totalAmount, scheduledDates } = feeDetails[feeTypeId];
				const tempDiscountAmount = isPercentage
					? (totalAmount * value) / 100
					: value;
				discountAmount += tempDiscountAmount;
				const calPercentage = isPercentage
					? value
					: (value * 100) / totalAmount;

				// Update discounts for all matching fee installments in a single operation

				const bulkOps = [];
				for (const { amount, date } of scheduledDates) {
					const discountToPush = {
						discountId,
						isPercentage,
						value,
						discountAmount: 0,
						status: 'Pending',
					};
					const calAmount = isPercentage
						? (amount * value) / 100
						: (amount * calPercentage) / 100;
					discountToPush.discountAmount += calAmount;

					bulkOps.push({
						updateMany: {
							filter: {
								rowId,
								studentId: { $in: studentList },
								date: new Date(date),
							},
							update: { $push: { discounts: discountToPush } },
						},
					});
				}

				await FeeInstallment.bulkWrite(bulkOps);

				// Return a summary of the discount for the row
				return {
					discountId,
					sectionId,
					sectionName,
					feeTypeId,
					categoryId,
					feeStructureId: feeStructure._id,
					totalStudents: studentList.length,
					totalPending: studentList.length,
					totalAmount, // totalAmount
					discountAmount: tempDiscountAmount,
					breakdown,
					isPercentage,
					value,
				};
			})
		);
		//  Create multiple new document in the sectionDiscount model.
		await SectionDiscount.insertMany(classList);
		// Update the total students and total pending of the discount category
		await DiscountCategory.updateOne(
			{
				_id: discountId,
			},
			{
				$inc: {
					budgetAlloted: discountAmount * studentList.length,
					totalStudents: studentList.length,
					totalPending: studentList.length,
					classesAssociated: 1,
				},
			}
		);

		res.json(SuccessResponse(null, 1, 'Mapped Successfully'));
	} catch (error) {
		return next(new ErrorResponse('Something went wrong', 500));
	}
};

const getStudentForApproval = catchAsync(async (req, res, next) => {
	const { discountId } = req.params;
	const { sectionId, status, page = 0, limit = 5 } = req.query;

	// Create payload for the query
	const payload = {
		discounts: {
			$elemMatch: {
				discountId: mongoose.Types.ObjectId(discountId),
			},
		},
	};
	if (sectionId) payload.sectionId = mongoose.Types.ObjectId(sectionId);
	if (status) payload.discounts.$elemMatch.status = status;
	// Need to push the sectionName in the student array
	// Get the aggregated data of the students from feeInstallments
	const students = await FeeInstallment.aggregate([
		{
			$match: payload,
		},
		{
			$group: {
				_id: '$studentId',
				sectionId: {
					$first: '$sectionId',
				},
				totalFees: {
					$sum: '$totalAmount',
				},
				totalDiscountAmount: {
					$sum: '$discountAmount',
				},
				totalPendingAmount: {
					$sum: {
						$reduce: {
							input: '$discounts',
							initialValue: 0,
							in: {
								$cond: [
									{
										$and: [
											{
												$eq: [
													'$$this.discountId',
													mongoose.Types.ObjectId(discountId),
												],
											},
											{
												$eq: ['$$this.status', 'Pending'],
											},
										],
									},
									'$$this.discountAmount',
									0,
								],
							},
						},
					},
				},
				totalApprovedAmount: {
					$sum: {
						$reduce: {
							input: '$discounts',
							initialValue: 0,
							in: {
								$cond: [
									{
										$and: [
											{
												$eq: [
													'$$this.discountId',
													mongoose.Types.ObjectId(discountId),
												],
											},
											{
												$eq: ['$$this.status', 'Approved'],
											},
										],
									},
									'$$this.discountAmount',
									0,
								],
							},
						},
					},
				},
			},
		},
		{
			$lookup: {
				from: 'students',
				let: {
					studentId: '$_id',
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$studentId'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							name: 1,
						},
					},
				],
				as: 'student',
			},
		},
		{
			$lookup: {
				from: 'sections',
				let: { sectionId: '$sectionId' },
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$sectionId'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							className: 1,
						},
					},
				],
				as: 'section',
			},
		},
		{
			$project: {
				_id: 0,
				studentId: '$_id',
				studentName: {
					$first: '$student.name',
				},
				sectionName: {
					$first: '$section.className',
				},
				isPending: {
					$cond: [
						{
							$gt: ['$totalPendingAmount', 0],
						},
						true,
						false,
					],
				},
				totalPendingAmount: 1,
				totalDiscountAmount: 1,
				totalApprovedAmount: 1,
				totalFees: 1,
			},
		},
	]);
	if (!students.length) {
		return next(new ErrorResponse('No Students Found', 404));
	}

	res
		.status(200)
		.json(SuccessResponse(students, students.length, 'Fetched SuccessFully'));
});

const approveStudentDiscount = async (req, res, next) => {
	const { discountId } = req.params;
	const { studentId, status, approvalAmount, sectionName } = req.body;
	try {
		const feeInstallments = await FeeInstallment.find({
			studentId: mongoose.Types.ObjectId(studentId),
			'discounts.discountId': mongoose.Types.ObjectId(discountId),
		});
		if (!feeInstallments.length) {
			return next(new ErrorResponse('No Fee Installment Found', 404));
		}
		for (const installment of feeInstallments) {
			// find the discount amount in the discounts array
			const discount = installment.discounts.find(
				d => d.discountId.toString() === discountId
			);
			if (!discount) {
				return next(new ErrorResponse('No Discount Found', 404));
			}
			if (status === 'Approved') {
				await FeeInstallment.findOneAndUpdate(
					{
						_id: installment._id,
						'discounts.discountId': discountId,
					},
					{
						$set: {
							'discounts.$.status': status,
						},
						$inc: {
							totalDiscountAmount: discount.discountAmount,
							netAmount: -discount.discountAmount,
						},
					}
				);
			} else {
				// remove that match from the discounts array
				await FeeInstallment.findOneAndUpdate(
					{
						_id: installment._id,
						'discounts.discountId': discountId,
					},
					{
						$pull: {
							discounts: {
								discountId: mongoose.Types.ObjectId(discountId),
							},
						},
					}
				);
			}
		}
		// Update the totalPending and totalApproved in DiscountCategory
		const update = {
			$inc: {
				totalPending: -1,
			},
		};
		if (status === 'Approved') {
			update.$inc.totalApproved = 1;
			update.$inc.budgetRemaining = -approvalAmount;
		} else {
			update.$inc.budgetAlloted = -approvalAmount;
			update.$inc.totalStudents = -1;
		}
		await DiscountCategory.updateOne(
			{
				_id: discountId,
			},
			update
		);

		// update the totalApproved and totalPending in sectionDiscount

		await SectionDiscount.updateMany(
			{
				discountId: mongoose.Types.ObjectId(discountId),
				sectionName,
			},
			{
				$inc: {
					totalPending: -1,
					totalStudents: status === 'Rejected' ? -1 : 0,
					totalApproved: status === 'Approved' ? 1 : 0,
				},
			},
			{
				new: true,
				multi: true,
			}
		);
		res.json(SuccessResponse(null, 1, 'Updated Successfully'));
	} catch (err) {
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

const addStudentToDiscount = async (req, res, next) => {
	try {
		const { sectionId, categoryId, rows, studentList } = req.body;
		const { discountId } = req.params;
		let discountAmount = 0;

		if (!sectionId || !categoryId || !rows || !studentList) {
			return next(new ErrorResponse('Please Provide All Required Fields', 422));
		}

		// Fetch fee details from database
		const feeStructure = await FeeStructure.findOne(
			{
				sectionId,
				categoryId,
				schoolId: req.user.school_id,
			},
			'feeDetails'
		).lean();
		const feeDetails = feeStructure.feeDetails.reduce(
			(acc, { feeTypeId, totalAmount, scheduledDates, _id }) => {
				acc[feeTypeId] = { totalAmount, scheduledDates, _id };
				return acc;
			},
			{}
		);

		// Process each row in parallel
		await Promise.all(
			rows.map(async ({ feeTypeId, isPercentage, value }) => {
				if (isPercentage === undefined || !value) {
					return next(
						new ErrorResponse('Please Provide All Required Fields', 422)
					);
				}

				const {
					totalAmount,
					scheduledDates,
					_id: rowId,
				} = feeDetails[feeTypeId];
				const tempDiscountAmount = isPercentage
					? (totalAmount * value) / 100
					: value;
				discountAmount += tempDiscountAmount;
				const calPercentage = isPercentage
					? value
					: (value * 100) / totalAmount;

				// Update discounts for all matching fee installments in a single operation

				const bulkOps = [];
				for (const { amount, date } of scheduledDates) {
					const discountToPush = {
						discountId,
						isPercentage,
						value,
						discountAmount: 0,
						status: 'Pending',
					};
					const calAmount = isPercentage
						? (amount * value) / 100
						: (amount * calPercentage) / 100;
					discountToPush.discountAmount += calAmount;

					bulkOps.push({
						updateMany: {
							filter: {
								rowId,
								studentId: { $in: studentList },
								date: new Date(date),
							},
							update: { $push: { discounts: discountToPush } },
						},
					});
				}

				await FeeInstallment.bulkWrite(bulkOps);
			})
		);
		//  Update the totalPending and totalApproved in SectionDiscount
		await SectionDiscount.updateMany(
			{
				discountId: mongoose.Types.ObjectId(discountId),
				sectionId,
			},
			{
				$inc: {
					totalPending: studentList.length,
					totalStudents: studentList.length,
				},
			}
		);
		// Update the total students and total pending of the discount category
		await DiscountCategory.updateOne(
			{
				_id: discountId,
			},
			{
				$inc: {
					budgetAlloted: discountAmount * studentList.length,
					totalStudents: studentList.length,
					totalPending: studentList.length,
				},
			}
		);

		res.json(SuccessResponse(null, 1, 'Mapped Successfully'));
	} catch (error) {
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

module.exports = {
	getStudentForApproval,
	addStudentToDiscount,
	approveStudentDiscount,
	createDiscountCategory,
	getStudentsByFilter,
	getDiscountCategory,
	getDiscountCategoryById,
	getStudentsByStructure,
	updateDiscountCategory,
	deleteDiscountCategory,
	mapDiscountCategory,
	getDiscountCategoryByClass,
};
