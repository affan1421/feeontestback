const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const tcReasonSchema = new Schema(
  {
    reason: String,
  },
  { timestamps: true }
);

const tcReason = model("tcReasons", tcReasonSchema);

module.exports = tcReason;
