const router = require("express").Router();
const {
  createConcession,
  getClassDetails,
  getStudentsByClass,
  getStudentFeeDetails,
} = require("../controller/concession");

router.post("/create", createConcession);
router.get("/classes", getClassDetails);
router.get("/classWiseStudentsData", getStudentsByClass);
router.get("/feedetails", getStudentFeeDetails);

module.exports = router;
