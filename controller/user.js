const User = require('../models/user');
const catchAsync = require('../utils/catchAsync');
const SuccessResponse = require('../utils/successResponse');
const ErrorResponse = require('../utils/errorResponse');

exports.login = catchAsync(async (req, res, next) => {
	const { username, password } = req.body;
	const foundUser = await User.findOne({ username });
	if (!foundUser) {
		return next(new ErrorResponse('Invalid Username', 401));
	}
	const isMatch = await foundUser.comparePassword(password);
	if (!isMatch) {
		return next(new ErrorResponse('Invalid Password', 401));
	}
	const token = await foundUser.generateToken();
	res.status(200).json(SuccessResponse({ token }, 1, 'Login Successful'));
});
