const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const busRoutesSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "schools",
      required: [true, "schoolID is required"],
    },
    routeName: {
      type: String,
      required: true,
    },
    startingPoint: {
      type: String,
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
          onewayFees: {
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
  },
  {
    timestamps: true,
  }
);

const busRoutes = model("busRoutes", busRoutesSchema);

module.exports = busRoutes;
