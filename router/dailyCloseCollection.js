const router = require("express").Router();
const {
  generateDailyCloseCollection,
  getCollectionDetails,
  dailyTotalFeeCollection,
  updateCloseCollectionStatus
} = require("../controller/dailyCloseCollection");

router.post("/create", generateDailyCloseCollection);
router.get("/collectionDetails", getCollectionDetails);
router.get("/todaystotalfees", dailyTotalFeeCollection);
router.post("/updateStatus",updateCloseCollectionStatus)

module.exports = router;
