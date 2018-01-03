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
  $('#name-modal').keyup(function(e) {
    if (e.keyCode == 13) {
      $('#send-name').click();
      return false;
    }
  });

  function straight_check(cards) {
    // to check for a straight, find if 5 cards are in a streak
    var streak = 0;
    var straight = 0;
    var highCard = 0;
    cards.sort(function(a,b) { return a-b; });
    for (i = 0; i < cards.length - 1; i++) {
      if ((cards[i]+1) == cards[i+1]) {
        streak++;
        if (streak >= 4) {
          highCard = cards[i+1] % 13;
          if (highCard == 0)
            highCard = 13;
          straight = 1;
        }
      }
      else if ((cards[i]%13 == 4) && streak >= 3) {
        // handle the case where ace should be evaluated low in a straight
        for (j = i + 1; j < cards.length; j++) {
          if (cards[j]%13 == 0) {
            streak++;
            if (streak >= 4) {
              highCard = cards[i]%13;
              straight = 1;
            }
          }
        }
      }
      else if (cards[i] != cards[i+1]) {
        streak = 0;
      }
    }
    var result = {score: straight, hc: highCard};
    return result;
  }

  /* poker scoring, this gonna be big n nasty */
  function score(player) {
    console.log(player);
    var cards = [];
    cards.push(player.c1);
    cards.push(player.c2);
    for (i = 0; i < appBody.table.length; i++)
      cards.push(appBody.table[i]);
    /* cards should now have the players hand and all 5 table cards
       cards13 will be all of the cards, but value mod 13. this will be useful
       in later compuatations. */
    var cards13 = cards.slice();
    for (i = 0; i < cards.length; i++) {
      cards13[i] %= 13;
      // make ace = 13 not 0
      if (cards13[i] == 0)
        cards13[i] = 13;
    }
    // sort both card arrays in ascending order
    cards.sort(function(a,b) { return a-b; });
    cards13.sort(function(a,b) { return a-b; });
    console.log('cards = ' + cards);
    console.log('cards13 = ' + cards13);
    /* base score will be used to denote the hand the user has
   10. Royal Flush
    9. Straight Flush
    8. 4 of a Kind
    7. Full House
    6. Flush
    5. Straight
    4. Three of a Kind
    3. Two Pairs
    2. One pair
    1. High Card
    default to high card since thats the lowest hand you could get */
    var baseScore = 1;
    var score = 0;
    // kicker values will be needed to break some ties
    var kicker = [];
    // create arrays for each of the possible combinations of duplicates
    var pairs = [], triples = [], seen = [];
    for (i = 0; i < cards13.length - 1; i++) {
      if (cards13[i] != seen[seen.length - 1]) {
        for (l = i + 1; l < cards13.length; l++) {
          if (cards13[i] == cards13[l]) {
            for (j = 0; j < pairs.length; j++) {
              if (cards13[i] == pairs[j]) {
                // if it is already a pair, need to check if its already a triple
                for (k = 0; k < triples.length; k++) {
                  // if it is already a triple, then it must also be a quad
                  if (cards13[i] == triples[k]) {
                    // need to send the highest kicker card back as well
                    if (i == 6)
                      // then we are at the end of the array of cards
                      kicker.push(cards13[2]);
                    else
                      kicker.push(cards13[i+1]);
                    score = {base: 8, data: [cards13[i], kicker[0]]};
                    return score;
                  }
                }
                // if it's not already a triple, then it must now be
                triples.push(cards13[i]);
                console.log('triples ' + triples);
              }
            }
            if (triples[triples.length - 1] != cards13[i]) {
              // if it's not already a pair, then it must now be
              pairs.push(cards13[i]);
              console.log('pairs ' + pairs);
            }
          }
        }
      }
      seen.push(cards13[i]);
    }
    // now check for a full house before checking straight/flush
    for (i = triples.length - 1; i >= 0; i--) {
      for (j = pairs.length - 1; j >= 0; j--) {
        if (triples[i] != pairs[j]) {
          // a full house has been found!
          score = {base: 7, data: [triples[i], pairs[j]]};
          return score;
        }
      }
    }
    // now we need to look for a flush, use arrays for each suit
    var d = [], s = [], c = [], h = [];
    // variable to hold the result of straight function call
    var straight = 0;
    for (i = 0; i < cards.length; i++) {
      if (cards[i] <= 13) {
        c.push(cards[i]);
        if (c.length >= 5) {
          straight = straight_check(c);
          if (straight.score == 1) {
            // straight flush, check if royal
            if (straight.hc == 13) {
              score = {base: 10, data: 'c'};
              return score;
            }
            score = {base: 9, data: straight.hc};
            return score;
          }
          // if here, it's not a straight flush, but it is a Flush
          score = {base: 6, data: c[c.length - 1]};
        }
      }
      else if (cards[i] <= 26) {
        d.push(cards[i]);
        if (d.length >= 5) {
          straight = straight_check(d);
          if (straight.score == 1) {
            // straight flush, check if royal
            if (straight.hc == 13) {
              score = {base: 10, data: 'd'};
              return score;
            }
            score = {base: 9, data: straight.hc};
            return score;
          }
          score = {base: 6, data: d[d.length - 1]};
        }
      }
      else if (cards[i] <= 39) {
        h.push(cards[i]);
        if (h.length >= 5) {
          straight = straight_check(h);
          if (straight.score == 1) {
            // straight flush, check if royal
            if (straight.hc == 13) {
              score = {base: 10, data: 'h'};
              return score;
            }
            score = {base: 9, data: straight.hc};
            return score;
          }
          score = {base: 6, data: h[h.length - 1]};
        }
      }
      else {
        s.push(cards[i]);
        if (s.length >= 5) {
          straight = straight_check(s);
          if (straight.score == 1) {
            // straight flush, check if royal
            if (straight.hc == 13) {
              score = {base: 10, data: 's'};
              return score;
            }
            score = {base: 9, data: straight.hc};
            return score;
          }
          score = {base: 6, data: s[s.length - 1]};
        }
      }
    }
    if (score.base)
      return score;
    // now check for a general straight
    straight = straight_check(cards13);
    if (straight.score == 1) {
      score = {base: 5, data: straight.hc};
      return score;
    }
    // now we have to return highest triple if there is one
    if (triples.length > 0) {
      for (i = cards13.length - 1; i >= 0; i--) {
        if (cards13[i] != triples[triples.length - 1]) {
          kicker.push(cards13[i]);
          if (kicker.length > 2) {
            score = {base: 4, data: [triples[triples.length - 1], kicker[0], kicker[1]]};
            return score;
          }
        }
      }
    }
    // now lets check the pairs
    if (pairs.length > 0) {
      if (pairs.length > 1) {
        // there are two pairs
        for (i = cards13.length - 1; i >=0; i--) {
          if (cards13[i] != pairs[pairs.length - 1]) {
            score = {base: 3, data: [pairs[pairs.length - 1], pairs[pairs.length - 2], cards13[i]]};
            return score;
          }
        }
      }
      for (i = cards13.length - 1; i >= 0; i--) {
        if (cards13[i] != pairs[0]) {
          kicker.push(cards13[i]);
          if (kicker.length > 3) {
            score = {base: 2, data: [pairs[0], kicker[0], kicker[1], kicker[2]]};
            return score;
          }
        }
      }
    }
    // if we are here... then the player only has high card..
    score = {base: 1, data: cards13.splice(2, 5)};
    return score;
  }

  // a lot of the communication is handled with these socket functions
  socket.on('assign id', function(id) {
    appBody.id = id;
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
    appBody.state = 0;
    appBody.table = cards;
  });

  socket.on('score game', function(players) {
    // change this to reflect only players that are still betting
    appBody.state = 1;
    var max = 0;
    var winner = 'none';
    var scores = [];
    for (w = 0; w < players.length; w++) {
      scores.push(score(players[w]));
      console.log(players[w].name + ' -> ' + scores[w].base);
      if (scores[w].base > max) {
        max = scores[w].base;
        winner = players[w].name;
      }
    }
    appHeader.message = winner + ' wins the hand!';
  });
});
