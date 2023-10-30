const router = require("express").Router();

const {
  createNewRoute,
  getRoutes,
  editRoutes,
  getEditRoutes,
  addNewDriver,
} = require("../controller/transportation");

router.post("/createRoute", createNewRoute); // creating new routes
router.get("/searchRoute", getRoutes); // listing routes and searching on route name
router.put("/editRoutes", editRoutes);
router.get("/editRoutes", getEditRoutes); // edit the existing routes

router.post("/add-driver", addNewDriver);

module.exports = router;
