const jwt = require('jsonwebtoken');
const axios = require('axios');

const GROWON_BASE_URL = 'https://api-staging.growon.app/api/v1';

function authenticateUser(req, res, next) {
	// Extract the JWT token from the Authorization header
	const authHeader = req.headers.authorization;

	// If the Authorization header is missing or the token is not in the Bearer format, return an error
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ message: 'Unauthorized' });
	}
	const token = authHeader.substring(7);

	// Decode the JWT token to get the user's ID
	let userId;
	try {
		const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
		userId = decodedToken.userId;
	} catch (err) {
		return res.status(401).json({ message: 'Unauthorized' });
	}

	// Use the user's ID to fetch the user from the GROWON's database
	axios
		.get(`${GROWON_BASE_URL}/auth/erp?userId=${userId}`)
		.then(response => {
			const user = response.data;
			if (!user) {
				return res.status(401).json({ message: 'Unauthorized' });
			}
			req.user = user;
			next();
		})
		.catch(err => {
			console.error(err);
			return res.status(500).json({ message: 'Internal Server Error' });
		});
}

module.exports = authenticateUser;
