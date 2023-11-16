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
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "parents",
      required: [true, "parent Id is required"],
    },
    assignedVehicleNumber: {
      type: Number,
      required: true,
    },
    selectedRouteId: {
      type: Schema.Types.ObjectId,
      ref: "busRoutes",
      required: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "busDriver",
      required: true,
    },
    transportSchedule: {
      type: String,
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
    vehicleMode: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Paid", "Due", "Upcoming"],
    },
  },
  {
    timestamps: true,
  }
);

const StudentsTransport = model("StudentsTransport", studentTransportSchema);

module.exports = StudentsTransport;
