$(function() {

  // FIXME: add extensive error handling including parameter validation

  console.log('Poker app by Zach Dobbs');
  // sockets
  var socket = io();

  // vue apps
  var appHeader = new Vue({
    el: '#app-header',
    data: {
      message: 'Welcome to Poker!'
    }
  });

  // FIXME consolidate all app components into one app..
  var appBody = new Vue({
    el: '#app-body',
    data: {
      id: socket.id,
      state: 0,
      dealer: 0,
      players: [],
      table: [],
      bet: 0,
      turn: -1
    }
  });

  // modal initialization
  $('.modal').modal({ dismissible: false });
  $('#name-modal').modal('open');
  $('#send-name').click(function() {
    // set the user's nickname
    socket.emit('set name', $('#name-form').val());
    $('#name-modal').modal('close');
  });
  // allow the send button to be activated by pressing enter
  $(document).keyup(function(e) {
    e.preventDefault();
    if (e.keyCode == 13) {
      if ($('#name-form').val().length === 0) {
        Materialize.toast('Enter a name to continue!', 3000);
      }
      else {
        $('#send-name').click();
        return false;
      }
    }
  });

  $('#send-btn').click(function() {
    // broadcasts a toast to all users, chat interface essentially
    socket.emit('send message', $('#typing-form').val());
    $('#typing-form').val('');
  });

  $('#gen').click(function() {
    // pull the current cards being used
    socket.emit('get cards');
  });

  // handle fold button click
  $('#fold').click(function() {
    socket.emit('player action', 0);
  });

  // handle check/call button click
  $('#call').click(function() {
    socket.emit('player action', 1);
  });

  // handle bet button click
  $('#bet').click(function() {
    socket.emit('player action', 2);
  });

  // a lot of the communication is handled with these socket functions
  socket.on('assign id', function(id) {
    appBody.id = id;
  });

  // recieve the dealer index value
  socket.on('assign dealer', function(i) {
    // find the correct player
    console.log('dealer -> ' + i);
    appBody.dealer = appBody.players[i].id;
  });

  // recieve the currPlayer index
  socket.on('play', function(i, flag) {
    // find correct player
    appBody.turn = appBody.players[i].id;
    console.log('current player: index = ' + i + ", id = " + appBody.turn);
    // check if everyone has played
    if (flag) {
      socket.emit('get cards');
    }
    // update button display
    if (appBody.turn == appBody.id && appBody.state == 0) {
      $('#button-box').show();
    }
    else {
      $('#button-box').hide();
    }
  });

  socket.on('update bet', function(bet) {
    // update the current bet amount
    appBody.bet = bet;
  });

  // recieve the message a player sent
  socket.on('send message', function(msg) {
    // FIXME: send message when user presses enter
    // change color to coordinate to the current socket.id
    Materialize.toast(msg, 5000);
  });

  // retrieve the cards dealt within main
  socket.on('update players', function(players) {
    appBody.players = players;
  });

  // FIXME: this is where the game is starting...
  // implement some better game flow
  // remove the functionality of the draw button
  socket.on('draw cards', function(cards) {
    appBody.state = 0;
    appBody.table = cards;
  });

  // score the results of the game
  socket.on('score game', function(players) {
    // change this to reflect only players that are still betting
    appBody.state = 1;
    var inc = 0;
    var max = 0;
    var best = [];
    var winner = [];
    var table = appBody.table;
    // example test case for comparing two flushes
    // appBody.table = [9, 1, 2, 3, 6];
    // players[0].c1 = 11;
    // players[0].c2 = 12;
    // players[1].c1 = 4;
    // players[1].c2 = 8;
    for (w = 0; w < players.length; w++) {
      players[w].score = score(players[w], table);
      console.log(players[w].name + ' -> ' + players[w].score.base);
      if (players[w].score.base == max) {
        winner.push(players[w]);
      }
      else if (players[w].score.base > max) {
        winner = [];
        winner.push(players[w]);
        max = players[w].score.base;
      }
    }
    best.push(winner[0]);
    // need to break ties now
    if (winner.length > 1) {
      best = breakTie(winner);
    }
    if (best.length > 1) {
      // there is a tie
      appHeader.message = 'There was a tie!';
    }
    else {
      appHeader.message = best[0].name + ' wins the hand!';
    }
    // hide the buttons so noone can act while winning hand is shown
    $('#button-box').hide();
    var tempTurn = appBody.turn;
    appBody.turn = -2;
    // pause a few seconds before dealing new hand
    // only call if the user is the dealer, prevent multiple calls
    setTimeout(function() {
      appBody.turn = tempTurn;
      appBody.state = 0;
      if (appBody.id == appBody.dealer) {
        socket.emit('get cards');
      }
    }, 5000);
  });
});
