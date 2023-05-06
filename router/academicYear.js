const router = require('express').Router();
const {
	create,
	getAll,
	deleteAcademicYear,
	changeState,
	getAcademicYear,
	update,
} = require('../controller/academicYear');

router.route('/').get(getAll).post(create);

router.post('/activate', changeState);

router
	.route('/:id')
	.get(getAcademicYear)
	.put(update)
	.delete(deleteAcademicYear);

module.exports = router;
