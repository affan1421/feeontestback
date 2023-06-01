const express = require('express');

const router = express.Router();
const {
	getFeeReceipt,
	createReceipt,
	getFeeReceiptSummary,
	getFeeReceiptById,
	getExcel,
} = require('../controller/feeReceipt');

router.get('/excel', getExcel);
router.get('/', getFeeReceipt);

router.get('/summary', getFeeReceiptSummary);

router.get('/:id', getFeeReceiptById);

router.post('/', createReceipt);

module.exports = router;
