const mongoose = require("mongoose");
const express = require("express");
const ErrorResponse = require("../utils/errorResponse");
const SuccessResponse = require("../utils/successResponse");

const studentsCollection = mongoose.connection.db.collection("students");
const BusRoute = require("../models/busRoutes");
const BusDriver = require("../models/busDriver");

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

const getEditRoutes = async (req, res, next) => {
  try {
    const { routeId } = req.query;

    const data = await BusRoute.findOne({ _id: routeId });

    if (!data) {
      return next(new ErrorResponse("Route not found", 404));
    }

    res.status(200).json(SuccessResponse(data, 1, "Route Fetched Successfully"));
  } catch (error) {
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const editRoutes = async (req, res, next) => {
  try {
    const { routeId } = req.query;
    const updatedData = req.body;

    const data = await BusRoute.findByIdAndUpdate(routeId, { $set: updatedData }, { new: true });

    if (!data) {
      return next(new ErrorResponse("Route not found", 404));
    }

    res.status(200).json(SuccessResponse(data, 1, "Route Updated Successfully"));
  } catch (error) {
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

//-------------------------bus driver---------------------------

const addNewDriver = async (req, res, next) => {
  try {
    const {
      name,
      salary,
      drivingLicense,
      contactNumber,
      emergencyNumber,
      aadharNumber,
      selectedRoute,
      assignedVehicle,
      assignedTrips,
      attachments,
    } = req.body;

    const newDriver = new BusDriver({
      name,
      salary,
      drivingLicense,
      contactNumber,
      emergencyNumber,
      aadharNumber,
      selectedRoute,
      assignedVehicle,
      assignedTrips,
      attachments,
    });

    await newDriver.save();

    res.status(200).json(SuccessResponse(newDriver, 1, "New Route Created Successfully"));
  } catch (error) {
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

//-------------------------module-exports-----------------------------

module.exports = {
  createNewRoute,
  getRoutes,
  editRoutes,
  getEditRoutes,
  addNewDriver,
};
