const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const vehicleSchema = new Schema(
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
    assignedVehicleNumber: {
      type: Number,
      required: true,
    },
    selectedRoute: {
      type: Schema.Types.ObjectId,
      ref: "busRoutes",
      required: true,
    },
    seatsAvailable: {
      type: Number,
      required: true,
    },
    feeType: {
      type: String,
      enum: [Monthly, Quaterly, Yearly],
      default: Monthly,
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

const StudentsTransport = model("StudentsTransport", vehicleSchema);

module.exports = StudentsTransport;
