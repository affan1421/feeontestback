const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const studentTransportSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "schools",
      required: [true, "school ID required"],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sections",
      required: [true, "school ID required"],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "students",
      required: [true, "school ID required"],
    },
    transportSchedule: {
      type: String,
      enum: ["pickup", "drop", "both"],
      default: "both",
    },
    selectedRouteId: {
      type: Schema.Types.ObjectId,
      ref: "busRoutes",
      required: true,
    },
    stopId: {
      type: Schema.Types.ObjectId,
      ref: "busRoutes",
      required: true,
    },
    feeMonth: {
      type: String,
      required: true,
    },
    feeAmount: {
      type: Number,
      required: true,
    },
    tripNumber: {
      type: Number,
    },
    status: {
      type: String,
      default: "Paid",
      enum: ["Pending", "Paid", "Due", "Upcoming"],
    },
  },
  {
    timestamps: true,
  }
);

const StudentsTransport = model("StudentsTransport", studentTransportSchema);

module.exports = StudentsTransport;
