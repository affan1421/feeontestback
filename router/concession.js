const router = require("express").Router();
const {
  createConcession,
  getClassDetails,
  getStudentsByClass,
  getStudentFeeDetails,
  getConcessionCardData,
<<<<<<< Updated upstream
  getConcessionClassList,
  getStudentConcessionData,
  changeStatus,
=======
  changeStatus,
  getStudentConcessionData,
>>>>>>> Stashed changes
} = require("../controller/concession");

router.post("/create", createConcession);
router.get("/classes", getClassDetails);
router.get("/classWiseStudentsData", getStudentsByClass);
router.get("/feedetails", getStudentFeeDetails);
<<<<<<< Updated upstream
router.get("/concessionCardData",getConcessionCardData)
router.get("/concessionClassList",getConcessionClassList)
router.get("/changeStatus",changeStatus);
router.get("/studentsconcession", getStudentConcessionData);

=======
router.get("/concessionCardData", getConcessionCardData);
router.get("/changeStatus", changeStatus);
router.get("/studentsconcession", getStudentConcessionData);
>>>>>>> Stashed changes

module.exports = router;
