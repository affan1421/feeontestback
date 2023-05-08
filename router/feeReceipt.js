const express = require('express');

const router = express.Router();
const { getFeeReceipt, createReceipt } = require('../controller/feeReceipt');

router.get('/', getFeeReceipt);

router.post('/', createReceipt);

module.exports = router;
