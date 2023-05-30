const express = require('express');

const router = express.Router();
const {
	get,
	create,
	read,
	update,
	donorDelete,
	getDonations,
	updateStudentList,
} = require('../controller/donor');

router.get('/', get).post('/', create);
// router.post('/updateStudentList', updateStudentList);
// router.post('/summary', totalAmount );// api is pending schhool id/ year

router.get('/:id', read).put('/:id', update).delete('/:id', donorDelete);

router.get('/:id/donations', getDonations);

module.exports = router;
