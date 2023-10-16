const router = require("express").Router();
const {
  createConcession,
  getClassDetails,
  getStudentsByClass,
  getStudentFeeDetails,
  getConcessionCardData,
  changeStatus,
  getStudentConcessionData,
} = require("../controller/concession");

router.post("/create", createConcession);
router.get("/classes", getClassDetails);
router.get("/classWiseStudentsData", getStudentsByClass);
router.get("/feedetails", getStudentFeeDetails);
router.get("/concessionCardData", getConcessionCardData);
router.get("/changeStatus", changeStatus);
router.get("/studentsconcession", getStudentConcessionData);

module.exports = router;
