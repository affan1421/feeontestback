const router = require("express").Router();
const {
  createConcession,
  getClassDetails,
  getStudentsByClass,
} = require("../controller/concession");

router.post("/create", createConcession);
router.get("/classes", getClassDetails);
router.get("/classWiseStudentsData", getStudentsByClass);

module.exports = router;
