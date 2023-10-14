const router = require("express").Router();
const {
  createConcession,
  getClassDetails,
  getStudentsByClass,
  getStudentFeeDetails,
  getConcessionCardData,
  changeStatus
} = require("../controller/concession");

router.post("/create", createConcession);
router.get("/classes", getClassDetails);
router.get("/classWiseStudentsData", getStudentsByClass);
router.get("/feedetails", getStudentFeeDetails);
router.get("/concessionCardData",getConcessionCardData)
router.get("/changeStatus",changeStatus);

module.exports = router;
