const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const concessionSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "studentId is required"],
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School Id is required"],
    },
    FeeTypeId: {
      type: Schema.Types.ObjectId,
      ref: "FeeTypes",
      required: [true, "FeeTypeId is required"],
    },
    tcType: {
      type: String,
      enum: ["ALUMINI-TC", "AVAIL-TC", "BLOCKED"],
      required: [true, "Type is required"],
    },
    reason: {
      type: Schema.Types.ObjectId,
      ref: "tcReasons",
      required: [true, "Tc reason is required"],
    },
    comment: String,
    transferringSchool: String,
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    attachments: {
      type: [String],
    },
  },
  { timestamps: true }
);

const Concession = model("Concession", concessionSchema);

module.exports = Concession;
