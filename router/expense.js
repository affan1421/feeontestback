const express = require('express');

const router = express.Router();
const {
	getExpenses,
	create,
	read,
	update,
	expenseDelete,
	totalExpenses,
	totalExpenseFilter,
} = require('../controller/expense');

router.post('/getAll', getExpenses).post('/', create);
router.post('/totalExpense', totalExpenses);
router.post('/totalExpenseFilter', totalExpenseFilter);

router.get('/:id', read).put('/:id', update).delete('/:id', expenseDelete);

module.exports = router;
