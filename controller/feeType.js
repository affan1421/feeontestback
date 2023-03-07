const Feetype = require('../models/feeType');

// CREATE
exports.create = async (req, res) => {
  try {
    const { name, description, accountType } = req.body;
    const newFeetype = await Feetype.create({ name, description, accountType });
    res.status(201).json(newFeetype);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// READ
exports.read = async (req, res) => {
  try {
    const feetype = await Feetype.findById(req.params.id);
    if (feetype === null) {
      return res.status(404).json({ message: 'Feetype not found' });
    }
    res.json(feetype);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const { name, description, accountType } = req.body;
    const feetype = await Feetype.findByIdAndUpdate(req.params.id, { name, description, accountType }, { new: true });
    if (feetype === null) {
      return res.status(404).json({ message: 'Feetype not found' });
    }
    res.json(feetype);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE
exports.delete = async (req, res) => {
  try {
    const feetype = await Feetype.findByIdAndDelete(req.params.id);
    if (feetype === null) {
      return res.status(404).json({ message: 'Feetype not found' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// LIST
exports.list = async (req, res) => {
  try {
    const feetypes = await Feetype.find();
    res.json(feetypes);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
