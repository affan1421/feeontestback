const router = require('express').Router();
const {
	createStudentTransfer,
	getStudents,
	changeStatus,
	viewAttachments,
	getTc,
	getTcDetails,
	getClasses,
	getTcStudentsDetails,
} = require('../controller/transferCertificate');

// create new tranfer certificate
router.get('/attachments/:studentTransferId', viewAttachments);

// create new tranfer certificate
router.post('/', createStudentTransfer);
router.get('/students', getStudents);
router.put('/changeStatus:id', changeStatus);
router.get('/tcList', getTc);
router.get('/details', getTcDetails);
router.get('/classes', getClasses);
router.get('/tcStudentsDetails', getTcStudentsDetails);
module.exports = router;
