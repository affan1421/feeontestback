const router = require('express').Router();

const {
	getDiscountCategory,
	createDiscountCategory,
	getDiscountCategoryById,
	updateDiscountCategory,
	deleteDiscountCategory,
	mapDiscountCategory,
	getDiscountCategoryByClass,
	approveStudentDiscount,
	getStudentsByFilter,
	addStudentToDiscount,
	getStudentForApproval,
	getStudentsByStructure,
} = require('../controller/discountCategory');

router.route('/').get(getDiscountCategory).post(createDiscountCategory);

router.post('/:discountId/map', mapDiscountCategory);

router.get('/:id/class', getDiscountCategoryByClass);

router.get('/:id/structure/:structureId', getStudentsByStructure);

router.get('/:id/studentFilter', getStudentsByFilter);

router.post('/:discountId/addStudent', addStudentToDiscount);

router
	.route('/:discountId/approval')
	.get(getStudentForApproval)
	.post(approveStudentDiscount);

router
	.route('/:id')
	.get(getDiscountCategoryById)
	.put(updateDiscountCategory)
	.delete(deleteDiscountCategory);

module.exports = router;
