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

/*
GLOBAL VARIABLES
 FIXME really shouldn't be using global vars.. cleaning this up would take a while
 ^ to solve, perhaps create two objects, player and table...
*/

/*
create a state variable to keep track of the current location of the game
0 = pregame, no cards dealt
1 = flop, 2 cards each player, 1 in burn pile, 3 on table
2 = turn, 1 card burn, 1 card to table
3 = river, 1 card burn, 1 card to table
4 = scoring, show all player cards
*/
var state = 0;
// create an array to hold the players and their cards
var players = [];
// another array for players that have folded
var foldedPlayers = [];
// merge these arrays at state 0
// create an array to hold all currently used cards
var usedCards = [];
// create an array to hold the cards currently on the table
var tableCards = [];
// template var for a player
var player = 0;
// template var for the dealer
var dealer = -1;
// template var for currPlayer
var currPlayer = 0;
// current bet on the table
var bet = 100;

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
  // FIXME better handling of joining a game in session, perhaps LOBBY VIEW?
  // FIXME redesign architecture to make this more OOP (table and player objects)
  player = {
    id: socket.id,
    money: 1000,
    bet: 0,
    c1: 0,
    c2: 0,
    name: 'unbound',
    score: {
      base: 0,
      data: []
    }};
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

  // handle a user play
  socket.on('player action', function(action) {
    console.log('recieved action.. curr = ' + players[currPlayer]);
    if (socket.id != players[currPlayer].id) {
      action = -1;
    }
    switch(action) {
      // fold
      case 0:
        console.log(players[currPlayer].id + ' folded');
        foldedPlayers.push({index: currPlayer, player: players[currPlayer]});
        players.splice(currPlayer, 1);
        console.log(foldedPlayers);
        if (players.length == 1) {
          socket.emit('score game', players);
          socket.broadcast.emit('score game', players);
          state = 0;
          tableCards = [];
        }
        socket.emit('update players', players);
        socket.broadcast.emit('update players', players);
        break;
      // call
      case 1:
        console.log(players[currPlayer].id + ' called');
        break;
      // bet
      case 2:
        console.log(players[currPlayer].id + ' bet');
        break;
      default:
        console.log("Error on play function");
        return 0;
    }
    var flag = false;
    if (currPlayer == dealer) {
      flag = true;
    }
    // bump player
    currPlayer++;
    // check if player is at the end of the array
    if (currPlayer > players.length-1) {
      currPlayer = 0;
    }
    // send the currPlayer back with the trigger flag setting
    socket.emit('play', currPlayer, flag);
    // broadcast updated player to all, but don't let get cards get called
    socket.broadcast.emit('play', currPlayer, false);
  });

  // get cards for each player
  socket.on('get cards', function() {
    if (state == 0) {
      // merge the currPlayer and foldedPlayers arrays
      // maintain order...
      while (foldedPlayers.length > 0) {
        players.splice(foldedPlayers[0].index, 0, foldedPlayers[0].player);
        foldedPlayers.splice(0, 1);
        console.log(foldedPlayers);
      }
      usedCards = [];
      // draw 2 cards for each player
      for (i = 0; i < players.length; i++) {
        if (players[i].name) {
          players[i].c1 = drawCard();
          players[i].c2 = drawCard();
        }
      }
      // send the current players array
      socket.emit('update players', players);
      socket.broadcast.emit('update players', players);
      // assign the dealer
      // check if it has been set yet, or if the dealer is at the end
      if (dealer == -1 || dealer >= players.length-1) {
        dealer = 0;
      }
      // right now not adding blinds.. consider adding later
      else {
        dealer++;
      }
      // send the dealer value to the table
      socket.emit('assign dealer', dealer);
      socket.broadcast.emit('assign dealer', dealer);
      // assign the current player value
      currPlayer = dealer+1;
      if (currPlayer > players.length-1) {
        currPlayer = 0;
      }
      // emit the current player
      socket.emit('play', currPlayer, false);
      socket.broadcast.emit('play', currPlayer, false);
      // reset state of table
      socket.emit('draw cards', tableCards);
      socket.broadcast.emit('draw cards', tableCards);
      // update the bet on the table
      bet = 100;
    }
    else if (state < 4) {
      // now dealer draw, first burn 1
      drawCard();
      var cards = [];
      // draw 3 for the flop
      if (state == 1)
        for (i=0; i < 2; i++)
          cards.push(drawCard());
      cards.push(drawCard());
      console.log('dealer draws -> ' + cards);
      for (i=0; i < cards.length; i++)
        tableCards.push(cards[i]);
      // send the drawn table cards back to clients
      socket.emit('draw cards', tableCards);
      socket.broadcast.emit('draw cards', tableCards);
      bet = 0;
    }
    else {
      console.log('scoring game');
      socket.emit('score game', players);
      socket.broadcast.emit('score game', players);
    }
    socket.emit('update bet', bet);
    socket.broadcast.emit('update bet', bet);
    // bump state
    state++;
    console.log('state ' + state);
    if (state > 4) {
      state = 0;
      tableCards = [];
    }
  });
});

// serve the app
http.listen(3000, function() {
  console.log("Listening on *:3000");
});
