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
	addAttachment,
	getSectionDiscount,
	getStudentsByFilter,
	addStudentToDiscount,
	getStudentForApproval,
	getGraphBySection,
	getStudentsByStructure,
	getDiscountGraph,
	revokeStudentDiscount,
	getDiscountSummary,
	getSectionWiseDiscount,
	getDiscountBySchool,
	getStudentsWithDiscount,
} = require('../controller/discountCategory');

router.post('/:id/revoke', revokeStudentDiscount);

router.get('/school/:schoolId', getDiscountBySchool);

router.get('/studentList', getStudentsWithDiscount);

router.get('/summary', getDiscountSummary);

router.get('/graph', getDiscountGraph);

router.get('/graphBySection', getGraphBySection);

router.get('/sections', getSectionWiseDiscount);

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

router.route('/:discountId/approval').post(approveStudentDiscount);

router.route('/approval').get(getStudentForApproval);

router.post('/addAttachment', addAttachment);

router
	.route('/:id')
	.get(getDiscountCategoryById)
	.put(updateDiscountCategory)
	.delete(deleteDiscountCategory);

module.exports = router;
