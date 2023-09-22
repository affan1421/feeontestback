const router = require("express").Router();
const {
	createStudentTransfer,
	getStudents,
	changeStatus,
	viewAttachments,
	getTc,
	getTcDetails,
	getClasses,
} = require('../controller/transferCertificate');

// create new tranfer certificate
router.get('/attachments/:studentTransferId', viewAttachments);

// create new tranfer certificate
router.post("/", createStudentTransfer);
router.get("/students", getStudents);
router.put("/changeStatus", changeStatus);
router.get("/tcList", getTc);
router.get("/details", getTcDetails);
router.get('/classes', getClasses);
module.exports = router;
