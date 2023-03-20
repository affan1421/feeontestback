const NODE_ENV = 'development';
const express = require('express');
require('dotenv').config({ path: `.${NODE_ENV}.env` });
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const bodyParser = require('body-parser');
const swaggerDocument = require('./swagger.json');
const { authenticateUser } = require('./middleware/authorize');
const connectDatabase = require('./utils/dbConnection');

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

connectDatabase();

app.get('/', (req, res) => {
	res.send('Server is up and Running👨‍💻👩‍💻');
});

app.use(authenticateUser);

app.use('/api/v1/feetype', require('./router/feeType'));
app.use('/api/v1/feeschedule', require('./router/feeSchedule'));
app.use('/api/v1/feestructure', require('./router/feeStructure'));

app.use((err, req, res, next) => {
	res.status(err.statusCode || 500).json({
		status: err.status || 'error',
		message: err.message,
	});
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Servers is listening on http://localhost:${port}`);
});

module.exports = app;
