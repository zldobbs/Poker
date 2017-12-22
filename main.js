// setup required app variables
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// define an assets folder location for the app to locate
app.use('/static', express.static(__dirname + '/static'));

// handle route for the main view
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/views/main.html');
});

// serve the app
http.listen(3000, function() {
  console.log("Listening on *:3000");
});
