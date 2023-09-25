const mongoose = require("mongoose");
const AWS = require("aws-sdk");
const express = require("express");

const studentsCollection = mongoose.connection.db.collection("students");
const sectionsCollection = mongoose.connection.db.collection("sections");

const s3 = new AWS.S3();
const StudentTransfer = require("../models/transferCertificate");
const FeeStructure = require("../models/feeInstallment");
const ErrorResponse = require("../utils/errorResponse");

const SuccessResponse = require("../utils/successResponse");

async function createStudentTransfer(req, res, next) {
  try {
    const { studentId, classId, tcType, reason, transferringSchool, attachments } = req.body;

    // Check if a student transfer record with the same studentId already exists
    const existingTransfer = await StudentTransfer.findOne({
      studentId,
    }).exec();

    if (existingTransfer) {
      return res.status(400).json({
        success: false,
        message: "A transfer record for this student already exists",
      });
    }

    const feeData = await FeeStructure.aggregate([
      {
        $match: { studentId: mongoose.Types.ObjectId(studentId) },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          paidAmount: { $sum: "$paidAmount" },
        },
      },
    ]).exec();

    console.log(feeData, "feedata");

    const totalFees = feeData.length > 0 ? feeData[0].totalAmount : 0;
    const paidFees = feeData.length > 0 ? feeData[0].paidAmount : 0;
    const pendingFees = totalFees - paidFees;

    if (tcType === "AVAIL-TC" && (!attachments || attachments.length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Attachments are required when tcType is AVAIL-TC",
      });
    }

    if (pendingFees > 0) {
      return res.status(400).json({
        success: false,
        message: "TC cannot be generated due to pending fees",
      });
    }

    const newStudentTransfer = new StudentTransfer({
      studentId,
      classId,
      tcType,
      reason,
      transferringSchool,
      attachments,
    });

    await newStudentTransfer.save();
    res.status(200).json(SuccessResponse(newStudentTransfer, 1, "Student transfer record created successfully"));
  } catch (error) {
    console.error("Error creating student transfer record:", error);
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
}

/**
 * This function aggregates and give users list based on search query, With pagination
 * #### INPUTS PARAMS
 * * school = schoolId of students
 * * searchQuery = user name
 * * page = Page number
 * * limit = Limit of data for each page
 * * classId (Optional) = class id of user
 * @param {express.Request} req - Express request object
 * @param {express.Response} res - Express response object
 * @param {express.NextFunction} next - Express NextFunction
 * @returns Users data with pagination
 *
 */
async function searchStudentsWithPagination(req, res, next) {
  try {
    // sets default values
    const defaultPageLimit = 10;
    const defaultPageNumber = 1;

    // collecting nessory data
    const requestData = {
      searchQuery: req.query?.searchQuery?.trim(),
      classId: req.query?.classId?.trim()?.split("_")?.[0],
      className: req.query?.classId?.trim()?.split("_")?.[1],
      page: parseInt(req.query?.page?.trim()) || defaultPageNumber,
      limit: parseInt(req.query?.limit?.trim()) || defaultPageLimit,
      school: req.query?.school?.trim(),
    };

    // creating additonal nessory data
    const regexToSearchStudentName = new RegExp(requestData.searchQuery, "i");
    const pageNumber = requestData.page;
    const pageSize = requestData.limit; // we put it 10 as default
    const skip = (pageNumber - 1) * pageSize;

    const initialFilterQuery = {
      deleted: false,
      school_id: mongoose.Types.ObjectId(requestData.school),
      name: regexToSearchStudentName,
    };

    const filterStudentsByClassName = {};

    if (requestData.classId && requestData.classId != "default") {
      filterStudentsByClassName.class = requestData.className;
      initialFilterQuery.class = mongoose.Types.ObjectId(requestData.classId);
    }

    const result = await studentsCollection
      .aggregate([
        { $match: initialFilterQuery },
        {
          $facet: {
            // First facet: Calculate the totalDocs count
            totalDocs: [
              {
                $group: {
                  _id: null,
                  totalDocs: { $sum: 1 },
                },
              },
              { $project: { _id: 0 } },
            ],
            // Second facet: Fetch student data along with fees
            students: [
              {
                $lookup: {
                  from: "sections",
                  localField: "class",
                  foreignField: "class_id",
                  as: "class",
                },
              },
              { $addFields: { class: { $arrayElemAt: ["$class", 0] } } },
              {
                $lookup: {
                  from: "feeinstallments",
                  localField: "_id",
                  foreignField: "studentId",
                  as: "fees",
                  pipeline: [
                    {
                      $group: {
                        _id: "totalAmount",
                        totalAmount: { $sum: "$totalAmount" },
                        paidAmount: { $sum: "$paidAmount" },
                      },
                    },
                    { $project: { _id: 0 } },
                  ],
                },
              },
              { $addFields: { fees: { $arrayElemAt: ["$fees", 0] } } },
              {
                $project: {
                  _id: 1,
                  name: 1,
                  class: "$class.className",
                  classId: "$class.class_id",
                  fees: 1,
                },
              },
              { $match: filterStudentsByClassName }, //
              { $skip: skip },
              { $limit: pageSize },
            ],
          },
        },
        { $unwind: "$students" },
        { $addFields: { totalDocs: { $arrayElemAt: ["$totalDocs", 0] } } },
        {
          $project: {
            _id: "$students._id",
            totalDocs: "$totalDocs.totalDocs",
            name: "$students.name",
            className: "$students.class",
            fees: "$students.fees",
            classId: "$students.classId",
          },
        },
      ])
      .toArray();

    res.status(200).json(SuccessResponse(result, 1, "Student details fetch successfully"));
  } catch (error) {
    console.error("Error Student details fetch:", error);
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
}

async function changeStatus(req, res, next) {
  try {
    const transferId = req.params.id;
    const { status } = req.query;

    if (!transferId || !status) {
      return res.status(400).json({ message: "Transfer Id and status are required" });
    }

    const transfer = await StudentTransfer.findById(transferId);

    if (!transfer) {
      return res.status(404).json({ message: "Transfer certificate not found" });
    }

    // Update transfer status
    transfer.status = status;
    await transfer.save();
    res.status(200).json(SuccessResponse(null, 1, "Transfer certificate status updated successfully"));
  } catch (error) {
    console.error("Error on update status:", error);
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
}

async function getStudentIdByName(name) {
  const regexName = new RegExp(name, "i");
  const student = await studentsCollection.find({ name: regexName }).toArray();
  if (student.length === 0) {
    return null;
  }
  return student;
}

async function getTc(req, res, next) {
  try {
    const { searchQuery, classes, tcType, tcStatus } = req.query;
    const query = {};
    let stdIds = null;
    if (searchQuery) {
      stdIds = await getStudentIdByName(searchQuery);
    }
    if (stdIds) {
      query.studentId = { $in: stdIds };
    }
    if (classes) {
      query.classId = mongoose.Types.ObjectId(classes);
    }

    if (tcType) {
      query.tcType = tcType;
    }

    if (tcStatus) {
      query.status = tcStatus;
    }

    const result = await StudentTransfer.find(query).exec();

    res.status(200).json(SuccessResponse(result, 1, "Transfer certificate status updated successfully"));
  } catch (error) {
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
}

async function getTcDetails(req, res, next) {
  try {
    const tcsCount = await StudentTransfer.countDocuments();

    const tsData = await StudentTransfer.aggregate([
      {
        $facet: {
          //First Facet : get different types of tc's and its count
          countsByType: [
            {
              $group: {
                _id: "$tcType",
                total: { $sum: 1 },
                pending: {
                  $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] },
                },
                approved: {
                  $sum: { $cond: [{ $eq: ["$status", "APPROVED"] }, 1, 0] },
                },
                rejected: {
                  $sum: { $cond: [{ $eq: ["$status", "REJECTED"] }, 1, 0] },
                },
              },
            },
            {
              $group: {
                _id: null,
                typeResult: {
                  $push: {
                    tcType: "$_id",
                    total: "$total",
                    pending: "$pending",
                    approved: "$approved",
                    rejected: "$rejected",
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                typeResult: 1,
              },
            },
          ],
          //Second Facet : get different types of reasons and its count
          reasons: [
            {
              $group: {
                _id: "$reason",
                count: { $sum: 1 },
              },
            },
            {
              $group: {
                _id: null,
                reasonResult: {
                  $push: {
                    reason: "$_id",
                    count: "$count",
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                reasonResult: 1,
              },
            },
          ],
          //Third Facet : get different types of classes and its count
          class: [
            {
              $lookup: {
                from: "students",
                localField: "studentId",
                foreignField: "_id",
                as: "associatedStudent",
              },
            },
            {
              $unwind: "$associatedStudent",
            },
            {
              $lookup: {
                from: "sections",
                localField: "associatedStudent.section",
                foreignField: "_id",
                as: "associatedSection",
              },
            },
            {
              $unwind: "$associatedSection",
            },
            {
              $group: {
                _id: "$associatedSection.className",
                count: { $sum: 1 },
              },
            },
            {
              $group: {
                _id: null,
                classResult: {
                  $addToSet: {
                    className: "$_id",
                    count: "$count",
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                classResult: 1,
              },
            },
          ],
          //unique class count
          classCount: [
            {
              $group: {
                _id: "$classId",
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                count: 1,
              },
            },
          ],

          //unique reason count
          reasonsCount: [
            {
              $group: {
                _id: "$reason",
              },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                count: 1,
              },
            },
          ],
        },
      },
    ]);

    const countsByType = tsData[0].countsByType[0];
    const reasonsData = tsData[0].reasons[0];
    const reasonCount = tsData[0].reasonsCount[0].count;
    const classData = tsData[0].class[0];
    const classCount = tsData[0].classCount[0].count;

    res.status(200).json(
      SuccessResponse(
        {
          countsByType,
          reasonsData,
          classData,
          tcsCount,
          classCount,
          reasonCount,
        },
        1,
        "Student transfer record send successfully"
      )
    );
  } catch (error) {
    console.error("Error creating student transfer record:", error);
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
}

async function viewAttachments(req, res) {
  const { studentTransferId } = req.params;

  try {
    const studentTransfer = await StudentTransfer.findById(studentTransferId);

    if (!studentTransfer) {
      return res.status(404).send("StudentTransfer not found");
    }

    const attachmentUrls = studentTransfer.attachments;

    if (!attachmentUrls || attachmentUrls.length === 0) {
      return res.status(404).send("No attachments found");
    }

    res.setHeader("Content-Type", "application/pdf");

    for (const attachmentUrl of attachmentUrls) {
      try {
        const s3Response = await s3.getObject({ Bucket: "your-s3-bucket-name", Key: attachmentUrl }).promise();
        res.write(s3Response.Body);
      } catch (s3Error) {
        console.error("Error fetching attachment from S3:", s3Error);
        res.status(404).send(`Attachment not found in S3: ${attachmentUrl}`);
        return;
      }
    }

    res.end();
  } catch (error) {
    console.error("Error fetching attachment:", error);
    res.status(500).send("Internal Server Error");
  }
}

async function getClasses(req, res, next) {
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
}

async function getTcStudentsDetails(req, res, next) {
  try {
    const { searchQuery, tcType, status, classId, page, limit } = req.query;

    // Ensure searchQuery is not empty before creating the regex
    const regexName = searchQuery ? new RegExp(searchQuery, "i") : /.*/;
    const pageNumber = parseInt(page) || 1;
    const pageSize = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * pageSize;

    const query = {};

    const classMatchQuery = {
      $match: {},
    };

    if (status) {
      query.status = status;
    }

    if (tcType) {
      query.tcType = tcType;
    }

    if (classId && classId?.trim() != "default") {
      classMatchQuery.$match = { classes: classId?.trim().split("_")?.[1] };
      query.classId = mongoose.Types.ObjectId(classId?.trim().split("_")?.[0]);
    }

    const result = await StudentTransfer.aggregate([
      {
        $match: query,
      },
      {
        $sort: {
          createdAt: 1,
          updatedAt: 1,
        },
      },
      {
        $facet: {
          totalDocs: [
            {
              $group: {
                _id: null,
                totalDocs: { $sum: 1 },
              },
            },
            { $project: { _id: 0 } },
          ],
          students: [
            {
              $lookup: {
                from: "students",
                localField: "studentId",
                foreignField: "_id",
                as: "studentslist",
              },
            },
            {
              $unwind: "$studentslist",
            },
            {
              $match: {
                "studentslist.name": regexName,
              },
            },
            {
              $sort: {
                "studentslist.name": 1,
              },
            },
            {
              $lookup: {
                from: "sections",
                let: { classId: "$classId" }, // Store the value of classId in a variable
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$class_id", "$$classId"], // Use the variable in the $eq expression
                      },
                    },
                  },
                ],
                as: "classes",
              },
            },
            {
              $unwind: "$classes",
            },

            {
              $lookup: {
                from: "feeinstallments",
                localField: "studentId",
                foreignField: "studentId",
                as: "fees",
              },
            },
            {
              $unwind: {
                path: "$fees",
                preserveNullAndEmptyArrays: true, // Preserve students without fee installment documents
              },
            },
            {
              $group: {
                _id: "$_id",
                tcType: { $first: "$tcType" },
                reason: { $first: "$reason" },
                status: { $first: "$status" },
                studentslist: { $first: "$studentslist.name" },
                classes: { $first: "$classes.className" },
                totalAmount: {
                  $sum: {
                    $ifNull: ["$fees.totalAmount", 0], // Set default value for totalAmount
                  },
                },
                paidAmount: {
                  $sum: {
                    $ifNull: ["$fees.paidAmount", 0], // Set default value for paidAmount
                  },
                },
              },
            },
            {
              $project: {
                _id: 1,
                tcType: 1,
                reason: 1,
                status: 1,
                studentslist: 1,
                classes: 1,
                totalAmount: 1,
                paidAmount: 1,
                pendingAmount: { $subtract: ["$totalAmount", "$paidAmount"] },
              },
            },
            classMatchQuery,
          ],
        },
      },
      {
        $unwind: "$students",
      },
      {
        $addFields: {
          totalDocs: { $arrayElemAt: ["$totalDocs.totalDocs", 0] },
        },
      },
      {
        $project: {
          _id: "$students._id",
          totalDocs: 1,
          tcType: "$students.tcType",
          reason: "$students.reason",
          status: "$students.status",
          studentslist: "$students.studentslist",
          classes: "$students.classes",
          totalAmount: "$students.totalAmount",
          paidAmount: "$students.paidAmount",
          pendingAmount: "$students.pendingAmount",
        },
      },
      {
        $sort: {
          studentslist: 1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: pageSize,
      },
    ]).exec();

    res.status(200).json(SuccessResponse(result, 1, "Student details fetch successfully"));
  } catch (error) {
    console.error("Error Student details fetch:", error);
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
}

module.exports = {
  createStudentTransfer,
  searchStudentsWithPagination,
  changeStatus,
  viewAttachments,
  getTc,
  getTcDetails,
  getClasses,
  getTcStudentsDetails,
};
