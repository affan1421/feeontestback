const router = require("express").Router();

const {
  createNewRoute,
  getRoutes,
  editRoutes,
  getEditRoutes,
  addNewDriver,
  updateDriver,
  editDriver,
  deleteDriver,
  listDrivers,
  viewDrivers,
} = require("../controller/transportation");

router.post("/createRoute", createNewRoute); // creating new routes
router.get("/searchRoute", getRoutes); // listing routes and searching on route name
router.put("/editRoutes", editRoutes); //update existing routes
router.get("/editRoutes", getEditRoutes); // edit the existing routes

router.post("/add-driver", addNewDriver); // add new driver
router.get("/edit-driver", editDriver); // fetech driver data
router.put("/edit-driver", updateDriver); //update driver data
router.delete("/delete-driver", deleteDriver); //delete driver
router.get("/list-drivers", listDrivers); //list drivers
router.get("/view-driver", viewDrivers);
module.exports = router;
