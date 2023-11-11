const mongoose = require("mongoose");
const autoIncrement = require("mongoose-auto-increment");
const { Schema, model } = mongoose;

const busRoutesSchema = new Schema(
  {
    routeName: {
      type: String,
      required: true,
    },
    registrationNumber: {
      type: String,
      required: true,
    },
    assignedVehicleNumber: {
      type: Number,
      required: true,
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: "busDriver",
      required: [true, "driverId is required"],
    },
    driverName: {
      type: String,
      required: true,
    },
    tripNo: {
      type: Number,
      required: true,
      unique: true,
    },
    seatingCapacity: {
      type: Number,
      required: true,
    },
    availableSeats: {
      type: Number,
      required: true,
    },
    stops: [
      {
        label: {
          type: String,
          required: true,
        },
        data: {
          stop: {
            type: String,
            required: true,
          },
          oneWay: {
            type: Number,
            required: true,
            default: 0,
          },
          roundTrip: {
            type: Number,
            required: true,
            default: 0,
          },
        },
      },
    ],
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "schools",
      required: [true, "schoolID is required"],
    },
  },
  {
    timestamps: true,
  }
);

const autoIncrementOptions = {
  model: "busRoutes",
  field: "tripNo",
  startAt: 1,
};

busRoutesSchema.plugin(autoIncrement.plugin, autoIncrementOptions);

const busRoutes = model("busRoutes", busRoutesSchema);

module.exports = busRoutes;
