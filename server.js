const express = require('express');
const server = express();
server.use('/', express.static(__dirname + '/'));
server.listen(8000, () => {
  console.log('Listening on port 8000');
});
