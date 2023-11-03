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
  addNewVehicle,
  editVehicle,
  updateVehicle,
  deleteVehicle,
  listVehicles,
  viewVehicle,
  viewDriver,
  routeList,
  driverList,
  getAllClasses,
  getClassWiseStudents,
  getVehicleNumbers,
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
router.get("/view-driver", viewDriver); // view Driver
router.get("/routelist", routeList);

router.post("/add-vehicle", addNewVehicle); //add new vehicle
router.get("/edit-vehicle", editVehicle); //edit vehicle
router.put("/edit-vehicle", updateVehicle); //update-vehicle
router.delete("/delete-vehicle", deleteVehicle); //delete vehicle
router.get("/list-vehicles", listVehicles); //list-vehicle
router.get("/view-vehicle", viewVehicle); //view-vehicle
router.get("/driverlist", driverList); //driver-list

router.get("/classes", getAllClasses);
router.get("/students", getClassWiseStudents);
router.get("/vehicle-numbers", getVehicleNumbers);

module.exports = router;
