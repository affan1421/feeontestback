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
      type: Schema.Types.ObjectId,
      ref: "sections",
      required: [true, "school ID required"],
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "students",
      required: [true, "school ID required"],
    },
    studentName: {
      type: String,
      required: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "parents",
      required: [true, "parent Id is required"],
    },
    parentName: {
      type: String,
      required: true,
    },
    assignedVehicleNumber: {
      type: Number,
      required: true,
    },
    selectedRoute: {
      type: Schema.Types.ObjectId,
      ref: "busRoutes",
      required: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "busDriver",
      required: true,
    },
    driverName: {
      type: String,
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
  },
  {
    timestamps: true,
  }
);

const StudentsTransport = model("StudentsTransport", studentTransportSchema);

module.exports = StudentsTransport;
