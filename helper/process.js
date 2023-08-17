const { spawn } = require('child_process');
const flatted = require('flatted');
const mongoose = require('mongoose');

const Students = mongoose.connection.db.collection('students');

const runChildProcess = async (
	feeDetails,
	sectionIds, // treated as studentlist if isStudent is true
	feeStructure,
	schoolId,
	academicYearId,
	categoryId,
	isStudent = false
) => {
	// If isStudent is true, then sectionIds is treated as studentList
	let studentList = sectionIds;
	// Fetch the student list from the student API.
	if (!isStudent) {
		studentList = await Students.find(
			{
				section: { $in: sectionIds },
				deleted: false,
				profileStatus: 'APPROVED',
			},
			'_id section gender'
		).toArray();
	}
	// Spawn child process to insert data into the database
	const childSpawn = spawn('node', [
		'../feeOn-backend/helper/installments.js',
		flatted.stringify(feeDetails),
		flatted.stringify(studentList),
		feeStructure,
		schoolId,
		academicYearId,
		categoryId,
	]);

	childSpawn.stdout.on('data', data => {
		console.log(`stdout: ${data}`);
	});

	childSpawn.stderr.on('data', data => {
		console.error(`stderr: ${data}`);
	});

	childSpawn.on('error', error => {
		console.error(`error: ${error.message}`);
	});

	childSpawn.on('close', code => {
		console.log(`child process exited with code ${code}`);
	});
};

const runPipedProcesses = async (
	feeDetails, // [feeDetails1, feeDetails2]
	studentList, // [studentList1, studentList2]
	feeStructure,
	schoolId,
	academicYearId,
	categoryId
) => {
	const childSpawn = spawn('node', [
		'../feeOn-backend/helper/installments.js',
		flatted.stringify(feeDetails[0]),
		flatted.stringify(studentList[0]),
		feeStructure,
		schoolId,
		academicYearId,
		categoryId,
	]);

	const childSpawn2 = spawn('node', [
		'../feeOn-backend/helper/installments.js',
		flatted.stringify(feeDetails[1]),
		flatted.stringify(studentList[1]),
		feeStructure,
		schoolId,
		academicYearId,
		categoryId,
	]);

	childSpawn.stdout.pipe(childSpawn2.stdin);

	childSpawn2.stdout.on('data', data => {
		console.log(`stdout: ${data}`);
	});

	childSpawn2.stderr.on('data', data => {
		console.error(`stderr: ${data}`);
	});

	childSpawn2.on('error', error => {
		console.error(`error: ${error.message}`);
	});

	childSpawn2.on('close', code => {
		console.log(`child process exited with code ${code}`);
	});
};

module.exports = {
	runChildProcess,
	runPipedProcesses,
};
