const express = require('express');

const router = express.Router();
const feeInstallmentController = require('../controller/feeInstallment');

router.post('/makePayment', feeInstallmentController.MakePayment);

router.get('/allTransactions', feeInstallmentController.GetTransactions);

router.get(
	'/transactionsBySection',
	feeInstallmentController.SectionWiseTransaction
);

router.post('/:id', feeInstallmentController.update);

// Get Income Dashboard Data
router.get('/incomeDashboard', feeInstallmentController.IncomeDashboard);

router.post(
	'/addPreviousFee/:schoolId',
	feeInstallmentController.AddPreviousFee
);

router.get('/studentsList', feeInstallmentController.StudentsList);
router.get(
	'/studentstructure',
	feeInstallmentController.getStudentFeeStructure
);

module.exports = router;
