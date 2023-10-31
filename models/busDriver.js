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
    bloodGroup: {
      type: String,
    },
    aadharNumber: {
      type: Number,
      required: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "schools",
      required: [true, "school ID required"],
    },
    selectedRoute: {
      type: String,
      required: true,
    },
    assignedVehicle: {
      type: String,
      required: true,
    },
    assignedVehicleNumber: {
      type: Number,
      required: true,
    },
    assignedTrips: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
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
