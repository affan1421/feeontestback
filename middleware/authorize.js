const jwt = require('jsonwebtoken');
const axios = require('axios');

const cache = new Map();

const authenticateUser = async (req, res, next) => {
	try {
		// Extract the JWT token from the Authorization header
		const authHeader = req.headers.authorization;

		// If the Authorization header is missing or the token is not in the Bearer format, return an error
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ message: 'Unauthorized' });
		}

		const token = authHeader.substring(7);

		// Decode the JWT token to get the user's ID
		const decodedToken = await jwt.verify(token, process.env.JWT_SECRET);

		if (!decodedToken) {
			return res.status(401).json({ message: 'invalid token' });
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
			return res.status(401).json({ message: 'Unauthorized' });
		}

		// Attach the user to the request object
		req.user = user;

		// Cache the user
		cache.set(id, user);

		next();
	} catch (error) {
		next(error.message);
	}
};
module.exports = { authenticateUser, cache };
