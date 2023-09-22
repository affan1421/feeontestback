const router = require('express').Router();
const {
	createStudentTransfer,
	getUsers,
	changeStatus,
} = require('../controller/transferCertificate');

// create new tranfer certificate
router.post('/', createStudentTransfer);
router.get('/users', getUsers);
router.put('/changeStatus', changeStatus);
module.exports = router;
