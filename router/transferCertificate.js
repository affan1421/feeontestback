const router = require('express').Router();
const {
	createStudentTransfer,
	getUsers,
	changeStatus,
	getTc,
	getTcDetails
} = require('../controller/transferCertificate');

// create new tranfer certificate
router.post('/', createStudentTransfer);
router.get('/users', getUsers);
router.put('/changeStatus', changeStatus);
router.get('/tcList', getTc);
router.get('/details', getTcDetails)
module.exports = router;
