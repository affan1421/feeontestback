const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const vehicleSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "schools",
      required: [true, "school ID required"],
    },
    registrationNumber: {
      type: String,
      required: true,
    },
    assignedVehicleNumber: {
      type: Number,
      required: true,
    },
    totalSeats: {
      type: Number,
      required: true,
    },
    assignedTrips: {
      type: Number,
      required: true,
    },
    driverName: {
      type: Schema.Types.ObjectId,
      ref: "busDrivers",
      required: true,
    },
    routeName: {
      type: String,
      required: true,
    },
    taxValid: {
      type: Date,
      required: true,
    },
    fcValid: {
      type: Date,
      required: true,
    },
    vehicleMode: {
      type: String,
      required: true,
    },
    attachments: {
      type: [String],
    },
  },
  {
    timestamps: true,
  }
);

const SchoolVehicles = model("SchoolVehicles", vehicleSchema);

module.exports = SchoolVehicles;
