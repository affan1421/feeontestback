const router = require('express').Router();
const {
	GetAllByFilter,
	GetById,
	CreatePreviousBalance,
	UpdatePreviousBalance,
	GetStudents,
	BulkCreatePreviousBalance,
	DeletePreviousBalance,
	existingStudentExcel,
} = require('../controller/previousFeesBalance');

router.get('/students', GetStudents);

router.route('/').get(GetAllByFilter).post(CreatePreviousBalance);

router
	.route('/:id')
	.get(GetById)
	.put(UpdatePreviousBalance)
	.delete(DeletePreviousBalance);

router.post('/bulkCreate', BulkCreatePreviousBalance);

router.post('/existingStudentExcel', existingStudentExcel);

module.exports = router;
