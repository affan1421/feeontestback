const router = require("express").Router();
const {
  createConcession,
  getClassDetails,
  getStudentsByClass,
  getStudentFeeDetails,
  getConcessionCardData,
  getConcessionClassList,
  changeStatus,
  getStudentConcessionData,
  addConcessionReason,
  getConcessionReason,
  updateConcessionReason,
} = require("../controller/concession");

router.post("/create", createConcession);
router.get("/classes", getClassDetails);
router.get("/classWiseStudentsData", getStudentsByClass);
router.get("/feedetails", getStudentFeeDetails);
router.get("/concessionCardData", getConcessionCardData);
router.get("/concessionClassList", getConcessionClassList);
router.get("/changeStatus/:id", changeStatus);
router.get("/studentsconcession", getStudentConcessionData)
router.post("/reasons", addConcessionReason);
router.get("/reasons", getConcessionReason);
router.put("/reasons", updateConcessionReason);

module.exports = router;
