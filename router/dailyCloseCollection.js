const router = require("express").Router();
const {
  generateDailyCloseCollection,
  getCollectionDetails,
  dailyTotalFeeCollection,
} = require("../controller/dailyCloseCollection");

router.post("/create", generateDailyCloseCollection);
router.get("/collectionDetails", getCollectionDetails);
router.get("/todaystotalfees", dailyTotalFeeCollection);

module.exports = router;
