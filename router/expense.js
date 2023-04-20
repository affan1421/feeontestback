const express = require('express');

const router = express.Router();
const {
	getExpenses,
	create,
	read,
	update,
	expenseDelete,
} = require('../controller/expesnse');

router.get('/', getExpenses).post('/', create);

router.get('/:id', read).put('/:id', update).delete('/:id', expenseDelete);

module.exports = router;
