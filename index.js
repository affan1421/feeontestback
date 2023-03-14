const NODE_ENV = 'development';
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config({ path: `.${NODE_ENV}.env` });
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const bodyParser = require('body-parser');
const swaggerDocument = require('./swagger.json');
const { authenticateUser } = require('./middleware/authorize');

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
		console.log('Database Connected');
	})
	.catch(err => {
		console.log(err);
		process.exit(1);
	});

app.get('/', (req, res) => {
	res.send('Server is up and Running👨‍💻👩‍💻');
});

app.use(authenticateUser);

app.use('/api/v1/feetype', require('./router/feeType'));
app.use('/api/v1/feeschedule', require('./router/feeSchedule'));

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Servers is listening on http://localhost:${port}`);
});

module.exports = app;
