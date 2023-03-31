const router = require('express').Router();
const {
	create,
	getAll,
	deleteAcademicYear,
	getAcademicYear,
	update,
} = require('../controller/academicYear');

router.route('/').get(getAll).post(create);

router
	.route('/:id')
	.get(getAcademicYear)
	.put(update)
	.delete(deleteAcademicYear);

module.exports = router;
