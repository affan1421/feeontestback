const router = require("express").Router();
const {
<<<<<<< HEAD
  createStudentTransfer,
  getUsers,
  changeStatus,
  viewAttachments,
} = require("../controller/transferCertificate");

// create new tranfer certificate
router.post("/", createStudentTransfer);
router.get("/users", getUsers);
router.put("/changeStatus", changeStatus);
router.get("/attachments/:studentTransferId", viewAttachments);
=======
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
>>>>>>> 3b815d60b4b6259dc93714fa3a68db2c3b26fb31
module.exports = router;
