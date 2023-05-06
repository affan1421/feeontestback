const express = require('express');

const router = express.Router();
const { getFeeReceipt } = require('../controller/feeReceipt');

router.get('/', getFeeReceipt);

module.exports = router;
