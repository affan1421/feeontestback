const mongoose = require("mongoose");
const ErrorResponse = require("../utils/errorResponse");
const SuccessResponse = require("../utils/successResponse");
const DailyCloseCollection = require("../models/dailyCloseCollection");
const FeeStructure = require("../models/feeInstallment");

const generateDailyCloseCollection = async (req, res, next) => {
  try {
    const {
      name,
      bankName,
      cashAmount,
      expenseAmount,
      date,
      attachments,
      status,
    } = req.body;

    // Check if name and bankName are provided
    if (!name || !bankName) {
      return res.status(400).json({ error: "Name and bankName are required" });
    }

    // Check if cashAmount is not zero
    if (cashAmount === 0) {
      return res.status(400).json({ error: "cashAmount cannot be zero" });
    }

    // Create a new DailyCloseCollection document
    const newDailyClose = new DailyCloseCollection({
      name,
      bankName,
      cashAmount,
      expenseAmount,
      date,
      attachments,
      status,
    });

    await newDailyClose.save();

    res
      .status(200)
      .json(
        SuccessResponse(
          newDailyClose,
          1,
          "Daily Close Collection record created successfully"
        )
      );
  } catch (error) {
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const getCollectionDetails = async (req, res, next) => {
  try {
    const { searchQuery, date, page, limit } = req.query;

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 5;
    const skip = (pageNumber - 1) * pageSize;

    const filter = {};

    if (date) {
      filter.date = new Date(date);
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
    const { date } = req.params;

    // // Validate if the 'date' parameter is provided and is in a valid date format
    // if (!date || isNaN(Date.parse(date))) {
    //   return res
    //     .status(400)
    //     .json({ error: "Invalid or missing date parameter." });
    // }

    // Parse the date parameter into a Date object
    const selectedDate = new Date(date);

    console.log(selectedDate, "selectedDate");

    // Calculate the total 'paidAmount' for the given date
    const totalPaidAmount = await FeeStructure.aggregate([
      {
        $match: {
          date: selectedDate,
        },
      },
      {
        $group: {
          _id: null,
          totalPaidAmount: { $sum: "$paidAmount" },
        },
      },
    ]);

    // Check if there are results and extract the totalPaidAmount
    const totalAmount =
      totalPaidAmount.length > 0 ? totalPaidAmount[0].totalPaidAmount : 0;

    res.status(200).json({ totalPaidAmount: totalAmount });
  } catch (error) {
    console.error(error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

module.exports = {
  generateDailyCloseCollection,
  getCollectionDetails,
  dailyTotalFeeCollection,
};
