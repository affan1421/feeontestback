const mongoose = require("mongoose");
const express = require("express");
const ErrorResponse = require("../utils/errorResponse");
const SuccessResponse = require("../utils/successResponse");

const studentsCollection = mongoose.connection.db.collection("students");
const BusRoute = require("../models/busRoutes");
const BusDriver = require("../models/busDriver");
const SchoolVehicles = require("../models/schoolVehicles");

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
      bloodGroup,
      aadharNumber,
      schoolId,
      selectedRoute,
      assignedVehicle,
      assignedVehicleNumber,
      assignedTrips,
      address,
      attachments,
    } = req.body;

    const existingDriver = await BusDriver.findOne({
      $or: [{ drivingLicense }, { aadharNumber }, { contactNumber }, { emergencyNumber }],
    });

    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message:
          "Driver with the same driving license, Aadhar number, contact number, or emergency number already exists.",
      });
    }

    const newDriver = new BusDriver({
      name,
      salary,
      drivingLicense,
      contactNumber,
      emergencyNumber,
      bloodGroup,
      aadharNumber,
      schoolId,
      selectedRoute,
      assignedVehicle,
      assignedVehicleNumber,
      assignedTrips,
      address,
      attachments,
    });

    await newDriver.save();

    res.status(200).json(SuccessResponse(newDriver, 1, "New Driver Added Successfully"));
  } catch (error) {
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const editDriver = async (req, res, next) => {
  try {
    const { id } = req.query;

    const driver = await BusDriver.findOne({ _id: id });

    if (!driver) {
      return next(new ErrorResponse("Driver not found", 404));
    }

    res.status(200).json(SuccessResponse(driver, 1, "Driver Details Fetched successfully"));
  } catch (error) {
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const updateDriver = async (req, res, next) => {
  try {
    const { id } = req.query;
    const updatedData = req.body;

    const driver = await BusDriver.findByIdAndUpdate(id, { $set: updatedData }, { new: true });

    if (!driver) {
      return next(new ErrorResponse("Driver not found", 404));
    }
    res.status(200).json(SuccessResponse(driver, 1, "Updated Successfully"));
  } catch (error) {
    return next(new ErrorResponse("Something went wrong", 500));
  }
};

const deleteDriver = async (req, res, next) => {
  try {
    const { id } = req.query;

    const deleteDriver = await BusDriver.deleteOne({ _id: id });

    res.status(200).json(SuccessResponse("Driver Details Deleted Successfully"));
  } catch (error) {
    return next(new ErrorResponse("Something went wrong", 500));
  }
};

const listDrivers = async (req, res, next) => {
  try {
    const { schoolId, searchQuery } = req.query;

    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 6;
    const skip = (page - 1) * perPage;

    const filter = {
      schoolId: mongoose.Types.ObjectId(schoolId),
      $or: [
        { name: { $regex: new RegExp(searchQuery, "i") } },
        {
          selectedRoute: { $regex: new RegExp(searchQuery, "i") },
        },
      ],
    };

    const totalCount = await BusDriver.countDocuments(filter);
    const data = await BusDriver.find(filter).skip(skip).limit(perPage);
    res
      .status(200)
      .json(SuccessResponse(data, data.length, "Data fetched successfully", totalCount));
  } catch (error) {
    return next(new ErrorResponse("Something went Wrong", 500));
  }
};

const viewDriver = async (req, res, next) => {
  try {
    const { id } = req.query;
    const driver = await BusDriver.findOne({ _id: id });

    if (!driver) {
      return next(new ErrorResponse("Driver doesn't exist", 404));
    }
    res.status(200).json(SuccessResponse(driver, 1, "data fetched successfully"));
  } catch (error) {
    return next(new ErrorResponse("Something went wrong while viewing drivers", 500));
  }
};

//-------------------------vehicles------------------------------

const addNewVehicle = async (req, res, next) => {
  try {
    const {
      schoolId,
      registrationNumber,
      assignedVehicleNumber,
      totalSeats,
      assignedTrips,
      driverName,
      routeName,
      taxValid,
      fcValid,
      vehicleMode,
      attachments,
    } = req.body;

    const existingVehicle = await SchoolVehicles.findOne({
      $or: [{ registrationNumber }, { driverName }],
    });

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: "Vehicle with Same Registration Number or Same Driver already exists",
      });
    }

    const newVehicle = new SchoolVehicles({
      schoolId,
      registrationNumber,
      assignedVehicleNumber,
      totalSeats,
      assignedTrips,
      driverName,
      routeName,
      taxValid: new Date(taxValid),
      fcValid: new Date(fcValid),
      vehicleMode,
      attachments,
    });

    await newVehicle.save();

    res.status(200).json(SuccessResponse(newVehicle, 1, "New Vehicle added successfully"));
  } catch (error) {
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const editVehicle = async (req, res, next) => {
  try {
    const { id } = req.query;

    const vehicle = await SchoolVehicles.findOne({ _id: id });

    if (!vehicle) {
      return next(new ErrorResponse("Vehicle not Found", 404));
    }

    res.status(200).json({ success: true, message: "Vehicle data fetched Successfully" });
  } catch (error) {
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const updateVehicle = async (req, res, next) => {
  try {
    const { id } = req.query;
    const updatedData = req.body;

    const vehicle = await SchoolVehicles.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true }
    );

    res.status(200).json(SuccessResponse(vehicle, 1, "Vehicle Data Updated Successfully"));
  } catch (error) {
    return next(new ErrorResponse("Something went wrong while updating Vehicle details", 500));
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const { id } = req.query;
    await SchoolVehicles.deleteOne({ _id: id });
    res.status(200).json({ success: true, message: "Vehicle details deleted successfully" });
  } catch (error) {
    return next(new ErrorResponse("Something Went Wrong while Deleting vehicle data", 500));
  }
};

const listVehicles = async (req, res, next) => {
  try {
    const { schoolId, searchQuery } = req.query;
    const page = req.query.page || 1;
    const perPage = req.query.limit || 5;
    const skip = (page - 1) * perPage;

    const filter = {
      schoolId: mongoose.Types.ObjectId(schoolId),
      $or: [
        { routeName: { $regex: new RegExp(searchQuery, "i") } },
        {
          registrationNumber: { $regex: new RegExp(searchQuery, "i") },
        },
      ],
    };
    const totalCount = await SchoolVehicles.countDocuments(filter);
    const data = await SchoolVehicles.find(filter).skip(skip).limit(perPage);

    res
      .status(200)
      .json(SuccessResponse(data, data.length, "Vehicle data fetched sucessfully", totalCount));
  } catch (error) {
    return next(new ErrorResponse("Something went wrong while listing vehicles", 500));
  }
};

const viewVehicle = async (req, res, next) => {
  try {
    const { id } = req.query;
    const vehicle = await SchoolVehicles.findOne({ _id: id }).select("_id attachments");

    res.status(200).json(SuccessResponse(vehicle, 1, "Successfully Fetched"));
  } catch (error) {
    return next(new ErrorResponse("Something went wrong while viewing vehicle", 500));
  }
};

//-------------------------module-exports-----------------------------

module.exports = {
  createNewRoute,
  getRoutes,
  editRoutes,
  getEditRoutes,
  addNewDriver,
  editDriver,
  updateDriver,
  deleteDriver,
  listDrivers,
  viewDriver,
  addNewVehicle,
  editVehicle,
  updateVehicle,
  deleteVehicle,
  listVehicles,
  viewVehicle,
};
