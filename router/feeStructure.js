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

// READ
router.get('/:id', feeStructureController.read);

// UPDATE
router.put('/:id', feeStructureController.updatedFeeStructure);

// DELETE
router.delete('/:id', feeStructureController.deleteFeeStructure);

// LIST
router.get('/', feeStructureController.getByFilter);

router.get('/:id/feedetails/:sectionId', feeStructureController.getFeeCategory);

// // ADD FEE DETAIL
// router.post('/:id/fee-details', feeStructureController.addFeeDetail);

// // UPDATE FEE DETAIL
// router.put(
// 	'/:id/fee-details/:feeDetailId',
// 	feeStructureController.updateFeeDetail
// );

// // DELETE FEE DETAIL
// router.delete(
// 	'/:id/fee-details/:feeDetailId',
// 	feeStructureController.deleteFeeDetail
// );

module.exports = router;
