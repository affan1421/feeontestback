const mongoose = require("mongoose");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const studentsCollection = mongoose.connection.db.collection("students");
const StudentTransfer = require("../models/transferCertificate");
const ErrorResponse = require("../utils/errorResponse");
const SuccessResponse = require("../utils/successResponse");

async function createStudentTransfer(req, res, next) {
  try {
    const {
      studentId,
      classId,
      tcType,
      reason,
      transferringSchool,
      status,
      attachments,
    } = req.body;
    console.log(req.body, "bodyy");
    const newStudentTransfer = new StudentTransfer({
      studentId,
      classId,
      tcType,
      reason,
      transferringSchool,
      status,
      attachments,
    });

    await newStudentTransfer.save();
    res
      .status(200)
      .json(
        SuccessResponse(
          newStudentTransfer,
          1,
          "Student transfer record created successfully"
        )
      );
  } catch (error) {
    console.error("Error creating student transfer record:", error);
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
}

async function getUsers(req, res, next) {
  try {
    const { searchQuery, classId, page } = req.query;
    const regexName = new RegExp(searchQuery, "i");
    const query = {};
    const pageNumber = parseInt(page) || 1;
    const pageSize = 10; // we put it 10 as default
    const skip = (pageNumber - 1) * pageSize;
    const limit = skip + pageSize;

    if (searchQuery) {
      query.name = regexName;
    }

    if (classId) {
      query.class = mongoose.Types.ObjectId(classId);
    }
    const result = await studentsCollection
      .find(query)
      .skip(skip)
      .limit(limit)
      .toArray();
    res
      .status(200)
      .json(SuccessResponse(result, 1, "Student details fetch successfully"));
  } catch (error) {
    console.error("Error Student details fetch:", error);
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
}

async function changeStatus(req, res, next) {
  try {
    const transferId = req.parms.id;
    const { status } = req.query;

    if (!transferId || !status) {
      return res
        .status(400)
        .json({ message: "Transfer Id and status are required" });
    }

    const transfer = await StudentTransfer.findById(transferId);

    if (!transfer) {
      return res
        .status(404)
        .json({ message: "Transfer certificate not found" });
    }

    // Update transfer status
    transfer.status = status;
    await transfer.save();
    res
      .status(200)
      .json(
        SuccessResponse(
          null,
          1,
          "Transfer certificate status updated successfully"
        )
      );
  } catch (error) {
    console.error("Error on update status:", error);
    console.log("error", error.message);
    return next(new ErrorResponse("Something Went Wrong", 500));
  }
}

async function getStudentIdByName(name) {
  const regexName = new RegExp(name, "i");
  const student = await studentsCollection.find({ name: regexName });
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

    const result = await StudentTransfer.find(query).toArray();

    res
      .status(200)
      .json(
        SuccessResponse(
          result,
          1,
          "Transfer certificate status updated successfully"
        )
      );
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
          class: [
            {
              $lookup: {
                from: "classes",
                localField: "classId",
                foreignField: "_id",
                as: "associatedClasses",
              },
            },
            {
              $unwind: "$associatedClasses",
            },
            {
              $group: {
                _id: "$associatedClasses.name",
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
  const studentTransferId = req.params.studentTransferId;

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
        const s3Response = await s3
          .getObject({ Bucket: "your-s3-bucket-name", Key: attachmentUrl })
          .promise();
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

module.exports = {
  createStudentTransfer,
  getUsers,
  changeStatus,
  viewAttachments,
  getTc,
  getTcDetails,
};
