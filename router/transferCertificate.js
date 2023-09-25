const router = require("express").Router();
const {
<<<<<<< Updated upstream
	createStudentTransfer,
	searchStudentsWithPagination,
	changeStatus,
	viewAttachments,
	getTc,
	getTcDetails,
	getClasses,
	getTcStudentsDetails,
} = require('../controller/transferCertificate');
=======
  createStudentTransfer,
  getStudents,
  changeStatus,
  viewAttachments,
  getTc,
  getTcDetails,
  getClasses,
  getTcStudentsDetails,
} = require("../controller/transferCertificate");
>>>>>>> Stashed changes

// create new tranfer certificate
router.post("/", createStudentTransfer);

// view all students of a particular school
router.get("/students", getStudents);

// change the TC status
router.put("/changeStatus/:id", changeStatus);

// view the different transfer list
router.get("/tcList", getTc);

// TC details, which includes document counts also
router.get("/details", getTcDetails);

// to view all the available classNames of a particular schools
router.get("/classes", getClasses);

// Doc attachment session for AVAIL-TC
router.get("/attachments/:studentTransferId", viewAttachments);

// in-detail data of students who applied for TC
router.get("/tcStudentsDetails", getTcStudentsDetails);

<<<<<<< Updated upstream
// create new tranfer certificate
router.post('/', createStudentTransfer);
router.get('/students', searchStudentsWithPagination);
router.put('/changeStatus/:id', changeStatus);
router.get('/tcList', getTc);
router.get('/details', getTcDetails);
router.get('/classes', getClasses);
router.get('/tcStudentsDetails', getTcStudentsDetails);
=======
>>>>>>> Stashed changes
module.exports = router;
