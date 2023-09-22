const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const studentTransferSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "studentId is required"],
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "class is required"],
    },
    tcType: {
      type: String,
      enum: ["ALUMINI-TC", "AVAIL-TC", "BLOCKED"],
      required: [true, "Type is required"],
    },
    reason: String,
    transferringSchool: String,
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

const StudentTransfer = model("StudentTransfer", studentTransferSchema);

module.exports = StudentTransfer;

