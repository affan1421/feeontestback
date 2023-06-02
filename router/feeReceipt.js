const express = require('express');

const router = express.Router();
const {
	getFeeReceipt,
	createReceipt,
	getFeeReceiptSummary,
	getFeeReceiptById,
	getDashboardData,
	getExcel,
} = require('../controller/feeReceipt');

router.get('/excel', getExcel);
router.get('/', getFeeReceipt);

router.get('/summary', getFeeReceiptSummary);

router.get('/:id', getFeeReceiptById);

router.get('/dashboard', getDashboardData);

router.post('/', createReceipt);

module.exports = router;
