import { Actions as PlayerTurnActions, CounterActions } from "../Game/Actions.js";

export default class ClientSocketHandler {
    #socket;
    #server;
    #myGames = {};

    #listener = (e) => { this.handleGameEvent(JSON.parse(JSON.stringify(e))); };

    constructor(server, socket) {
        this.#server = server;
        this.#socket = socket;
        console.log(`New client: ${socket.id}`);
        this.#socket.emit('clientConnected', { socketID: socket.id });

        this.addSocketHandlers();
    }

    loadGame(game) {
        for (const event of game.collectEvents()) {
            this.#listener(event);
        }
        this.#socket.emit('gameLoaded', { gameID: game.gameID() });
    }

    addSocketHandlers() {
        this.#socket.on('createGame', (playerName) => {
            var game = this.#server.createGame();

            this.#socket.emit('gameCreated', { game: game.gameID() });
        });

        this.#socket.on('joinGame', (id, playerName) => {
            var game = this.#server.getGame(id);

            if (game != undefined) {
                var playerID = game.addPlayer(playerName);
                this.#socket.emit('gameJoined', { gameID: id, playerID: playerID });
                this.#myGames[id] = { 'playerID': playerID };

                this.loadGame(game);
                game.listen(this.#listener);
            } else {
                this.#socket.emit('commandError', { error: 'Invalid game.' });
            }
        });

        // TODO: There is no security here, anyone could rejoin as anyone else.
        this.#socket.on('rejoinGame', (id, playerID) => {
            var game = this.#server.getGame(id);

            if (game != undefined && game.players()[playerID]) {
                this.#socket.emit('gameJoined', { gameID: id, playerID: playerID });
                this.#myGames[id] = { 'playerID': playerID };

                this.loadGame(game);
                game.listen(this.#listener);
            } else {
                this.#socket.emit('commandError', { error: 'Unable to rejoin game.' });
            }
        });

        this.#socket.on('action', (gameid, action, target) => {
            var game = this.#server.getGame(gameid);

            if (game != undefined && this.#myGames[gameid].playerID != undefined) {
                try {
                    game.doPlayerAction(this.#myGames[gameid].playerID, action, target);
                } catch (e) {
                    this.#socket.emit('actionError', { error: e });
                }
            }
        });

        this.#socket.on('disconnect', () => {
            for (const [gameid, info] of Object.entries(this.#myGames)) {
                var game = this.#server.getGame(gameid);

                if (game != undefined && info.playerID) {
                    // game.removePlayer(info.playerID, 'Socket Disconnected');
                    game.unlisten(this.#listener);
                }
            }

            this.#server.removeSocket(this.#socket.id);
            console.log(`Client removed: ${this.#socket.id}`);
        });

        // TODO: There is no security here, anyone could run any action as any player.
        this.#socket.on('adminAction', (gameid, playerid, action, target) => {
            var game = this.#server.getGame(gameid);

            if (game != undefined) {
                try {
                    game.doPlayerAction(playerid, action, target);
                } catch (e) {
                    this.#socket.emit('adminActionError', { error: e });
                }
            }
        });
    }

    showActions(gameid, actions) {
        var thisGame = this.#myGames[gameid];

        this.#socket.emit('handleGameEvent', {
            '__type': 'showActions',
            'game': gameid,
            'player': thisGame.playerID,
            'date': new Date(),
            'actions': (actions ? actions : {})
        });
    }

    handleGameEvent(event) {
        var thisGame = this.#myGames[event.game];
        var thisGamePlayers = this.#server.getGame(event.game)?.players();

        // Hide Deck from players, and keep track of it ourself to deal with allocateNextInfluence
        if (event.__type == 'setDeck') {
            thisGame['deck'] = event.deck;

            delete event.deck;
        }

        // Modify allocateNextInfluence to actually be useful for the client if it is us
        // or hide it otherwise.
        if (event.__type == 'allocateNextInfluence') {
            var influence = thisGame['deck'].shift();

            event.__type = 'allocateInfluence';

            if (event.player == thisGame.playerID) {
                event.influence = influence;
            } else {
                event.influence = 'UNKNOWN';
            }
        }

        // Hide re-decked influences.
        if (event.__type == 'returnInfluenceToDeck' && event.player != thisGame.playerID) {
            event.influence = 'UNKNOWN';
        }

        // Emit the event.
        this.#socket.emit('handleGameEvent', event);

        // After some events, we help the game client along with showing it actions it has available to it.
        // This way the client is light on logic.

        if (event.__type == 'addPlayer' || event.__type == 'removePlayer' || event.__type == 'playerReady' || event.__type == 'playerNotReady') {
            var pregameActions = {};

            if (thisGamePlayers[thisGame.playerID]) {
                if (thisGamePlayers[thisGame.playerID].ready) {
                    pregameActions['UNREADY'] = { name: "Not Ready" };
                } else {
                    pregameActions['READY'] = { name: "Ready" };
                }

                pregameActions['SETNAME'] = { name: 'Change Name', prompt: 'Enter new name' };

                if (Object.values(thisGamePlayers).filter(p => !p.ready).length > 0) {
                    pregameActions['STARTGAME'] = { name: "Start Game" };
                }
            }

            this.showActions(event.game, pregameActions);
        }

        if (event.__type == 'startGame' || event.__type == 'gameOver') {
            this.showActions(event.game, {});
        }

        if (event.__type == 'beginPlayerTurn') {
            if (event.player == thisGame.playerID) {
                this.showActions(event.game, PlayerTurnActions);
            } else {
                this.showActions(event.game, {});
            }
        }

        if (event.__type == 'challengeablePlayerAction' || event.__type == 'counterablePlayerAction') {
            if (event.player == thisGame.playerID) {
                this.showActions(event.game, {});
            } else {
                var displayActions = { 'CHALLENGE': { name: 'Challenge' }, 'PASS': { name: 'Allow' } };

                if (PlayerTurnActions[event.action].counterActions && (PlayerTurnActions[event.action].anyoneCanCounter || event.target == thisGame.playerID)) {
                    for (const ca of PlayerTurnActions[event.action].counterActions) {
                        displayActions[ca] = {
                            name: CounterActions[ca].name,
                            target: ca,
                            action: 'COUNTER',
                        }
                    }
                }

                this.showActions(event.game, displayActions);
            }
        }

        if (event.__type == 'playerPassed' && event.player == thisGame.playerID) {
            this.showActions(event.game, {});
        }

        if (event.__type == 'playerChallenged') {
            if (event.player == thisGame.playerID) {
                this.showActions(event.game, { 'REVEAL': { name: 'Reveal Influence', options: thisGamePlayers[event.player].influence } });
            } else {
                this.showActions(event.game, {});
            }
        }

        if (event.__type == 'playerCountered') {
            if (event.challenger == thisGame.playerID) {
                this.showActions(event.game, {});
            } else {
                var displayActions = { 'CHALLENGE': { name: 'Challenge' }, 'PASS': { name: 'Allow' } };
                this.showActions(event.game, displayActions);
            }
        }

        if (event.__type == 'playerPassedChallenge' && event.player == thisGame.playerID) {
            this.showActions(event.game, {});
        }

        if (event.__type == 'playerFailedChallenge' && event.player == thisGame.playerID) {
            this.showActions(event.game, {});
        }

        if (event.__type == 'playerMustDiscardInfluence' && event.player == thisGame.playerID) {
            this.showActions(event.game, { 'REVEAL': { name: 'Discard Influence', oneTime: true, options: thisGamePlayers[event.player].influence } });
        }

        if (event.__type == 'playerExchangingCards' && event.player == thisGame.playerID) {
            this.showActions(event.game, { 'EXCHANGE': { name: 'Discard Influence', oneTime: true, options: thisGamePlayers[event.player].influence } });
        }
    }
}
