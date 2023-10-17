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
  getStudentWithConcession,
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
router.get("/studentsconcession", getStudentConcessionData);
router.get("/studentwithconcession", getStudentWithConcession);

module.exports = router;
