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

const getRoutes = async (req, res, next) => {
  try {
    const { schoolId, searchQuery, page, limit } = req.query;

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 5;
    const skip = (pageNumber - 1) * pageSize;

    const query = {
      schoolId: mongoose.Types.ObjectId(schoolId),
    };

    if (searchQuery) {
      query.$or = [
        { routeName: { $regex: searchQuery, $options: "i" } },
        { startingPoint: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const routes = await BusRoute.find(query).skip(skip).limit(pageSize);

    res.status(200).json(SuccessResponse(routes, routes.length, "Fetched Successfully"));
  } catch (error) {
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

module.exports = {
  createNewRoute,
  getRoutes,
};
