const mongoose = require('mongoose');
const DiscountCategory = require('../models/discountCategory');
const FeeInstallment = require('../models/feeInstallment');
const FeeStructure = require('../models/feeStructure');
const SectionDiscount = require('../models/sectionDiscount');
const catchAsync = require('../utils/catchAsync');
const FeeType = require('../models/feeType');
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
	const query = {
		discountId: mongoose.Types.ObjectId(id),
	};
	const classList = await SectionDiscount.aggregate([
		{
			$match: query,
		},
		{
			$group: {
				_id: '$sectionId',
				sectionName: {
					$first: '$sectionName',
				},
				totalStudents: {
					$first: '$totalStudents',
				},
				totalApproved: {
					$first: '$totalApproved',
				},
				totalPending: {
					$first: '$totalPending',
				},
				totalAmount: {
					$sum: '$discountAmount',
				},
				totalFees: {
					$sum: '$totalAmount',
				},
			},
		},
		{
			$addFields: {
				sectionId: '$_id',
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
				sectionId: {
					$first: '$sectionId',
				},
				totalDiscountAmount: {
					$sum: '$totalDiscountAmount',
				},
				totalFees: {
					$sum: '$netAmount',
				},
				discounts: {
					$push: {
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
				totalFees: 1,
				discountApplied: {
					$sum: {
						$map: {
							input: '$discounts',
							as: 'obj',
							in: '$$obj.discountAmount',
						},
					},
				},
				discountStatus: {
					$arrayElemAt: ['$discounts.status', 0],
				},
				sectionName: {
					$first: '$section.className',
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
		_id: id,
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
		// TODO: StudentList should be array of objects with studentId and attachment
		let {
			sectionId,
			categoryId,
			rows,
			studentList,
			sectionName,
			feeStructureId,
		} = req.body;
		const { discountId } = req.params;
		const { school_id } = req.user;
		let discountAmount = 0;
		studentList = [...new Set(studentList)];

		// TODO: filter the student objects with the attachment - filteredStudentList

		if (!sectionId || !categoryId || !rows || !studentList) {
			return next(new ErrorResponse('Please Provide All Required Fields', 422));
		}

		// Fetch fee details from database
		const feeStructure = await FeeStructure.findOne(
			{
				_id: feeStructureId,
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
				const calPercentage = isPercentage
					? value
					: (value * 100) / totalAmount;

				const bulkOps = [];
				const filter = {
					studentId: { $in: studentList }, // need to reduce the studentList
					rowId,
				};
				const projections = { netAmount: 1, paidAmount: 1, studentId: 1 };

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

					const feeInstallments = await FeeInstallment.find(
						{ ...filter, date: new Date(date) },
						projections
					).lean();

					for (const { studentId, netAmount, paidAmount } of feeInstallments) {
						if (calAmount <= netAmount - paidAmount) {
							discountAmount += calAmount;
							bulkOps.push({
								updateOne: {
									filter: { studentId, date: new Date(date), rowId },
									update: { $push: { discounts: discountToPush } },
								},
							});
						}
					}
				}

				if (bulkOps.length > 0) {
					await FeeInstallment.bulkWrite(bulkOps);
				}

				return {
					discountId,
					sectionId,
					sectionName,
					feeTypeId,
					categoryId,
					feeStructureId: feeStructure._id,
					totalStudents: studentList.length,
					totalPending: studentList.length,
					schoolId: school_id,
					totalAmount,
					discountAmount: tempDiscountAmount,
					breakdown,
					isPercentage,
					value,
				};
			})
			// TODO: Need to add the attachment in the student document
			// loop through the filteredStudentList and update the attachment
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
					budgetAlloted: discountAmount,
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
	// TODO: Need to take confirmation from the approver with the amount that can be approved.
	const { discountId } = req.params;
	const { studentId, status, approvalAmount, sectionName } = req.body;
	let updatedAmount = 0;
	let amountToSub = 0;
	try {
		// update.$inc.totalStudents = -1;
		// sectionUpdate.$inc.totalStudents = -1;
		const update = {
			totalPending: -1,
			totalApproved: status === 'Approved' ? 1 : 0,
			totalStudents: status === 'Rejected' ? -1 : 0,
		};
		const sectionUpdate = {
			totalPending: -1,
			totalApproved: status === 'Approved' ? 1 : 0,
			totalStudents: status === 'Rejected' ? -1 : 0,
		};
		const feeInstallments = await FeeInstallment.find({
			studentId: mongoose.Types.ObjectId(studentId),
			discounts: {
				$elemMatch: {
					discountId: mongoose.Types.ObjectId(discountId),
					status: 'Pending',
				},
			},
		}).lean();
		if (!feeInstallments.length) {
			return next(new ErrorResponse('No Fee Installment Found', 404));
		}
		for (const { _id, discounts, paidAmount, netAmount } of feeInstallments) {
			// find the discount amount in the discounts array
			const discount = discounts.find(
				d => d.discountId.toString() === discountId.toString()
			);
			if (!discount) {
				return next(new ErrorResponse('No Discount Found', 404));
			}
			const { discountAmount } = discount;
			if (status === 'Approved' && discountAmount <= netAmount - paidAmount) {
				updatedAmount += discountAmount;

				await FeeInstallment.findOneAndUpdate(
					{
						_id,
						discounts: {
							$elemMatch: {
								discountId: mongoose.Types.ObjectId(discountId),
								status: 'Pending',
							},
						},
					},
					{
						$set: {
							'discounts.$.status': 'Approved',
						},
						$inc: {
							totalDiscountAmount: discountAmount,
							netAmount: -discountAmount,
						},
					}
				);
			} else {
				amountToSub += discountAmount; // to be subtracted from the budget alloted
				// remove that match from the discounts array
				await FeeInstallment.findOneAndUpdate(
					{
						_id,
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

		await DiscountCategory.updateOne(
			{
				_id: discountId,
			},
			{
				$inc: {
					...update,
					budgetRemaining: -updatedAmount,
					budgetAlloted: -amountToSub,
				},
			}
		);

		// update the totalApproved and totalPending in sectionDiscount

		await SectionDiscount.updateMany(
			{
				discountId: mongoose.Types.ObjectId(discountId),
				sectionName,
			},
			{
				$inc: {
					...sectionUpdate,
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
		let { sectionId, categoryId, rows, studentList } = req.body;
		const { discountId } = req.params;
		let discountAmount = 0;
		studentList = [...new Set(studentList)];

		if (!sectionId || !categoryId || !rows || !studentList) {
			return next(new ErrorResponse('Please Provide All Required Fields', 422));
		}

		// Fetch fee details from database
		const feeStructure = await FeeStructure.findOne(
			{
				'classes.sectionId': sectionId,

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
				const calPercentage = isPercentage
					? value
					: (value * 100) / totalAmount;

				const bulkOps = [];
				const filter = {
					studentId: { $in: studentList },
					rowId,
				};
				const projections = { netAmount: 1, paidAmount: 1, studentId: 1 };

				for (const { amount, date } of scheduledDates) {
					const discountToPush = {
						discountId,
						isPercentage,
						value,
						// attachment: url,
						discountAmount: 0,
						status: 'Pending',
					};
					const calAmount = isPercentage
						? (amount * value) / 100
						: (amount * calPercentage) / 100;
					discountToPush.discountAmount += calAmount;

					const feeInstallments = await FeeInstallment.find(
						{ ...filter, date: new Date(date) },
						projections
					).lean();

					for (const { studentId, netAmount, paidAmount } of feeInstallments) {
						if (calAmount <= netAmount - paidAmount) {
							discountAmount += calAmount;
							// accept attachment and update in that object
							bulkOps.push({
								updateOne: {
									filter: { studentId, date: new Date(date), rowId },
									update: { $push: { discounts: discountToPush } },
								},
							});
						}
					}
				}

				if (bulkOps.length > 0) {
					await FeeInstallment.bulkWrite(bulkOps);
				}
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
					budgetAlloted: discountAmount,
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

const getSectionDiscount = catchAsync(async (req, res, next) => {
	const { id, feeStructureId } = req.params;
	const filter = {
		discountId: mongoose.Types.ObjectId(id),
		feeStructureId: mongoose.Types.ObjectId(feeStructureId),
	};
	const projections = {
		_id: 0,
		feeType: {
			$arrayElemAt: ['$feeType', 0],
		},
		totalAmount: 1,
		isPercentage: 1,
		value: 1,
		breakdown: 1,
	};
	// find in sectionDiscount
	const sectionDiscount = await SectionDiscount.aggregate([
		{
			$match: filter,
		},
		{
			$group: {
				_id: '$feeTypeId',
				feeType: {
					$first: '$feeTypeId',
				},
				totalAmount: {
					$first: '$totalAmount',
				},
				isPercentage: {
					$first: '$isPercentage',
				},
				value: {
					$first: '$value',
				},
				breakdown: {
					$first: '$breakdown',
				},
			},
		},
		{
			$lookup: {
				from: 'feetypes',
				let: { feeTypeId: '$feeType' },
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ['$_id', '$$feeTypeId'],
							},
						},
					},
					{
						$project: {
							_id: 1,
							feeType: 1,
						},
					},
				],
				as: 'feeType',
			},
		},
		{
			$project: projections,
		},
	]);
	if (!sectionDiscount.length) {
		return next(new ErrorResponse('No Discount Found', 404));
	}

	res.json(
		SuccessResponse(
			sectionDiscount,
			sectionDiscount.length,
			'Fetched Successfully'
		)
	);
});

const discountReport = catchAsync(async (req, res, next) => {
	const { school_id } = req.user;
	// find all the sectionDiscounts of the school and group it and sort by section.
	const sectionDiscounts = await SectionDiscount.aggregate([
		{
			$match: {
				schoolId: mongoose.Types.ObjectId(school_id),
			},
		},
		{
			$group: {
				_id: '$sectionId',
				sectionName: {
					$first: '$sectionName',
				},
				discountAmount: { $sum: '$discountAmount' },
				totalStudents: { $sum: '$totalStudents' },
				totalPending: { $sum: '$totalPending' },
				totalApproved: { $sum: '$totalApproved' },
			},
		},
		{
			$sort: {
				discountAmount: -1,
			},
		},
	]);
	if (!sectionDiscounts) {
		return next(new ErrorResponse('No Discount Mapped', 404));
	}
	res
		.status(200)
		.json(SuccessResponse(sectionDiscounts, 1, 'Fetched Successfully'));
});

const revokeStudentDiscount = catchAsync(async (req, res, next) => {
	const { id } = req.params;
	const { studentId, amount } = req.body;
	// Fetch all feeInstallments of the student

	const feeInstallments = await FeeInstallment.find({
		studentId: mongoose.Types.ObjectId(studentId),
		discounts: {
			$elemMatch: {
				discountId: mongoose.Types.ObjectId(id),
				status: 'Approved',
			},
		},
	}).lean();
	if (!feeInstallments.length) {
		return next(new ErrorResponse('No Fee Installment Found', 404));
	}
	// check if any installment has paidAmount > 0
	const paidInstallments = feeInstallments.filter(
		({ paidAmount }) => paidAmount > 0
	);
	if (paidInstallments.length) {
		return next(
			new ErrorResponse(
				'Cannot Revoke Discount, Receipts Are Generated For The Installments',
				400
			)
		);
	}
	// Update the feeInstallments
	for (const { _id, discounts } of feeInstallments) {
		const discount = discounts.find(
			d => d.discountId.toString() === id.toString()
		);
		if (!discount) {
			return next(new ErrorResponse('No Discount Found', 404));
		}
		const { discountAmount } = discount;
		await FeeInstallment.findOneAndUpdate(
			{
				_id,
				discounts: {
					$elemMatch: {
						discountId: mongoose.Types.ObjectId(id),
						status: 'Approved',
					},
				},
			},
			{
				// remove that discount object
				$pull: {
					discounts: {
						discountId: mongoose.Types.ObjectId(id),
					},
				},
				// update the totalDiscountAmount and netAmount
				$inc: {
					totalDiscountAmount: -discountAmount,
					netAmount: discountAmount,
				},
			}
		);
	}
	// Update the totalApproved and totalPending in sectionDiscount
	await SectionDiscount.updateMany(
		{
			discountId: mongoose.Types.ObjectId(id),
		},
		{
			$inc: {
				totalStudents: -1,
				totalApproved: -1,
			},
		}
	);
	await DiscountCategory.updateOne(
		{
			_id: id,
		},
		{
			$inc: {
				budgetRemaining: amount,
				totalStudents: -1,
				totalApproved: -1,
				budgetAlloted: -amount,
			},
		}
	);
	res.status(200).json(SuccessResponse(null, 1, 'Revoked Successfully'));
});

module.exports = {
	getStudentForApproval,
	addStudentToDiscount,
	revokeStudentDiscount,
	approveStudentDiscount,
	createDiscountCategory,
	getStudentsByFilter,
	discountReport,
	getDiscountCategory,
	getDiscountCategoryById,
	getStudentsByStructure,
	updateDiscountCategory,
	deleteDiscountCategory,
	mapDiscountCategory,
	getDiscountCategoryByClass,
	getSectionDiscount,
};
