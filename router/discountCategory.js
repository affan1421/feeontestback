const router = require('express').Router();

const {
	getDiscountCategory,
	createDiscountCategory,
	getDiscountCategoryById,
	updateDiscountCategory,
	deleteDiscountCategory,
	discountReport,
	mapDiscountCategory,
	getDiscountCategoryByClass,
	approveStudentDiscount,
	getSectionDiscount,
	getStudentsByFilter,
	addStudentToDiscount,
	getStudentForApproval,
	getStudentsByStructure,
	revokeStudentDiscount,
} = require('../controller/discountCategory');

router.post('/:id/revoke', revokeStudentDiscount);

router.route('/').get(getDiscountCategory).post(createDiscountCategory);

router.post('/:discountId/map', mapDiscountCategory);

router.get('/:id/class', getDiscountCategoryByClass);

router.get('/:id/structure/:structureId', getStudentsByStructure);

router.get('/:id/studentFilter', getStudentsByFilter);

router.post('/:discountId/addStudent', addStudentToDiscount);

// Fetch only the section Discount.
router.get('/:id/mappedStructure/:feeStructureId', getSectionDiscount);

// discount analytics
router.get('/report', discountReport);

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
