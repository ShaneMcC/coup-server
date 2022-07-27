import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import Game from '../../src/Game/Game.js';

Given(/the following players are in a (game|lobby):/, function (gameType, dataTable) {
    this.game = new Game();
    this.game.createGame();

    for (var player of dataTable.hashes()) {
        if (player.name == undefined) { throw new Error('Players must have a name'); }

        // We're haxing the IDs to be the player name here because it makes things easier...
        // Otherwise we would use
        this.game.emit('addPlayer', { 'id': player.name, 'name': player.name });

        if (gameType == 'game') {
            // Ready up the player so that we can start the game.
            this.game.doPlayerAction(player.name, 'READY');
        }
    };

    if (gameType == 'game') {
        // Assume game has started.
        this.game.doPlayerAction(dataTable.hashes()[0].name, 'STARTGAME');

        // If we want to set influence, then do it.
        if (dataTable.hashes()[0].Influence1 != undefined || dataTable.hashes()[0].Influence2 != undefined) {

            // First discard the auto-allocated influence.
            for (const [_, player] of Object.entries(this.game.players())) {
                this.game.emit('returnInfluenceToDeck', { 'player': player.name, 'influence': player.influence[0] });
                this.game.emit('returnInfluenceToDeck', { 'player': player.name, 'influence': player.influence[1] });
            }

            // Now, attempt to re-allocate influence.
            for (var player of dataTable.hashes()) {
                if (player.Influence1 && player.Influence1.toUpperCase() != 'ANY') {
                    this.game.emit('allocateInfluence', { 'player': player.name, 'influence': player.Influence1.toUpperCase() });
                } else {
                    this.game.emit('allocateNextInfluence', { 'player': player.name });
                }

                if (player.Influence2 && player.Influence2.toUpperCase() != 'ANY' && player.Influence2.toUpperCase() != 'NONE') {
                    this.game.emit('allocateInfluence', { 'player': player.name, 'influence': player.Influence2.toUpperCase() });
                } else if (player.Influence2 && player.Influence2.toUpperCase() == 'ANY') {
                    this.game.emit('allocateNextInfluence', { 'player': player.name });
                }
            }
        }

        if (dataTable.hashes()[0].coins != undefined) {
            // Upgrade people's coinage to the right value.
            for (const [_, player] of Object.entries(this.game.players())) {
                this.game.emit('playerLostCoins', { 'player': player.name, 'coins': player.coins });
            }

            for (var player of dataTable.hashes()) {
                this.game.emit('playerGainedCoins', { 'player': player.name, 'coins': player.coins });
            }
        }

        // Clear the events so that we only collect events from our test.
        this.game.clearEvents();
    }
});

Given('{word} is ready', function (player) {
    this.game.doPlayerAction(player, 'READY');
});

When('{word} wants to start the game', function (player) {
    try {
        this.game.doPlayerAction(player, 'STARTGAME');
    } catch (e) { }
});

Given('it is {word}s turn', function (player) {
    for (var i = 0; i < Object.entries(this.game.players()).length; i++) {
        if (this.game.currentPlayerID() == player) { return true; }
        this.game.startNextTurn();
    }

    throw new Error('Unable to advance to player turn.');
});

Then('{word} is the current player', function (player) {
    assert(this.game.currentPlayerID() == player);
});

Then(/the (GameEvents) (do not contain|contain) the following:/, function (eventsType, matchType, dataTable) {
    var events;
    if (eventsType == 'GameEvents') { events = this.game.collectEvents(); }

    // This is horrible.
    for (var wantedEvent of dataTable.hashes()) {
        var foundEvent = false;

        for (var actualEvent of events) {
            var isMatchingEvent = true;
            for (var key in wantedEvent) {
                if (wantedEvent[key] != actualEvent[key]) {
                    isMatchingEvent = false;
                    break;
                }
            }

            if (isMatchingEvent) {
                foundEvent = true;
                break;
            }
        }

        assert(foundEvent === (matchType == 'contain'));
    }
});

Then(/debug (GameEvents)/, function (debugType) {
    if (debugType == 'GameEvents') {
        console.dir(this.game.collectEvents(), { depth: null });
    }
});