$(function() {
  console.log('Poker! by Zach Dobbs');
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
      players: [],
      table: []
    }
  });

  $('#send-btn').click(function() {
    // broadcasts a toast to all users, chat interface essentially
    socket.emit('send message', $('#typing-form').val());
    $('#typing-form').val('');
  });

  socket.on('send message', function(msg) {
    // change color to coordinate to the current socket.id
    Materialize.toast(msg, 5000);
  });

  $('#gen').click(function() {
    // pull the current cards being used
    socket.emit('get cards');
  });

  socket.on('deal cards', function(players) {
    appBody.players = players;
  });

  socket.on('draw cards', function(cards) {
    if (appBody.table.length >= 5)
      appBody.table = [];
    for (i=0; i < cards.length; i++)
      appBody.table.push(cards[i]);
  });
});
