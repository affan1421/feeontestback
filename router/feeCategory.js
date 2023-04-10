const router = require('express').Router();
const {
	createFeeCategory,
	getFeeCategory,
	updateFeeCategory,
	deleteFeeCategory,
	getFeeCategoryByFilter,
} = require('../controller/feeCategory');

// CREATE
router.route('/').get(getFeeCategoryByFilter).post(createFeeCategory);

router
	.route('/:id')
	.get(getFeeCategory)
	.put(updateFeeCategory)
	.delete(deleteFeeCategory);

module.exports = router;
