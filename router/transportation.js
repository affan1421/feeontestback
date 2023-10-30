const router = require("express").Router();

const {
  createNewRoute,
  getRoutes,
  editRoutes,
  getEditRoutes,
} = require("../controller/transportation");

router.post("/createRoute", createNewRoute); // creating new routes
router.get("/searchRoute", getRoutes); // listing routes and searching on route name
router.get("/editRoutes", editRoutes);
router.post("/editRoutes", getEditRoutes); // edit the existing routes

router.post("/add-driver");

module.exports = router;
