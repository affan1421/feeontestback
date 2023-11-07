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
      unique: true,
      required: true,
    },
    totalSeats: {
      type: Number,
      required: true,
    },
    availableSeats: {
      type: Number,
      default: function () {
        return this.totalSeats;
      },
    },
    assignedTrips: {
      type: Number,
      required: true,
    },
    driverName: {
      type: Schema.Types.ObjectId,
      ref: "busDriver",
      required: true,
    },
    routeName: {
      type: Schema.Types.ObjectId,
      ref: "busRoutes",
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
