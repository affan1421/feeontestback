const express = require('express');
const router = express.Router();
const feeStructureController = require('../controllers/feeStructure');

// CREATE
router.post('/', feeStructureController.create);

// READ
router.get('/:id', feeStructureController.read);

// UPDATE
router.put('/:id', feeStructureController.update);

// DELETE
router.delete('/:id', feeStructureController.delete);

// LIST
router.get('/', feeStructureController.list);

// ADD FEE DETAIL
router.post('/:id/fee-details', feeStructureController.addFeeDetail);

// UPDATE FEE DETAIL
router.put('/:id/fee-details/:feeDetailId', feeStructureController.updateFeeDetail);

// DELETE FEE DETAIL
router.delete('/:id/fee-details/:feeDetailId', feeStructureController.deleteFeeDetail);

module.exports = router;
