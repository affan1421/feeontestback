const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const dailyCloseSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    bankName: {
      type: String,
      required: [true, "Bank name is required"],
    },
    cashAmount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    expenseAmount: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      required: [true, "Choose a Date"],
    },
    attachments: {
      type: [String],
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

const DailyCloseCollection = model("DailyCloseCollection", dailyCloseSchema);

module.exports = DailyCloseCollection;
