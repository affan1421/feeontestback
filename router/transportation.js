const router = require("express").Router();
const { createNewRoute } = require("../controller/transportation");

router.post("/createRoute", createNewRoute);

module.exports = router;
