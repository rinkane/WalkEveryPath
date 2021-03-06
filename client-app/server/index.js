const compression = require('compression');
const path = require('path');
const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(compression());

app.use(express.static(__dirname + '/../dist'));

app.listen(port);

app.get('/*', function(req, res) {
  res.sendFile(path.join(__dirname + '/../dist/index.html'));
});
