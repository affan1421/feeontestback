const express = require('express');
const router = express.Router();
const feetypeController = require('../controller/feeType');

// CREATE
router.post('/', feetypeController.create);

// READ
router.get('/:id', feetypeController.read);

// UPDATE
router.put('/:id', feetypeController.update);

// DELETE
router.delete('/:id', feetypeController.delete);

// LIST
router.get('/', feetypeController.list);

module.exports = router;
