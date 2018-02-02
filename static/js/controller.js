$(function() {

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

  var appBody = new Vue({
    el: '#app-body',
    data: {
      state: 0,
      dealer: 0,
      players: [],
      table: []
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

  // a lot of the communication is handled with these socket functions
  socket.on('assign id', function(id) {
    appBody.id = id;
  });

  // recieve the dealer index value
  socket.on('assign dealer', function(i) {
    // find the correct player
    console.log('dealer -> ' + i);
    // loop to find the correct player
    // var i = 0;
    // for (appBody.player in appBody.players)
    appBody.dealer = appBody.players[i].id;
  });

  // recieve the message a player sent
  socket.on('send message', function(msg) {
    // change color to coordinate to the current socket.id
    Materialize.toast(msg, 5000);
  });

  // retrieve the cards dealt within main
  socket.on('deal cards', function(players) {
    appBody.players = players;
  });

  // FIXME: this is where the game is starting...
  // remove the functionality of the deal cards button
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
  });
});
