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
<<<<<<< Updated upstream
  addConcessionReason,
  getConcessionReason,
  updateConcessionReason,
=======
  getStudentWithConcession,
>>>>>>> Stashed changes
} = require("../controller/concession");

router.post("/create", createConcession);
router.get("/classes", getClassDetails);
router.get("/classWiseStudentsData", getStudentsByClass);
router.get("/feedetails", getStudentFeeDetails);
router.get("/concessionCardData", getConcessionCardData);
router.get("/concessionClassList", getConcessionClassList);
router.get("/changeStatus/:id", changeStatus);
<<<<<<< Updated upstream
router.get("/studentsconcession", getStudentConcessionData)
router.post("/reasons", addConcessionReason);
router.get("/reasons", getConcessionReason);
router.put("/reasons", updateConcessionReason);
=======
router.get("/studentsconcession", getStudentConcessionData);
router.get("/studentwithconcession", getStudentWithConcession);
>>>>>>> Stashed changes

module.exports = router;
