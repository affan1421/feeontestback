const router = require('express').Router();
const {
	getSummary,
	getStudentList,
	getStudentListExcel,
	getClassList,
	getClassListExcel,
	getStudentListByClass,
} = require('../controller/dueList');

// Summary
router.post('/summary', getSummary);

// Student List
router.post('/studentList', getStudentList);

// Student List Excel
router.get('/studentListExcel', getStudentListExcel);

// Class List
router.post('/classList', getClassList);

// Class List Excel
router.get('/classListExcel', getClassListExcel);

// Student List by Class
router.get('/studentListByClass', getStudentListByClass);

module.exports = router;
