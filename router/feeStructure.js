const express = require('express');

const router = express.Router();
const feeStructureController = require('../controller/feeStructure');
// Fetching unmapped classList
router.get('/unmapped', feeStructureController.getUnmappedClassList);

// CREATE
router.post('/', feeStructureController.create);

router.get(
	'/section/:sectionId/category/:categoryId',
	feeStructureController.getFeeStructureBySectionId
);

// Discount New Flow
router.get('/:id/feeDetails', feeStructureController.getFeeDetails);

router.get(
	'/:id/student/section/:sectionId',
	feeStructureController.getStudentsBySection
);
// END

// READ
router.get('/:id', feeStructureController.read);

// UPDATE
router.put('/:id', feeStructureController.updatedFeeStructure);

// DELETE
router.delete('/:id', feeStructureController.deleteFeeStructure);

// LIST
router.get('/', feeStructureController.getByFilter);

router.get('/:id/feedetails/:sectionId', feeStructureController.getFeeCategory);

module.exports = router;
