const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');

const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

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
	});

app.get('/', (req, res) => {
	res.send('Server is up and Running👨‍💻👩‍💻');
});

app.use('/api/v1/user', require('./router/user'));

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Servers is listening on port ${port}`);
});

module.exports = app;
