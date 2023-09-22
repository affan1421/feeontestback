const router = require("express").Router();
const {
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
module.exports = router;
