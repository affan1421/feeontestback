const express = require('express');

const router = express.Router();
const {
	getExpenses,
	create,
	read,
	update,
	expenseDelete,
	totalExpences,
	totalExpenceFilter,
} = require('../controller/expesnse');

router.get('/', getExpenses).post('/', create);
router.post('/totalExpence', totalExpences);
router.post('/totalExpenceFilter', totalExpenceFilter);

router.get('/:id', read).put('/:id', update).delete('/:id', expenseDelete);

module.exports = router;
