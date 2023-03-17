const mongoose = require('mongoose');

const connectDatabase = () => {
	mongoose
		.connect(process.env.MONGO_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		})
		.then(con => {
			console.log(`MongoDB Database Connected`);
		})
		.catch(err => {
			console.log(err.message);
			process.exit(1);
		});
};

module.exports = connectDatabase;
