const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const busDriversSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    salary: {
      type: Number,
      required: true,
    },
    drivingLicense: {
      type: String,
      required: true,
    },
    contactNumber: {
      type: Number,
      required: true,
    },
    emergencyNumber: {
      type: Number,
      required: true,
    },
    aadharNumber: {
      type: Number,
      required: true,
    },
    selectedRoute: {
      type: String,
      required: true,
    },
    assignedVehicle: {
      type: String,
      required: true,
    },
    assignedTrips: {
      type: Number,
      required: true,
    },
    attachments: [
      {
        type: [String],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const BusDriver = model("BusDriver", busDriversSchema);

module.exports = BusDriver;
