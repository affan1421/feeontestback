/* eslint-disable global-require */
const NODE_ENV = 'development';
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config({ path: `.${NODE_ENV}.env` });
require('./jobs/installmentDue');

const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const bodyParser = require('body-parser');
const swaggerDocument = require('./swagger.json');
const morganMiddleware = require('./middleware/morgan');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

const options = {
	explorer: true,
	swaggerOptions: {
		validatorUrl: null,
	},
};

app.use(
	'/api-docs',
	swaggerUi.serve,
	swaggerUi.setup(swaggerDocument, options)
);

mongoose
	.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => {
		console.log(`MongoDB Database Connected`);
		const { authenticateUser } = require('./middleware/authorize');

		app.use(morganMiddleware);

		app.get('/', (req, res) => {
			res.send('Server is up and Running👨‍💻👩‍💻');
		});

		app.use(authenticateUser);

		app.use('/api/v1/config', require('./router/academicYear'));
		app.use('/api/v1/feetype', require('./router/feeType'));
		app.use('/api/v1/expenseType', require('./router/expenseType'));
		app.use('/api/v1/expense', require('./router/expense'));
		app.use('/api/v1/donor', require('./router/donor'));
		app.use('/api/v1/feeschedule', require('./router/feeSchedule'));
		app.use('/api/v1/feecategory', require('./router/feeCategory'));
		app.use('/api/v1/feestructure', require('./router/feeStructure'));
		app.use('/api/v1/feeinstallment', require('./router/feeInstallment'));
		app.use('/api/v1/discount', require('./router/discountCategory'));
		app.use('/api/v1/applicationfee', require('./router/applicationFee'));
		app.use('/api/v1/feereceipt', require('./router/feeReceipt'));

		app.use((err, req, res, next) => {
			res.status(err.statusCode || 500).json({
				status: err.status || 'error',
				message: err.message,
			});
		});

		const port = process.env.PORT || 4000;
		app.listen(port, () => {
			console.log(`Servers is listening on http://localhost:${port}`);
		});
	})
	.catch(err => {
		console.log(err.message);
		process.exit(1);
	});

module.exports = { app };
