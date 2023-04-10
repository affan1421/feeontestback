const router = require('express').Router();

const {
	createDiscount,
	getDiscounts,
	getDiscountById,
	updateDiscount,
	deleteDiscount,
} = require('../controller/concession');

router.route('/').get(getDiscounts).post(createDiscount);

router
	.route('/:id')
	.get(getDiscountById)
	.put(updateDiscount)
	.delete(deleteDiscount);

module.exports = router;
