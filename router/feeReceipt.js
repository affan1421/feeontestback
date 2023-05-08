const express = require('express');

const router = express.Router();
const {
	getFeeReceipt,
	createReceipt,
	getFeeReceiptById,
} = require('../controller/feeReceipt');

router.get('/', getFeeReceipt);

router.get('/:id', getFeeReceiptById);

router.post('/', createReceipt);

module.exports = router;
