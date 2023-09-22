const router = require("express").Router();
const { createStudentTransfer } = require("../controller/transferCertificate");

// create new tranfer certificate
router.post("/", createStudentTransfer);

module.exports = router;
