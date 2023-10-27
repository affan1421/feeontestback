const mongoose = require("mongoose");
const express = require("express");
const ErrorResponse = require("../utils/errorResponse");
const SuccessResponse = require("../utils/successResponse");

const studentsCollection = mongoose.connection.db.collection("students");
const BusRoute = require("../models/busRoutes");

const createNewRoute = async (req, res, next) => {
  try {
    const { schoolId, routeName, startingPoint, stops } = req.body;

    const newRoute = new BusRoute({
      schoolId,
      routeName,
      startingPoint,
      stops,
    });

    const savedRoute = await newRoute.save();

    res.status(200).json(SuccessResponse(savedRoute, 1, "New Route Created Successfully"));
  } catch (error) {
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

module.exports = {
  createNewRoute,
};
