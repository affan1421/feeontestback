const mongoose = require("mongoose");

const studentsCollection = mongoose.connection.db.collection("students");
const StudentTransfer = require("../models/transferCertificate");

async function createStudentTransfer(req, res) {
  try {
    const { studentId, classId, tcType, reason, transferringSchool, status } =
      req.body;

    const newStudentTransfer = new StudentTransfer({
      studentId,
      classId,
      tcType,
      reason,
      transferringSchool,
      status,
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

async function getUsers(req, res) {
  try {
    const { searchQuery, classes } = req.query;
    const regexName = new RegExp(searchQuery, "i");
    const query = {};

    if (searchQuery) {
      query.name = regexName;
    }

    if (classes) {
      query.class = mongoose.Types.ObjectId(classes);
    }
    const result = await studentsCollection.find(query).toArray();
    return res.status(200).json({ result });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
}

module.exports = {
  createStudentTransfer,
  getUsers,
};
