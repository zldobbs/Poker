// setup required app variables
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// create route to node modules folder for easy referncing
app.use(express.static(__dirname + '/node_modules'));

// define an assets folder location for the app to locate
app.use('/static', express.static(__dirname + '/static'));

// handle routing for the main view
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/views/main.html');
});

// GLOBAL VARIABLES
/* create a state variable to keep track of the current location of the game
0 = pregame, no cards dealt
1 = flop, 2 cards each player, 1 in burn pile, 3 on table
2 = turn, 1 card burn, 1 card to table
3 = river, 1 card burn, 1 card to table
4 = scoring, show all player cards */
var state = 0;
// create an array to hold the players and their cards
var players = [];
// create an array to hold all currently used cards
var usedCards = [];
// create an array to hold the cards currently on the table
var tableCards = [];
// template var for a player
var player = 0;

// draw card function
function drawCard() {
  // implement some functionality in here..
  if (usedCards.length >= 52) {
    console.log('error! out of cards to play');
    return 0;
  }
  var duplicate = 1;
  var card = 0;
  while (duplicate == 1) {
    // get a value between 1 and 52
    duplicate = 0;
    card = Math.floor(Math.random() * 52) + 1;
    for (j = 0; j < usedCards.length; j++) {
      if (card == usedCards[j])
        duplicate = 1;
    }
  }
  usedCards.push(card);
  return card;
}

// socket handling
io.on('connection', function(socket) {
  // add a new player to the game on connection, remove on disconnect
  player = {id: socket.id, c1: 0, c2: 0, name: 'unbound'};
  players.push(player);
  console.log('new player -> ' + player['id']);
  console.log('current player count: ' + players.length);
  if (tableCards.length > 0) {
    // if the game has already started, send the table to the new user
    socket.emit('draw cards', tableCards);
    socket.broadcast.emit('draw cards', tableCards);
  }
  // assign the user's id
  socket.emit('assign id', socket.id);
  socket.on('disconnect', function() {
    var index = -1;
    for (i = 0; i < players.length; i++) {
      if (players[i].id == socket.id) {
        index = i;
      }
    }
    if (index == -1) {
      console.log('unable to find disconnecting id -> ' + socket.id);
    }
    else {
      console.log(socket.id + ' has disconnected');
      players.splice(index, 1);
    }
  });

  // set a user's nickname
  socket.on('set name', function(name) {
    for (i = 0; i < players.length; i++) {
      if (socket.id == players[i].id) {
        players[i].name = name;
      }
    }
  });
  // broadcast message to all players
  socket.on('send message', function(msg) {
    // add some sort of session variable to keep track of users
    console.log(socket.id + " is sending " + msg);
    socket.emit('send message', msg);
    socket.broadcast.emit('send message', msg);
  });
  // get cards for each player
  socket.on('get cards', function() {
    if (state == 0) {
      usedCards = [];
      // draw 2 cards for each player
      for (i = 0; i < players.length; i++) {
        if (players[i].name) {
          players[i].c1 = drawCard();
          players[i].c2 = drawCard();
        }
      }
      console.log(players);
      // send players dealt hands back to clients
      socket.emit('deal cards', players);
      socket.broadcast.emit('deal cards', players);
    }
    if (state < 3) {
      // now dealer draw, first burn 1
      drawCard();
      var cards = [];
      // draw 3 for the flop
      if (state == 0)
        for (i=0; i < 2; i++)
          cards.push(drawCard());
      cards.push(drawCard());
      console.log('dealer draws -> ' + cards);
      for (i=0; i < cards.length; i++)
        tableCards.push(cards[i]);
      // send the drawn table cards back to clients
      socket.emit('draw cards', tableCards);
      socket.broadcast.emit('draw cards', tableCards);
    }
    else {
      socket.emit('score game', players);
      socket.broadcast.emit('score game', players);
    }
    // bump state
    state++;
    if (state >= 4) {
      state = 0;
      tableCards = [];
    }
  });
});

// serve the app
http.listen(3000, function() {
  console.log("Listening on *:3000");
});
