const router = require('express').Router();

const discountCategory = require('../controller/discountCategory');

router
	.route('/')
	.get(discountCategory.getDiscountCategory)
	.post(discountCategory.createDiscountCategory);

router
	.route('/byClassDiscount')
	.post(discountCategory.getDiscountCategoryByClass);

router.route('/addClassAndStudent').post(discountCategory.addClassAndStudent);

router
	.route('/:id')
	.get(discountCategory.getDiscountCategoryById)
	.put(discountCategory.updateDiscountCategory)
	.delete(discountCategory.deleteDiscountCategory);

module.exports = router;
