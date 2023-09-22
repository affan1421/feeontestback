const router = require('express').Router();
const {
	createStudentTransfer,
	getUsers,
	getTcDetails
} = require('../controller/transferCertificate');

// create new tranfer certificate
router.post('/', createStudentTransfer);
router.get('/users', getUsers);
router.get('/details', getTcDetails)
module.exports = router;
