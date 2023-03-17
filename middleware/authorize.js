const jwt = require('jsonwebtoken');
const axios = require('axios');
const ErrorResponse = require('../utils/errorResponse');

const cache = new Map();

const authenticateUser = async (req, res, next) => {
	try {
		// Extract the JWT token from the Authorization header
		const authHeader = req.headers.authorization;

		// If the Authorization header is missing or the token is not in the Bearer format, return an error
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return next(new ErrorResponse('Unauthorized Access', 401));
		}

		const token = authHeader.substring(7);

		// Decode the JWT token to get the user's ID
		const decodedToken = await jwt.verify(token, process.env.JWT_SECRET);

		if (!decodedToken) {
			return next(new ErrorResponse('Invalid Token', 401));
		}

		// Extract the user's ID from the decoded token
		const { id } = decodedToken;

		// Check if the user is already cached
		const cachedUser = cache.get(id);

		if (cachedUser) {
			req.user = cachedUser;
			return next();
		}

		// Use the user's ID to fetch the user from the GROWON's database
		const response = await axios.get(
			`${process.env.GROWON_BASE_URL}/auth/erp?userId=${id}`
		);
		const user = response.data;
		if (!user) {
			return next(new ErrorResponse('Unauthorized Access', 401));
		}

		// Attach the user to the request object
		req.user = user;

		// Cache the user
		cache.set(id, user);

		next();
	} catch (error) {
		next(
			// If an error occurs, return a 401 Unauthorized response
			new ErrorResponse('Unauthorized Access', 401)
		);
	}
};
module.exports = { authenticateUser, cache };
