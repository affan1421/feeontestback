const router = require('express').Router();
const {
	GetAllByFilter,
	GetById,
	CreatePreviousBalance,
	UpdatePreviousBalance,
	BulkCreatePreviousBalance,
	DeletePreviousBalance,
} = require('../controller/previousFeesBalance');

router.route('/').get(GetAllByFilter).post(CreatePreviousBalance);

router
	.route('/:id')
	.get(GetById)
	.put(UpdatePreviousBalance)
	.delete(DeletePreviousBalance);

router.post('/bulkCreate', BulkCreatePreviousBalance);

module.exports = router;
