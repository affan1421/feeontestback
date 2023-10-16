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
      discountAmount,
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
      discountAmount,
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
      return res.status(400).json({
        error: "Both Class ID and School ID are required in the query parameters.",
      });
    }

    // Assuming studentsCollection.find is an asynchronous function that returns a promise
    const students = await studentsCollection
      .find({
        class: mongoose.Types.ObjectId(classId),
        school_id: mongoose.Types.ObjectId(schoolId),
      })
      .toArray();

    if (!students || students.length === 0) {
      return res.status(404).json({
        error: "No students found for the specified classId and schoolId.",
      });
    }

    // Return the students as a JSON response
    res.status(200).json({ students });
  } catch (error) {
    console.error("Error:", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const getStudentFeeDetails = async (req, res, next) => {
  try {
    const { studentId, schoolId } = req.query;
    const student = await studentsCollection.findOne({
      _id: mongoose.Types.ObjectId(studentId),
      school_id: mongoose.Types.ObjectId(schoolId),
    });

    console.log(student, "Student");

    if (!student) {
      return next(new ErrorResponse("Student not found", 404));
    }

    // Now that you have the student document, you can use its feeCategoryIds
    // to fetch fee category names from the feeCategories collection.
    const feeCategoryIds = student.feeCategoryIds;
    console.log(feeCategoryIds, "feeCategoryIds");

    const feeCategories = await studentsCollection
      .aggregate([
        {
          $match: {
            _id: mongoose.Types.ObjectId(studentId),
            school_id: mongoose.Types.ObjectId(schoolId),
          },
        },
        {
          $lookup: {
            from: "feecategories",
            let: { feeCategoryIds: "$feeCategoryIds" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$_id", "$$feeCategoryIds"],
                  },
                },
              },
            ],
            as: "feecategories",
          },
        },
        {
          $project: {
            _id: -1,
            "feecategories._id": 1,
            "feecategories.name": 1,
          },
        },
        {
          $unwind: "$feecategories",
        },
        {
          $lookup: {
            from: "feeinstallments",
            localField: "feecategories._id",
            foreignField: "categoryId",
            as: "feeinstallments",
            pipeline: [
              {
                $match: {
                  studentId: mongoose.Types.ObjectId(studentId),
                  schoolId: mongoose.Types.ObjectId(schoolId),
                },
              },
              {
                $group: {
                  feedetails: {
                    $addToSet: "$$ROOT",
                  },
                  _id: null,
                  totalAmount: {
                    $sum: "$totalAmount",
                  },
                  paidAmount: {
                    $sum: "$paidAmount",
                  },
                  totalDiscountAmount: {
                    $sum: "$totalDiscountAmount",
                  },
                  netAmount: {
                    $sum: "$netAmount",
                  },
                },
              },
            ],
          },
        },
      ])
      .toArray();

    res.status(200).json(SuccessResponse(feeCategories, 1, "success"));
  } catch (error) {
    console.error("Error:", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const getStudentConcessionData = async (req, res, next) => {
  try {
    const { schoolId, studentId, status, page, limit, searchQuery } = req.query;

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 5;
    const skip = (pageNumber - 1) * pageSize;

    const filter = {
      schoolId: mongoose.Types.ObjectId(schoolId),
    };

    const pipeline = [
      {
        $match: { schoolId: mongoose.Types.ObjectId(schoolId) },
      },
      {
        $lookup: {
          from: "students",
          foreignField: "_id",
          localField: "studentId",
          as: "studentList",
        },
      },
      {
        $lookup: {
          from: "sections",
          foreignField: "_id",
          localField: "sectionId",
          as: "class",
        },
      },
      {
        $unwind: {
          path: "$studentList",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$class",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          id: "$_id",
          _id: 0,
          fees: "$totalAmount",
          paidAmount: 1,
          discountAmount: 1,
          concessionAmount: "$totalConcession",
          status: 1,
          studentName: "$studentList.name",
          className: "$class.className",
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: pageSize,
      },
    ];

    if (searchQuery && searchQuery.trim() !== "") {
      pipeline.push({
        $match: {
          $or: [
            { studentName: { $regex: searchQuery, $options: "i" } },
            { className: { $regex: searchQuery, $options: "i" } },
          ],
        },
      });
    }

    if (status) {
      pipeline[0].$match.status = status; //this will add the field to the pipeline
    }

    const concessions = await Concession.aggregate(pipeline);

    const totalDocuments = await Concession.countDocuments(filter);

    res.status(200).json({ concessions, totalDocuments });
  } catch (error) {
    console.error("Error:", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const changeStatus = async (req, res, next) => {
  try {
    const concessionId = req.params.id;
    const { status } = req.query;

    if (!concessionId || !status) {
      return res.status(400).json({ message: "Concression Id and Status Id are required" });
    }

    const concession = await Concession.findById(concessionId);

    if (!concession) {
      return res.status(404).json({ message: "Concession not found" });
    }

    // Update concession status
    concession.status = status;
    await concession.save();
    res.status(200).json(SuccessResponse(null, 1, "Concession status updated successfully"));
  } catch (error) {
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const getConcessionCardData = async (req, res, next) => {
  try {
    const { schoolId } = req.query;

    const totalConcessionResult = await Concession.aggregate([
      {
        $match: {
          schoolId: mongoose.Types.ObjectId(schoolId),
        },
      },
      {
        $facet: {
          totalConcessionAmount: [
            {
              $group: {
                _id: null,
                totalConcessionSum: { $sum: "$totalConcession" },
              },
            },
            { $project: { _id: 0, totalConcessionSum: 1 } },
          ],
          studentData: [
            {
              $lookup: {
                from: "students",
                localField: "studentId",
                foreignField: "_id",
                as: "studentInfo",
              },
            },
            {
              $unwind: "$studentInfo",
            },
            {
              $group: {
                _id: "$studentInfo.gender",
                count: { $sum: 1 },
              },
            },
            {
              $project: { _id: 0, gender: "$_id", count: 1 },
            },
          ],
          totalStudentCount: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
            {
              $project: { _id: 0, count: 1 },
            },
          ],
          classCount: [
            {
              $group: {
                _id: "$secsionId",
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
            { $project: { _id: 0, count: 1 } },
          ],
          sectionMaxConcession: [
            // Find section with maximum concession
            {
              $group: {
                _id: "$sectionId",
                concessionAmount: { $sum: "$totalConcession" },
              },
            },
            {
              $sort: { totalConcessionSum: -1 },
            },
            {
              $limit: 1,
            },
            {
              $lookup: {
                from: "sections",
                localField: "_id",
                foreignField: "_id",
                as: "sectionInfo",
              },
            },
            {
              $unwind: "$sectionInfo",
            },
            {
              $project: {
                _id: 0,
                sectionName: "$sectionInfo.className",
                concessionAmount: 1,
              },
            },
          ],
          sectionMinConcession: [
            // Find section with minimum concession
            {
              $group: {
                _id: "$sectionId",
                concessionAmount: { $sum: "$totalConcession" },
              },
            },
            {
              $sort: { totalConcessionSum: 1 },
            },
            {
              $limit: 1,
            },
            {
              $lookup: {
                from: "sections",
                localField: "_id",
                foreignField: "_id",
                as: "sectionInfo",
              },
            },
            {
              $unwind: "$sectionInfo",
            },
            {
              $project: {
                _id: 0,
                sectionName: "$sectionInfo.className",
                concessionAmount: 1,
              },
            },
          ],
        },
      },
    ]);

    const totalConcessionAmount =
      totalConcessionResult[0].totalConcessionAmount[0].totalConcessionSum;
    const studentData = totalConcessionResult[0].studentData;
    const totalStudentCount = totalConcessionResult[0].totalStudentCount[0].count;
    const uniqueClassCount = totalConcessionResult[0].classCount[0].count;
    const maxConcessionSection = totalConcessionResult[0].sectionMaxConcession[0];
    const minConcessionSection = totalConcessionResult[0].sectionMaxConcession[0];

    res.status(200).json(
      SuccessResponse(
        {
          totalConcessionAmount,
          studentData,
          totalStudentCount,
          uniqueClassCount,
          maxConcessionSection,
          minConcessionSection,
        },
        1,
        "success"
      )
    );
  } catch (error) {
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const getConcessionClassList = async (req, res, next) => {
  try {
    const { schoolId, searchQuery, page, limit } = req.query;

    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 5;
    const skip = (pageNumber - 1) * pageSize;

    const getClassConcession = await Concession.aggregate([
      {
        $match: {
          schoolId: mongoose.Types.ObjectId(schoolId),
        },
      },
      {
        $lookup: {
          from: "sections",
          localField: "sectionId",
          foreignField: "_id",
          as: "classDetails",
        },
      },
      {
        $unwind: "$classDetails",
      },
      {
        $group: {
          _id: "$classDetails._id",
          className: { $first: "$classDetails.className" },
          numStudentsWithConcession: { $sum: 1 },
          totalConcession: { $sum: "$totalConcession" },
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "_id",
          foreignField: "section",
          as: "students",
        },
      },
      {
        $addFields: {
          totalStudentsInClass: { $size: "$students" },
        },
      },
      {
        $project: {
          className: 1,
          numStudentsWithConcession: 1,
          totalConcession: 1,
          totalStudentsInClass: 1,
        },
      },
      {
        $match: {
          className: { $regex: searchQuery, $options: "i" },
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: pageSize,
      },
    ]);

    res.status(200).json(
      SuccessResponse(
        {
          getClassConcession,
        },
        1,
        "success"
      )
    );
  } catch (error) {
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

module.exports = {
  createConcession,
  getClassDetails,
  getStudentsByClass,
  getStudentFeeDetails,
  getConcessionCardData,
  getConcessionClassList,
  changeStatus,
  getStudentConcessionData,
};
