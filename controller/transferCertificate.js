const StudentTransfer = require("../models/studentTransfer");

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
    res.status(201).json({
      success: true,
      message: "Student transfer record created successfully",
      data: newStudentTransfer,
    });
  } catch (error) {
    console.error("Error creating student transfer record:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create student transfer record",
      error: error.message,
    });
  }
}

module.exports = {
  createStudentTransfer,
};
