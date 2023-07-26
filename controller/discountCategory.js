const mongoose = require('mongoose');
const DiscountCategory = require('../models/discountCategory');
const FeeInstallment = require('../models/feeInstallment');
const FeeStructure = require('../models/feeStructure');
const SectionDiscount = require('../models/sectionDiscount');

const Students = mongoose.connection.db.collection('students');
const catchAsync = require('../utils/catchAsync');
const ErrorResponse = require('../utils/errorResponse');
const SuccessResponse = require('../utils/successResponse');

function calculateDiscountAmount(dueAmount, isPercentage, value) {
	return isPercentage ? (dueAmount / 100) * value : value;
}
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
					$sum: '$totalStudents',
				},
				totalApproved: {
					$sum: '$totalApproved',
				},
				totalPending: {
					$sum: '$totalPending',
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
	// Fetch attachments object from discount
	const { attachments = {} } = await DiscountCategory.findOne({
		_id: id,
	});
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
					$sum: '$totalAmount',
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
				admission_no: '$student.admission_no',
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
		if (attachments[student.studentId.toString()]) {
			student.attachments = attachments[student.studentId.toString()];
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
		const {
			sectionId,
			categoryId,
			rows,
			studentList,
			sectionName,
			feeStructureId,
		} = req.body;
		const { discountId } = req.params;
		const { school_id } = req.user;

		if (!sectionId || !categoryId || !rows || studentList.length === 0) {
			return next(new ErrorResponse('Please Provide All Required Fields', 422));
		}

		let discountAmount = 0;
		const studentMap = {};
		const studentMapDup = { ...studentMap };
		const uniqueStudList = [
			...new Set(studentList.map(({ studentId }) => studentId)),
		];
		const attachmentObj = {};
		const feeStructure = await FeeStructure.findOne(
			{ _id: feeStructureId },
			'feeDetails'
		).lean();
		const feeDetails = feeStructure.feeDetails.reduce(
			(acc, { feeTypeId, totalAmount, scheduledDates }) => {
				acc[feeTypeId] = { totalAmount, scheduledDates };
				return acc;
			},
			{}
		);

		const refundMap = {};

		const classList = [];
		for (const { rowId, feeTypeId, isPercentage, value, breakdown } of rows) {
			const tempStudMap = { ...studentMapDup };
			if (!rowId || isPercentage === undefined || !value) {
				return next(
					new ErrorResponse('Please Provide All Required Fields', 422)
				);
			}

			const { totalAmount } = feeDetails[feeTypeId];

			const tempDiscountAmount = calculateDiscountAmount(
				totalAmount,
				isPercentage,
				value
			);

			const bulkOps = [];

			const filter = { studentId: { $in: uniqueStudList }, rowId };
			const projections = {
				netAmount: 1,
				paidAmount: 1,
				studentId: 1,
				totalAmount: 1,
			};

			const feeInstallments = await FeeInstallment.find(
				filter,
				projections
			).lean();

			if (!feeInstallments.length) {
				return next(new ErrorResponse('No Fee Installment Found', 404));
			}

			for (const stud of uniqueStudList) {
				let discountTempAmount = tempDiscountAmount;
				const installments = feeInstallments.filter(
					({ studentId }) => studentId.toString() === stud.toString()
				);
				let insCount = 0;

				for (const {
					netAmount,
					paidAmount,
					totalAmount: insTotalAmount,
					_id,
				} of installments) {
					const dueAmount = netAmount - paidAmount;

					if (discountTempAmount === 0) break;

					if (dueAmount > 0) {
						const minAmount = Math.min(dueAmount, discountTempAmount);

						const insDiscountValue = isPercentage
							? (minAmount / insTotalAmount) * 100
							: dueAmount;
						const insDiscountAmount = isPercentage
							? (insDiscountValue / 100) * insTotalAmount
							: insDiscountValue;

						const updateObj = {
							$push: {
								discounts: {
									discountId,
									discountAmount: insDiscountAmount,
									isPercentage,
									value: insDiscountValue,
									status: 'Pending',
								},
							},
						};

						bulkOps.push({
							updateOne: {
								filter: { _id },
								update: updateObj,
							},
						});

						studentMap[stud] = (studentMap[stud] || 0) + 1;
						tempStudMap[stud] = (tempStudMap[stud] || 0) + 1;

						discountTempAmount -= insDiscountAmount;
					}

					insCount += 1;

					// If the discount amount is excess, then add it to the refund map
					if (insCount === installments.length && discountTempAmount > 0) {
						refundMap[stud] = (refundMap[stud] || 0) + discountTempAmount;
					}
				}
			}

			if (bulkOps.length > 0) {
				await FeeInstallment.bulkWrite(bulkOps);
			}

			const reducedStudentList = uniqueStudList.filter(
				studentId => tempStudMap[studentId] > 0
			);

			// update the discount amount
			discountAmount += tempDiscountAmount * reducedStudentList.length;

			classList.push({
				discountId,
				sectionId,
				sectionName,
				feeTypeId,
				categoryId,
				feeStructureId: feeStructure._id,
				totalStudents: reducedStudentList.length,
				totalPending: reducedStudentList.length,
				schoolId: school_id,
				totalAmount,
				discountAmount: tempDiscountAmount,
				breakdown,
				isPercentage,
				value,
			});
		}

		const filteredStudentList = uniqueStudList.filter(
			studentId => studentMap[studentId] > 0
		);

		if (!filteredStudentList.length) {
			return next(
				new ErrorResponse('Cannot Apply Discount, Insufficient Fees', 404)
			);
		}

		if (Object.keys(refundMap).length > 0) {
			const refundBulkOps = [];
			for (const [studentId, refundAmount] of Object.entries(refundMap)) {
				const updateObj = {
					updateOne: {
						filter: { _id: mongoose.Types.ObjectId(studentId) },
						update: {
							$inc: {
								'refund.totalAmount': refundAmount,
							},

							$push: {
								'refund.history': {
									id: discountId,
									amount: refundAmount,
									date: new Date(),
									reason: 'Discount Refund',
									status: 'PENDING',
								},
							},
						},
					},
				};
				refundBulkOps.push(updateObj);
			}
			// update the refund amount in the student collection
			await Students.bulkWrite(refundBulkOps);
		}

		await SectionDiscount.insertMany(classList);

		await DiscountCategory.updateOne(
			{
				_id: discountId,
			},
			{
				$inc: {
					budgetAlloted: discountAmount * filteredStudentList.length,
					totalStudents: filteredStudentList.length,
					totalPending: filteredStudentList.length,
					classesAssociated: 1,
				},
				$set: {
					attachments: attachmentObj,
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

	const { attachments = {} } = await DiscountCategory.findOne({
		_id: discountId,
	});

	// Need to push the sectionName in the student array
	// Get the aggregated data of the students from feeInstallments
	let students = await FeeInstallment.aggregate([
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
									{ $add: ['$$value', '$$this.discountAmount'] },
									'$$value',
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
									{ $add: ['$$value', '$$this.discountAmount'] },
									'$$value',
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
							admission_no: 1,
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
				admission_no: {
					$first: '$student.admission_no',
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

	if (Object.keys(attachments).length > 0) {
		students = students.map(student => {
			if (attachments[student.studentId.toString()]) {
				student.attachments = attachments[student.studentId.toString()];
			}
			return student;
		});
	}

	res
		.status(200)
		.json(SuccessResponse(students, students.length, 'Fetched SuccessFully'));
});

const approveStudentDiscount = async (req, res, next) => {
	// TODO: Need to take confirmation from the approver with the amount that can be approved.
	const { discountId } = req.params;
	const { studentId, status, sectionName } = req.body;

	// input validation
	if (
		!studentId ||
		(status !== 'Approved' && status !== 'Rejected') ||
		!sectionName ||
		!discountId
	) {
		return next(new ErrorResponse('Please Provide All Required Fields', 422));
	}
	let attachments = null;
	let updatedAmount = 0;
	let amountToSub = 0;
	let installmentLoopCount = 0;
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
		for (const {
			_id,
			discounts,
			paidAmount,
			netAmount,
			status: installmentStatus,
		} of feeInstallments) {
			// find the discount amount in the discounts array
			const discount = discounts.find(
				d => d.discountId.toString() === discountId.toString()
			);
			if (!discount) {
				return next(new ErrorResponse('No Discount Found', 404));
			}
			const { discountAmount } = discount;
			const dueAmount = netAmount - paidAmount;
			if (status === 'Approved' && discountAmount <= dueAmount) {
				installmentLoopCount += 1;
				updatedAmount += discountAmount;
				const updateObj = {
					$set: {
						'discounts.$.status': 'Approved',
					},
					$inc: {
						totalDiscountAmount: discountAmount,
						netAmount: -discountAmount,
					},
				};

				if (dueAmount === discountAmount) {
					updateObj.$set.status = installmentStatus === 'Due' ? 'Late' : 'Paid';
				}

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
					updateObj
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

		const finalUpdate = {
			$inc: {
				...update,
				budgetRemaining: -updatedAmount, // If Rejected, then 0 is subtracted
				budgetAlloted: -amountToSub,
			},
		};

		if (status === 'Approved' && installmentLoopCount === 0) {
			return next(
				new ErrorResponse(
					'Amount Exceeds Balance Fee. Cannot Approve Discount',
					400
				)
			);
		}

		if (status === 'Rejected' && installmentLoopCount === 0) {
			const discountCategory = await DiscountCategory.findOne({
				_id: discountId,
			});
			attachments = discountCategory.attachments;
			if (attachments[studentId.toString()]) {
				delete attachments[studentId.toString()];
			}
			finalUpdate.$set = { attachments };
		}

		// Update the totalPending and totalApproved in DiscountCategory
		await DiscountCategory.updateOne({ _id: discountId }, finalUpdate);

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

const addAttachment = async (req, res, next) => {
	const { studentId, attachment, discountId } = req.body;
	try {
		const discount = await DiscountCategory.findOne({
			_id: discountId,
		});
		if (!discount) {
			return next(new ErrorResponse('Discount Not Found', 404));
		}
		const { attachments = {} } = discount;
		attachments[studentId] = attachment;
		await DiscountCategory.updateOne(
			{
				_id: discountId,
			},
			{
				$set: {
					attachments,
				},
			}
		);
		res.json(SuccessResponse(null, 1, 'Updated Successfully'));
	} catch (err) {
		return next(new ErrorResponse('Something Went Wrong', 500));
	}
};

const addStudentToDiscount = async (req, res, next) => {
	try {
		const { sectionId, categoryId, rows, studentList, feeStructureId } =
			req.body;
		const { discountId } = req.params;

		if (!sectionId || !categoryId || !rows || studentList.length === 0) {
			return next(new ErrorResponse('Please Provide All Required Fields', 422));
		}

		const discountAmount = 0;
		let discountCategory = null;
		const studentMap = {};
		const studentMapDup = { ...studentMap };
		const uniqueStudList = [
			...new Set(studentList.map(({ studentId }) => studentId)),
		];
		let attachmentObj = {};

		const feeStructure = await FeeStructure.findOne(
			{ _id: feeStructureId },
			'feeDetails'
		).lean();
		const feeDetails = feeStructure.feeDetails.reduce(
			(acc, { feeTypeId, totalAmount, scheduledDates, _id }) => {
				acc[feeTypeId] = { totalAmount, scheduledDates, _id };
				return acc;
			},
			{}
		);

		const refundMap = {};

		await Promise.all(
			rows.map(async ({ feeTypeId, isPercentage, value }) => {
				const tempStudMap = { ...studentMapDup };

				if (isPercentage === undefined || !value) {
					return next(
						new ErrorResponse('Please Provide All Required Fields', 422)
					);
				}

				const { totalAmount, _id: rowId } = feeDetails[feeTypeId];

				const tempDiscountAmount = calculateDiscountAmount(
					totalAmount,
					isPercentage,
					value
				);

				const bulkOps = [];
				const filter = { studentId: { $in: uniqueStudList }, rowId };
				const projections = {
					netAmount: 1,
					paidAmount: 1,
					studentId: 1,
					totalAmount: 1,
				};

				const feeInstallments = await FeeInstallment.find(
					filter,
					projections
				).lean();

				if (!feeInstallments.length) {
					return next(new ErrorResponse('No Fee Installment Found', 404));
				}

				for (const stud of uniqueStudList) {
					let discountTempAmount = tempDiscountAmount;
					const installments = feeInstallments.filter(
						({ studentId }) => studentId.toString() === stud.toString()
					);
					let insCount = 0;

					for (const {
						netAmount,
						paidAmount,
						totalAmount: insTotalAmount,
						_id,
					} of installments) {
						const dueAmount = netAmount - paidAmount;

						if (discountTempAmount === 0) break;

						if (dueAmount > 0) {
							const minAmount = Math.min(dueAmount, discountTempAmount);

							const insDiscountValue = isPercentage
								? (minAmount / insTotalAmount) * 100
								: dueAmount;
							const insDiscountAmount = isPercentage
								? (insDiscountValue / 100) * insTotalAmount
								: insDiscountValue;

							const updateObj = {
								$push: {
									discounts: {
										discountId,
										discountAmount: insDiscountAmount,
										isPercentage,
										value: insDiscountValue,
										status: 'Pending',
									},
								},
							};

							bulkOps.push({
								updateOne: {
									filter: { _id },
									update: updateObj,
								},
							});

							studentMap[stud] = (studentMap[stud] || 0) + 1;
							tempStudMap[stud] = (tempStudMap[stud] || 0) + 1;

							discountTempAmount -= insDiscountAmount;
						}

						insCount += 1;

						// If the discount amount is excess, then add it to the refund map
						if (insCount === installments.length && discountTempAmount > 0) {
							refundMap[stud] = (refundMap[stud] || 0) + discountTempAmount;
						}
					}
				}

				if (bulkOps.length > 0) {
					await FeeInstallment.bulkWrite(bulkOps);
				}

				const reducedStudentList = uniqueStudList.filter(
					studentId => tempStudMap[studentId] > 0
				);

				await SectionDiscount.updateOne(
					{
						discountId: mongoose.Types.ObjectId(discountId),
						sectionId,
						feeStructureId,
						feeTypeId,
					},
					{
						$inc: {
							totalPending: reducedStudentList.length,
							totalStudents: reducedStudentList.length,
						},
					}
				);
			})
		);

		const filteredStudentList = uniqueStudList.filter(
			studentId => studentMap[studentId] > 0
		);

		if (!filteredStudentList.length) {
			return next(
				new ErrorResponse('Cannot Apply Discount, Insufficient Fees', 404)
			);
		}

		if (Object.keys(refundMap).length > 0) {
			const refundBulkOps = [];
			for (const [studentId, refundAmount] of Object.entries(refundMap)) {
				const updateObj = {
					updateOne: {
						filter: { _id: mongoose.Types.ObjectId(studentId) },
						update: {
							$inc: {
								'refund.totalAmount': refundAmount,
							},

							$push: {
								'refund.history': {
									id: discountId,
									amount: refundAmount,
									date: new Date(),
									reason: 'Discount Refund',
									status: 'PENDING',
								},
							},
						},
					},
				};
				refundBulkOps.push(updateObj);
			}
			// update the refund amount in the student collection
			await Students.bulkWrite(refundBulkOps);
		}

		const update = {
			$inc: {
				budgetAlloted: discountAmount,
				totalStudents: filteredStudentList.length,
				totalPending: filteredStudentList.length,
			},
		};

		if (Object.keys(attachmentObj).length > 0) {
			discountCategory = await DiscountCategory.findOne({ _id: discountId });
			if (!discountCategory) {
				return next(new ErrorResponse('Discount Not Found', 404));
			}

			if (discountCategory.attachments) {
				attachmentObj = { ...discountCategory.attachments, ...attachmentObj };
			}

			update.$set = {
				attachments: attachmentObj,
			};
		}

		await DiscountCategory.updateOne({ _id: discountId }, update);

		res.json(
			SuccessResponse(null, filteredStudentList.length, 'Mapped Successfully')
		);
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
	const { studentId } = req.body;
	let totalDiscountAmount = 0;
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
	const paidInstallments = feeInstallments.some(
		({ paidAmount }) => paidAmount > 0
	);
	if (paidInstallments) {
		return next(
			new ErrorResponse('Cannot Revoke Discount, Receipts Are Generated', 400)
		);
	}

	const { sectionId, feeStructureId } = feeInstallments[0];
	// Update the feeInstallments
	for (const { _id, discounts } of feeInstallments) {
		const discount = discounts.find(
			d => d.discountId.toString() === id.toString()
		);
		if (!discount) {
			return next(new ErrorResponse('No Discount Found', 404));
		}
		const { discountAmount } = discount;
		totalDiscountAmount += discountAmount;
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
	await Promise.all([
		await SectionDiscount.updateMany(
			{
				discountId: mongoose.Types.ObjectId(id),
				sectionId: mongoose.Types.ObjectId(sectionId),
				feeStructureId: mongoose.Types.ObjectId(feeStructureId),
			},
			{
				$inc: {
					totalStudents: -1,
					totalApproved: -1,
				},
			}
		),
		await DiscountCategory.updateOne(
			{
				_id: id,
			},
			{
				$inc: {
					budgetRemaining: totalDiscountAmount,
					totalStudents: -1,
					totalApproved: -1,
					budgetAlloted: -totalDiscountAmount,
				},
			}
		),
	]);
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
	addAttachment,
	getSectionDiscount,
};
