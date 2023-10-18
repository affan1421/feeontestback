const mongoose = require("mongoose");
const express = require("express");
const ErrorResponse = require("../utils/errorResponse");
const SuccessResponse = require("../utils/successResponse");

const sectionsCollection = mongoose.connection.db.collection("sections");
const studentsCollection = mongoose.connection.db.collection("students");

const Concession = require("../models/concession");
const ConcessionReason = require("../models/concesionReasons");

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

    const feeCategoryData = feeCategoryIds.map((category) => ({
      categoryId: category.categoryId,
      feeInstallmentIds: category.feeInstallmentIds.map((installment) => ({
        feeInstallmentId: installment.feeInstallmentId,
        totalFees: installment.totalFees,
        concessionAmount: installment.concessionAmount || 0,
      })),
    }));

    const newConcession = new Concession({
      studentId,
      schoolId,
      sectionId,
      feeCategoryIds: feeCategoryData,
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
        section: mongoose.Types.ObjectId(classId),
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
                  $expr: { $in: ["$_id", "$$feeCategoryIds"] },
                },
              },
            ],
            as: "feecategories",
          },
        },
        {
          $project: {
            _id: 0,
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
                  status: { $in: ["Late", "Upcoming", "Due"] },
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
              { $project: { _id: 0 } },
            ],
          },
        },
        {
          $addFields: { feeinstallments: { $arrayElemAt: ["$feeinstallments", 0] } },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$feeinstallments.totalAmount" },
            paidAmount: { $sum: "$feeinstallments.paidAmount" },
            totalDiscountAmount: { $sum: "$feeinstallments.totalDiscountAmount" },
            netAmount: { $sum: "$feeinstallments.netAmount" },
            feeData: { $addToSet: "$$ROOT" },
          },
        },
        { $project: { _id: 0 } },
      ])
      .toArray();

    res.status(200).json(SuccessResponse(feeCategories?.[0], 1, "success"));
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

    const concession = await Concession.findByIdAndUpdate(
      concessionId,
      { $set: { status } },
      { new: true }
    );

    if (!concession) {
      return res.status(404).json({ message: "Concession not found" });
    }
    res.status(200).json(SuccessResponse(concession, 1, "Concession status updated successfully"));
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
                _id: "$sectionId",
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
              $sort: { concessionAmount: -1 },
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
              $sort: { concessionAmount: 1 }, // Corrected field name
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
          //Different types of reasons and its count
          reasons: [
            {
              $lookup: {
                from: "concessionreasons",
                localField: "reason",
                foreignField: "_id",
                as: "reason",
              },
            },
            { $addFields: { reason: { $arrayElemAt: ["$reason.reason", 0] } } },
            { $group: { _id: "$reason", count: { $sum: 1 } } },
            {
              $group: {
                _id: null,
                reasonResult: {
                  $push: { reason: "$_id", count: "$count" },
                },
              },
            },
            { $project: { _id: 0, reasonResult: 1 } },
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
    const minConcessionSection = totalConcessionResult[0].sectionMinConcession[0];

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
          concessionStudents: { $sum: 1 },
          concessionAmount: { $sum: "$totalConcession" },
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
          totalStudents: { $size: "$students" },
        },
      },
      {
        $project: {
          id: "$_id",
          _id: 0,
          className: 1,
          concessionStudents: 1,
          concessionAmount: 1,
          totalStudents: 1,
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

    res.status(200).json(SuccessResponse(getClassConcession, 1, "success"));
  } catch (error) {
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
};

const addConcessionReason = async (req, res, next) => {
  const { reason: reasonInput, schoolId } = req.body;
  console.log(req.body);
  try {
    if (!schoolId?.trim()) {
      return next(new ErrorResponse(`School Id is required`, 403));
    }
    const reason = reasonInput?.trim()?.toLowerCase();
    if (!reason) {
      return next(new ErrorResponse(`reason is required`, 403));
    }
    const existingReason = await ConcessionReason.findOne({ reason });
    if (existingReason) return next(new ErrorResponse("Reason already exists", 403));
    const result = await ConcessionReason.create({ reason, schoolId });
    res.status(200).json(SuccessResponse(result, 1, "Concession reason created successfully"));
  } catch (error) {
    console.log("Error while creating concession reason", error);
    return next(new ErrorResponse("Something went wrong", 500));
  }
};

const getConcessionReason = async (req, res, next) => {
  const { page, limit, schoolId } = req.query;
  if (!schoolId?.trim()) {
    return next(new ErrorResponse(`School Id is required`, 403));
  }
  try {
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;
    const totalCount = ConcessionReason.find({ schoolId }).count();
    // const result = ConcessionReason.find({ schoolId: schoolId }, "reason").skip(skip).limit(pageSize);
    const result = ConcessionReason.find({ schoolId: schoolId }, "reason");
    Promise.all([totalCount, result])
      .then(([count, result]) => {
        res
          .status(200)
          .json(
            SuccessResponse(
              { reasons: result, totalCount: count },
              result?.length,
              "Concession reasons fetched successfully"
            )
          );
      })
      .catch((err) => {
        console.log("Error while fetching concession reason", err);
        next(new ErrorResponse("Something went wrong", 500));
      });
  } catch (error) {
    console.log("Error while fetching concession reason", error);
    next(new ErrorResponse("Something went wrong", 500));
  }
};

async function updateConcessionReason(req, res, next) {
  const { id: idInput, reason: reasonInput } = req.body;
  if (!reasonInput?.trim()) {
    return next(new ErrorResponse("reason required!", 403));
  }
  try {
    const id = idInput?.trim();
    if (!id) {
      return next(new ErrorResponse("Reason Id required!", 403));
    }
    const reason = reasonInput?.trim().toLowerCase();
    const existingReason = await ConcessionReason.findOne({ reason });
    if (existingReason) return next(new ErrorResponse("This reason name already exists", 403));
    const result = await ConcessionReason.findByIdAndUpdate(
      id,
      { $set: { reason: reason } },
      { new: true }
    );
    res.status(200).json(SuccessResponse(result, 1, "Concession reasons updated successfully"));
  } catch (error) {
    return next(new ErrorResponse("Something went wrong", 500));
  }
}

const getStudentWithConcession = async (req, res, next) => {
  try {
    const { studentId } = req.query;

    const concessionData = await Concession.findOne({ studentId });

    const studentConcessionData = await Concession.aggregate([
      {
        $match: {
          studentId: mongoose.Types.ObjectId(studentId),
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "studentInfo",
        },
      },
      {
        $lookup: {
          from: "sections",
          localField: "sectionId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      {
        $unwind: "$feeCategoryIds",
      },
      {
        $lookup: {
          from: "feecategories",
          localField: "feeCategoryIds.categoryId",
          foreignField: "_id",
          as: "feeCategoryInfo",
        },
      },
      // {
      //   $lookup: {
      //     from: "feeinstallments",
      //     localField: "feeCategoryIds.feeInstallmentIds.feeInstallmentId",
      //     foreignField: "_id",
      //     as: "feeInstallmentInfo",
      //   },
      // },
      {
        $unwind: "$feeCategoryInfo",
      },

      {
        $project: {
          "feeCategoryInfo.name": 1,
          studentName: { $arrayElemAt: ["$studentInfo.name", 0] },
          className: { $arrayElemAt: ["$classInfo.className", 0] },
          totalAmount: 1,
          paidAmount: 1,
          discountAmount: 1,
          status: 1,
          reason: 1,
          schoolId: 1,
        },
      },
    ]);

    res.status(200).json(studentConcessionData);
  } catch (error) {
    console.log(error.message);
  }
};

const getClassesWithConcession = async (req, res, next) => {
  try {
    const { schoolId, sectionId, searchQuery } = req.query;

    const pipeline = [
      {
        $match: {
          schoolId: mongoose.Types.ObjectId(schoolId),
          sectionId: mongoose.Types.ObjectId(sectionId),
        },
      },
      {
        $lookup: {
          from: "sections",
          localField: "sectionId",
          foreignField: "_id",
          as: "sectionInfo",
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "sectionId",
          foreignField: "section",
          as: "studentsInfo",
        },
      },
      {
        $addFields: {
          totalStudentsCount: { $size: "$studentsInfo" },
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "studentsDetails",
        },
      },
      {
        $project: {
          id: "$_id",
          _id: 0,
          className: { $arrayElemAt: ["$sectionInfo.className", 0] },
          studentName: "$studentsDetails.name",
          totalAmount: 1,
          paidAmount: 1,
          discountAmount: 1,
          totalConcession: 1,
          status: 1,
          reason: 1,
          totalStudentsCount: 1,
        },
      },
      {
        $group: {
          _id: null,
          data: { $push: "$$ROOT" },
          totalFees: { $sum: "$totalAmount" },
          totalPaidFees: { $sum: "$paidAmount" },
          totalDiscountAmount: { $sum: "$discountAmount" },
          totalConcessionAmount: { $sum: "$totalConcession" },
          concessionStudentsCount: { $sum: 1 },
          className: { $first: "$className" },
          studentsCount: { $push: "$totalStudentsCount" },
        },
      },
      {
        $unwind: "$data"
      },
      {
        $match: {
          'data.studentName': { $regex: searchQuery, $options: "i" }
        }
      },
      {
        $group: {
          _id: null,
          data: { $push: "$data" },
          totalFees: { $sum: "$totalFees" },
          totalPaidFees: { $sum: "$totalPaidFees" },
          totalDiscountAmount: { $sum: "$totalDiscountAmount" },
          totalConcessionAmount: { $sum: "$totalConcessionAmount" },
          concessionStudentsCount: { $sum: "$concessionStudentsCount" },
          className: { $first: "$className" },
          studentsCount: { $first: "$studentsCount" }
        },
      },
      {
        $project: {
          _id: 0,
          data: 1,
          totalFees: 1,
          totalPaidFees: 1,
          totalDiscountAmount: 1,
          totalConcessionAmount: 1,
          concessionStudentsCount: 1,
          className: 1,
          studentsCount: 1
        },
      },
    ];
    
    

    const classData = await Concession.aggregate(pipeline);

    res.status(200).json(classData);
  } catch (error) {
    console.log(error.message);
  }
};

async function deleteConcessionReason(req, res, next) {
  const { id: idInput } = req.query;
  try {
    const id = idInput?.trim();
    if (!id) {
      return next(new ErrorResponse("Reason Id required!", 403));
    }
    const result = await ConcessionReason.findByIdAndDelete(id);
    if (!result) {
      return next(new ErrorResponse("No matching document found for deletion", 404));
    }
    res.status(200).json(SuccessResponse("Concession reason deleted successfully"));
  } catch (error) {
    return next(new ErrorResponse("Something went wrong", 500));
  }
}

module.exports = {
  createConcession,
  getStudentsByClass,
  getStudentFeeDetails,
  getConcessionCardData,
  getConcessionClassList,
  changeStatus,
  getStudentConcessionData,
  addConcessionReason,
  getConcessionReason,
  updateConcessionReason,
  getStudentWithConcession,
  getClassesWithConcession,
  deleteConcessionReason,
};
