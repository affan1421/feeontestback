const mongoose = require("mongoose");
const express = require("express");
const ErrorResponse = require("../utils/errorResponse");
const SuccessResponse = require("../utils/successResponse");

const sectionsCollection = mongoose.connection.db.collection("sections");
const studentsCollection = mongoose.connection.db.collection("students");

const Concession = require("../models/concession");

const createConcession = async (req, res, next) => {
  try {
    const {
      studentId,
      schoolId,
      sectionId,
      feeCategoryIds,
      totalConcession,
      totalAmount,
      paidAmount,
      dueAmount,
      comment,
      status,
      attachments,
    } = req.body;

    const newConcession = new Concession({
      studentId,
      schoolId,
      sectionId,
      feeCategoryIds,
      totalConcession,
      totalAmount,
      paidAmount,
      dueAmount,
      comment,
      status,
      attachments,
    });

    const savedConcession = await newConcession.save();

    res.status(200).json(SuccessResponse(savedConcession, 1, "Concession provided successfully"));
  } catch (error) {
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const getClassDetails = async (req, res, next) => {
  try {
    const classList = await sectionsCollection
      .aggregate([
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

    res.status(200).json(SuccessResponse(classList, 1, "Classes details fetch successfully"));
  } catch (error) {
    console.error("Error fetching classes list:", error);
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const getStudentsByClass = async (req, res, next) => {
  try {
    const { classId, schoolId } = req.query;

    if (!classId || !schoolId) {
      return res
        .status(400)
        .json({ error: "Both Class ID and School ID are required in the query parameters." });
    }

    // Assuming studentsCollection.find is an asynchronous function that returns a promise
    const students = await studentsCollection
      .find({
        class: mongoose.Types.ObjectId(classId),
        school_id: mongoose.Types.ObjectId(schoolId),
      })
      .toArray();

    console.log(students, "pppppppppp");

    if (!students || students.length === 0) {
      return res
        .status(404)
        .json({ error: "No students found for the specified classId and schoolId." });
    }

    // Return the students as a JSON response
    res.status(200).json({ students });
  } catch (error) {
    console.error("Error:", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

module.exports = {
  createConcession,
  getClassDetails,
  getStudentsByClass,
};
