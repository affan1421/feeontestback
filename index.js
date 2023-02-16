const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Servers is Running');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

module.exports = app
