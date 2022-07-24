#!/usr/bin/env node

"use strict";

import Game from './src/Game.js';

var game = new Game();
game.createGame();

// Add Players
var alice = game.addPlayer('alice');
game.doPlayerAction(alice, 'READY');

var bob = game.addPlayer('bob');
game.doPlayerAction(bob, 'READY');

var charlie = game.addPlayer('charlie');
game.doPlayerAction(charlie, 'READY');

// Start Game.
game.doPlayerAction(alice, 'STARTGAME');
game.doPlayerAction(alice, 'INCOME');


var events = game.collectEvents();
console.log("=====================================");
var game2 = new Game();
game2.hydrate(events);
/* */

/*
console.log("=====================================");
console.dir(game.collectEvents(), {depth: null});
console.log("=====================================");
console.dir(game2.collectEvents(), {depth: null});
console.log("====================================="); /* */