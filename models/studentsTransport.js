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
    assignedVehicleNumber: {
      type: Number,
      required: true,
    },
    selectedRoute: {
      type: Schema.Types.ObjectId,
      ref: "busRoutes",
      required: true,
    },
    transportSchedule: {
      type: String,
      enum: ["One way", "Round trip"],
      default: "Round trip",
      required: true,
    },
    feeType: {
      type: String,
      enum: ["Monthly", "Quaterly", "Yearly"],
      default: "Monthly",
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
