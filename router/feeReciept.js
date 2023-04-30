const express = require('express');

const router = express.Router();
const feeRecieptController = require('../controller/feeReciept');

// router.get(
// 	'/transactionsBySection',
// 	feeRecieptController.SectionWiseTransaction
// );

// router.get('/studentsList', feeRecieptController.StudentsList);

module.exports = router;
