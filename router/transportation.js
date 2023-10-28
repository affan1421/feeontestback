const router = require("express").Router();
const { createNewRoute, getRoutes, editRoutes } = require("../controller/transportation");
router.post("/createRoute", createNewRoute); // creating new routes
router.get("/searchRoute", getRoutes); // listing routes and searching on route name
router.post("/editRoutes", editRoutes); // edit the existing routes

module.exports = router;
