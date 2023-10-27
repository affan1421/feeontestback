const router = require("express").Router();
const { createNewRoute, getRoutes } = require("../controller/transportation");

router.post("/createRoute", createNewRoute);
router.get("/searchRoute", getRoutes);

module.exports = router;
