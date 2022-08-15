import { Given, When, Then, Before, After } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import EventEmitter from 'events';
import GameServer from '../../src/Server/GameServer.js';
import CollectableEventBus from '../../src/Game/CollectableEventBus.js';

class TestableGameServer extends GameServer {
    constructor() {
        const $appConfig = {
            listenPort: 0,
            adminAuthToken: 'TestAuthToken',
            publicGames: true,
            debugGames: false,
            persistGames: false,
            testGames: false,
            saveLocation: undefined,
            buildConfig: { gitVersion: "Unknown" },
            silent: true,
        }
        
        super($appConfig);
    }
    serverTick() { /* Do Nothing */ }
    hourly() { /* Do Nothing */ }
    run() { /* Do Nothing */ }
}

class FakeSocket {
    id = undefined;

    serverEmitter = new EventEmitter();
    clientEmitter = new CollectableEventBus();

    constructor(id) {
        this.id = id;
    }

    emit(event, ...args) {
        this.clientEmitter.emit(event, ...args);
    }

    on(event, handler) {
        this.serverEmitter.on(event, handler);
    }

    clientEmit(event, ...args) {
        this.serverEmitter.emit(event, ...args);
    }

    clientOn(event, handler) {
        this.clientEmitter.on(event, handler);
    }
}

Before(function () {
    this.gameServer = new TestableGameServer();
});

After(function () {
    delete this.gameServer;
});

Given(/the following players are in a (game|lobby):/, function (gameType, dataTable) {
    this.game = this.gameServer.createGame();
    this.clients = {};

    for (var player of dataTable.hashes()) {
        if (player.name == undefined) { throw new Error('Players must have a name'); }

        // We're haxing the IDs to be the player name here because it makes things easier...
        // Otherwise we would use game.addPlayer();
        this.game.emit('addPlayer', { 'id': player.name, 'name': player.name });

        // Also acquire a client socket for this client in case we want to inspect it.
        this.clients[player.name] = { socket: new FakeSocket(player.name), handler: undefined, setupEvents: [] };
        this.clients[player.name].handler = this.gameServer.getSocketHandler(this.clients[player.name].socket, 'client');
        this.clients[player.name].socket.clientEmit('rejoinGame', this.game.gameID(), player.name);

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

        // Specifically start with the first player not random.
        this.game.emit('beginPlayerTurn', {'player': Object.keys(this.game.players())[0] });

        // Clear the events so that we only collect events from our test.
        this.setupEvents = this.game.collectEvents();
        this.game.clearEvents();

        // Clear the client events for the same reason.
        for (const client of Object.values(this.clients)) {
            client.setupEvents = client.socket.clientEmitter.collect();
            client.socket.clientEmitter.clear();
        }
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

function handleEventsCheck(events, dataTable, checkContains) {
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

        assert(foundEvent === checkContains);
    }
}

Then(/the GameEvents (do not contain|contain) the following:/, function (matchType, dataTable) {
    handleEventsCheck(this.game.collectEvents(), dataTable, (matchType == 'contain'));
});

Then(/the GameSetupEvents (do not contain|contain) the following:/, function (matchType, dataTable) {
    handleEventsCheck(this.setupEvents, dataTable, (matchType == 'contain'));
});

Then(/the ClientEvents for ([^\s]+) (do not contain|contain) the following:/, function (player, matchType, dataTable) {
    handleEventsCheck(this.clients[player]?.socket.clientEmitter.collect(), dataTable, (matchType == 'contain'));
});

Then(/the ClientSetupEvents for ([^\s]+) (do not contain|contain) the following:/, function (player, matchType, dataTable) {
    handleEventsCheck(this.clients[player]?.setupEvents, dataTable, (matchType == 'contain'));
});

Then('debug GameEvents', function () {
    console.dir(this.game.collectEvents(), { depth: null });
});

Then('debug GameSetupEvents', function (player) {
    console.dir(this.setupEvents, { depth: null });
});

Then('debug ClientEvents for {word}', function (player) {
    console.dir(this.clients[player]?.socket.clientEmitter.collect(), { depth: null });
});

Then('debug ClientSetupEvents for {word}', function (player) {
    console.dir(this.clients[player]?.setupEvents, { depth: null });
});

When('GameEvents are reset', function (player) {
    this.game.clearEvents();
});

When('ClientEvents for {word} are reset', function (player) {
    this.clients[player]?.socket.clientEmitter.clear();
});