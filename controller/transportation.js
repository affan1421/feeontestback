const mongoose = require("mongoose");
const express = require("express");
const ErrorResponse = require("../utils/errorResponse");
const SuccessResponse = require("../utils/successResponse");
const moment = require("moment");

const studentsCollection = mongoose.connection.db.collection("students");
const sectionsCollection = mongoose.connection.db.collection("sections");
const BusRoute = require("../models/busRoutes");
const BusDriver = require("../models/busDriver");
const SchoolVehicles = require("../models/schoolVehicles");
const StudentsTransport = require("../models/studentsTransport");
const busRoutes = require("../models/busRoutes");

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
      $or: [{ name: { $regex: new RegExp(searchQuery, "i") } }],
    };

    const totalCount = await BusDriver.countDocuments(filter);
    const data = await BusDriver.find(filter)
      .populate("selectedRoute", "routeName")
      .skip(skip)
      .limit(perPage);

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
    const driver = await BusDriver.findOne({ _id: id }).populate("selectedRoute", "routeName");

    if (!driver) {
      return next(new ErrorResponse("Driver doesn't exist", 404));
    }
    res.status(200).json(SuccessResponse(driver, 1, "data fetched successfully"));
  } catch (error) {
    console.log("Error while viewing drivers", error.message);
    return next(new ErrorResponse("Something went wrong", 500));
  }
};

const routeList = async (req, res, next) => {
  try {
    const { schoolId } = req.query;
    const filter = { schoolId: mongoose.Types.ObjectId(schoolId) };
    const routelist = await BusRoute.find(filter).select("routeName");
    res.status(200).json(SuccessResponse(routelist, routelist.length, "Successfully fetched"));
  } catch (error) {
    console.log("Error while listing routes ", error.message);
    return next(new ErrorResponse("Something went wrong", 500));
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
      availableSeats,
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

    const formattedTaxValid = moment(taxValid, "DD/MM/YYYY").toDate();
    const formattedFcValid = moment(fcValid, "DD/MM/YYYY").toDate();

    const newVehicle = new SchoolVehicles({
      schoolId,
      registrationNumber,
      assignedVehicleNumber,
      totalSeats,
      availableSeats,
      assignedTrips,
      driverName,
      routeName,
      taxValid: formattedTaxValid,
      fcValid: formattedFcValid,
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
    console.log("Error while updating Vehicle details", error.message);
    return next(new ErrorResponse("Something went wrong", 500));
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const { id } = req.query;
    await SchoolVehicles.deleteOne({ _id: id });
    res.status(200).json({ success: true, message: "Vehicle details deleted successfully" });
  } catch (error) {
    console.log("Error while Deleting vehicle data", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
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
        {
          registrationNumber: { $regex: new RegExp(searchQuery, "i") },
        },
      ],
    };
    const totalCount = await SchoolVehicles.countDocuments(filter);
    const data = await SchoolVehicles.find(filter)
      .populate("driverName", "name")
      .populate("routeName", "routeName")
      .skip(skip)
      .limit(perPage);

    res
      .status(200)
      .json(SuccessResponse(data, data.length, "Vehicle data fetched sucessfully", totalCount));
  } catch (error) {
    console.log("Error while listing vehicles", error.message);
    return next(new ErrorResponse("Some thing went wrong", 500));
  }
};

const viewVehicle = async (req, res, next) => {
  try {
    const { id } = req.query;
    const vehicle = await SchoolVehicles.findOne({ _id: id }).select("_id attachments");

    res.status(200).json(SuccessResponse(vehicle, 1, "Successfully Fetched"));
  } catch (error) {
    console.log("Error while viewing vehicle", error.message);
    return next(new ErrorResponse("Something went wrong", 500));
  }
};

const driverList = async (req, res, next) => {
  try {
    const { schoolId } = req.query;
    filter = { schoolId: mongoose.Types.ObjectId(schoolId) };
    const driverlist = await BusDriver.find(filter).select("name");
    res.status(200).json(SuccessResponse(driverlist, driverlist.length, "Fetched Successfully"));
  } catch (error) {
    console.log("Error while viewing driver-list", error.message);
    return next(new ErrorResponse("Something went wrong", 500));
  }
};

//----------------------------students--------------------------------

const getAllClasses = async (req, res, next) => {
  try {
    const { schoolId } = req.query;
    const classList = await sectionsCollection
      .aggregate([
        {
          $match: {
            school: mongoose.Types.ObjectId(schoolId),
          },
        },
        {
          $project: {
            class_id: 1,
            className: 1,
          },
        },
      ])
      .toArray();

    if (classList.length === 0) {
      return res.status(404).json({ message: "No classes found" });
    }

    res
      .status(200)
      .json(SuccessResponse(classList, classList.length, "Classes details fetch successfully"));
  } catch (error) {
    console.error("Error fetching classes list:", error);
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const getClassWiseStudents = async (req, res, next) => {
  try {
    const { classId, schoolId } = req.query;

    if (!classId || !schoolId) {
      return res.status(400).json({
        error: "Both Class ID and School ID are required in the query parameters.",
      });
    }

    const students = await studentsCollection
      .aggregate([
        {
          $match: {
            section: mongoose.Types.ObjectId(classId),
            school_id: mongoose.Types.ObjectId(schoolId),
          },
        },
        {
          $project: {
            name: 1,
          },
        },
      ])

      .toArray();

    if (!students || students.length === 0) {
      return res.status(404).json({
        error: "No students found for the specified classId and schoolId.",
      });
    }

    res.status(200).json(SuccessResponse(students, students.length, "succesfullly fetched"));
  } catch (error) {
    console.error("Went wrong while fetching students data", error.message);
    return next(new ErrorResponse("Something went wrong", 500));
  }
};

const getVehicleNumbers = async (req, res, next) => {
  try {
    const { schoolId } = req.query;
    const vehicleNumbers = await SchoolVehicles.find({
      schoolId: mongoose.Types.ObjectId(schoolId),
    }).select("assignedVehicleNumber");

    res.status(200).json(SuccessResponse(vehicleNumbers, vehicleNumbers.length, "Successful"));
  } catch (error) {
    console.error("Went wrong while fetching vehicle numbers", error.message);
    return next(new ErrorResponse("Something went wrong", 500));
  }
};

const addStudentTransport = async (req, res, next) => {
  try {
    const {
      schoolId,
      sectionId,
      studentId,
      assignedVehicleNumber,
      selectedRoute,
      transportSchedule,
      feeType,
      feeAmount,
      vehicleMode,
    } = req.body;

    const existingStudent = await StudentsTransport.findOne({
      studentId: mongoose.Types.ObjectId(studentId),
    });

    if (existingStudent) {
      return next(new ErrorResponse("Student already exist", 404));
    }

    const newStudentTransport = new StudentsTransport({
      schoolId,
      sectionId,
      studentId,
      assignedVehicleNumber,
      selectedRoute,
      transportSchedule,
      feeType,
      feeAmount,
      vehicleMode,
    });

    await SchoolVehicles.findOneAndUpdate(
      { assignedVehicleNumber: assignedVehicleNumber },
      { $inc: { availableSeats: -1 } }
    );

    await newStudentTransport.save();

    res
      .status(200)
      .json(
        SuccessResponse(newStudentTransport, 1, "Student Transport details added successfully")
      );
  } catch (error) {
    console.error("Went wrong while adding student transport", error.message);
    return next(new ErrorResponse("Something went wrong", 500));
  }
};

//-------------------------dashboard-data----------------------------

const getDashboardCount = async (req, res, next) => {
  try {
    const { schoolId } = req.query;
    const filter = { schoolId: mongoose.Types.ObjectId(schoolId) };
    const [studentsCount, routesCount, vehiclesCount, driverCount] = await Promise.all([
      StudentsTransport.countDocuments(filter),
      busRoutes.countDocuments(filter),
      SchoolVehicles.countDocuments(filter),
      BusDriver.countDocuments(filter),
    ]);
    res.status(200).json({ studentsCount, routesCount, vehiclesCount, driverCount });
  } catch (error) {
    console.error("Went wrong while fetching dashboard data", error.message);
    return next(new ErrorResponse("Something went wrong", 500));
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
  routeList,
  addNewVehicle,
  editVehicle,
  updateVehicle,
  deleteVehicle,
  listVehicles,
  viewVehicle,
  driverList,
  getAllClasses,
  getClassWiseStudents,
  getVehicleNumbers,
  addStudentTransport,
  getDashboardCount,
};
