const express = require('express');

const router = express.Router();
const feeInstallmentController = require('../controller/feeInstallment');

router.get('/allTransactions', feeInstallmentController.GetTransactions);

router.get(
	'/transactionsBySection',
	feeInstallmentController.SectionWiseTransaction
);

router.get('/studentsList', feeInstallmentController.StudentsList);
router.get(
	'/studentstructure',
	feeInstallmentController.getStudentFeeStructure
);

module.exports = router;
