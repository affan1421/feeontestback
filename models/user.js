const { Schema, model } = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = new Schema(
	{
		username: {
			type: String,
			required: [true, 'Please provide a username'],
			unique: true,
		},
		password: {
			type: String,
			required: [true, 'Please provide a password'],
			minlength: 6,
		},
		name: String,
		mobile: Number,
		email: String,
		schoolId: {
			type: Schema.Types.ObjectId,
			ref: 'School',
			required: true,
		},
		role: {
			type: String,
			enum: ['admin', 'management', 'principal'],
			default: 'admin',
		},
		gender: {
			type: String,
			enum: ['Male', 'Female'],
		},
	},
	{ timestamps: true }
);

userSchema.pre('save', async function (next) {
	if (!this.isModified('password')) {
		next();
	}
	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
	return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateToken = async function () {
	const token = jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRE,
	});
	return token;
};

module.exports = model('User', userSchema);
