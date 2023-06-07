const express = require('express');

const router = express.Router();
const {
	getFeeReceipt,
	createReceipt,
	getFeeReceiptSummary,
	getFeeReceiptById,
	getDashboardData,
	receiptByStudentId,
	getExcel,
	cancelReceipt,
} = require('../controller/feeReceipt');

router.get('/student/:studentId', receiptByStudentId);

router.get('/excel', getExcel);
router.get('/', getFeeReceipt);

router.get('/summary', getFeeReceiptSummary);

router.get('/:id', getFeeReceiptById);

router.post('/:id/cancellation', cancelReceipt);

router.get('/dashboard', getDashboardData);

router.post('/', createReceipt);

module.exports = router;
