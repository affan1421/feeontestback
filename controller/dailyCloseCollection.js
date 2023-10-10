const mongoose = require("mongoose");
const ErrorResponse = require("../utils/errorResponse");
const SuccessResponse = require("../utils/successResponse");
const DailyCloseCollection = require("../models/dailyCloseCollection");
const FeeReceipt = require("../models/feeReceipt");
const FeeStructure = require("../models/feeInstallment");
const Expense = require("../models/expense");

const generateDailyCloseCollection = async (req, res, next) => {
  try {
    const { schoolId, name, bankName, cashAmount, expenseAmount, date, attachments, reason } =
      req.body;

    // Check if name and bankName are provided
    if (!name || !bankName) {
      return res.status(400).json({ error: "Name and bankName are required" });
    }

    // Check if cashAmount is not zero
    if (cashAmount === 0 && cashAmount < 0) {
      return res.status(400).json({ error: "Cash Amount cannot be zero or less" });
    }

    // Check if expense Amount is not less than zero
    if (expenseAmount < 0) {
      return res.status(400).json({ error: "Expense Amount cannot be less than 0" });
    }

    // Create a new DailyCloseCollection document
    const newDailyClose = new DailyCloseCollection({
      schoolId,
      name,
      bankName,
      cashAmount,
      expenseAmount,
      date,
      attachments,
      reason,
    });

    await newDailyClose.save();

    res
      .status(200)
      .json(
        SuccessResponse(newDailyClose, 1, "Daily Close Collection record created successfully")
      );
  } catch (error) {
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const getCollectionDetails = async (req, res, next) => {
  try {
    const { searchQuery, date, page, limit, schoolId } = req.query;

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 5;
    const skip = (pageNumber - 1) * pageSize;

    const filter = {
      schoolId: mongoose.Types.ObjectId(schoolId),
    };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      filter.date = { $gte: startDate, $lt: endDate };
    }

    const regexCondition = {
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { bankName: { $regex: searchQuery, $options: "i" } },
      ],
    };

    const amountQuery = parseFloat(searchQuery);
    if (!isNaN(amountQuery)) {
      regexCondition.$or.push({ cashAmount: amountQuery });
    }

    filter.$and = [regexCondition];

    const collectionDetails = await DailyCloseCollection.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .exec();

    const totalDocuments = await DailyCloseCollection.countDocuments(filter);

    res.status(200).json({
      data: collectionDetails,
      page: pageNumber,
      limit: pageSize,
      total: totalDocuments,
    });
  } catch (error) {
    console.error(error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const dailyTotalFeeCollection = async (req, res, next) => {
  try {
    const { date, schoolId } = req.query;

    //check date is not invalid
    if (!date || isNaN(Date.parse(date))) {
      return res.status(400).json({ error: "Invalid or missing date parameter." });
    }

    // Parse the date parameter into a Date object
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const totalPaidAmount = await FeeReceipt.aggregate([
      {
        $match: {
          $and: [{ createdAt: { $gte: startDate } }, { createdAt: { $lt: endDate } }],
          "school.schoolId": mongoose.Types.ObjectId(schoolId),
        },
      },
      {
        $group: {
          _id: null,
          totalPaidAmount: { $sum: "$paidAmount" },
        },
      },
    ]);

    const totalPaidAmountinCash = await FeeReceipt.aggregate([
      {
        $match: {
          $and: [{ createdAt: { $gte: startDate } }, { createdAt: { $lt: endDate } }],
          "school.schoolId": mongoose.Types.ObjectId(schoolId),
          "payment.method": "CASH",
        },
      },
      {
        $group: {
          _id: null,
          totalPaidAmountinCash: { $sum: "$paidAmount" },
        },
      },
    ]);

    const expenseInCash = await Expense.aggregate([
      {
        $match: {
          $and: [{ createdAt: { $gte: startDate } }, { createdAt: { $lt: endDate } }],
          schoolId: mongoose.Types.ObjectId(schoolId),
          paymentMethod: "CASH",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const totalAmount = totalPaidAmount?.[0]?.totalPaidAmount || 0;
    const totalAmountinCash = totalPaidAmountinCash?.[0]?.totalPaidAmountinCash || 0;
    const totalExpense = expenseInCash?.[0]?.totalAmount || 0;

    res.status(200).json({
      totalPaidAmount: totalAmount,
      totalPaidAmountinCash: totalAmountinCash,
      expenseInCash: totalExpense,
    });
  } catch (error) {
    console.error(error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const updateCloseCollectionStatus = async (req, res, next) => {
  try {
    const { closeCollecionId, reason, attachments, status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    if (
      status === "REJECTED" &&
      !reason &&
      !attachments &&
      reason === "" &&
      attachments.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Either Reason or Attachments is required for rejecting" });
    }

    const updatedData = await DailyCloseCollection.findByIdAndUpdate(
      closeCollecionId,
      {
        $set: {
          status,
          reason: status === "REJECTED" ? reason : "",
          attachments: status === "REJECTED" ? attachments : [],
        },
      },
      { new: true }
    );

    if (!updatedData) {
      return res.status(500).json({ error: "Something went wrong while updating the document" });
    }

    res
      .status(200)
      .json(SuccessResponse(null, 1, "Daily close collection status updated successfully"));
  } catch (error) {
    console.error(error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

module.exports = {
  generateDailyCloseCollection,
  getCollectionDetails,
  dailyTotalFeeCollection,
  updateCloseCollectionStatus,
};
