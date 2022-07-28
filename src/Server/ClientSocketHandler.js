import { Actions as PlayerTurnActions, CounterActions } from "../Game/Actions.js";
import Crypto from 'crypto';
import GameMasker from "./GameMasker.js";

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
        this.#socket.emit('gameCreationEnabled', { value: this.#server.appConfig.publicGames });

        this.addSocketHandlers();
    }

    loadGame(game) {
        this.#myGames[game.gameID()].gameLoaded = false;
        for (const event of game.collectEvents()) {
            this.#listener(event);
        }
        this.#socket.emit('gameLoaded', { gameID: game.gameID() });
        this.#myGames[game.gameID()].gameLoaded = true;
        this.showActions(game.gameID(), this.#myGames[game.gameID()].lastActions);
    }

    addKnownGame(gameID, playerID) {
        this.#myGames[gameID] = {
            'playerID': playerID,
            'gameLoaded': false,
            'lastActions': {},
            'masker': new GameMasker(this.#server, gameID, playerID),
        };
    }

    addSocketHandlers() {
        this.#socket.on('createGame', () => {
            if (this.#server.appConfig.publicGames) {
                var game = this.#server.createGame();

                this.#socket.emit('gameCreated', { game: game.gameID() });
            } else {
                this.#socket.emit('error', { error: 'Game creation is disabled.' });
            }
        });

        this.#socket.on('checkGame', (id) => {
            var game = this.#server.getGame(id);

            if (game != undefined) {
                var joinable = !game.started;
                this.#socket.emit('gameExists', { game: id, joinable: joinable });
            } else {
                this.#socket.emit('gameDoesNotExist', { game: id });
            }
        });

        this.#socket.on('joinGame', (id, playerName) => {
            var game = this.#server.getGame(id);

            if (game != undefined) {
                var playerID = game.addPlayer(playerName);
                if (playerID) {
                    this.addKnownGame(id, playerID);
                    this.#socket.emit('gameJoined', { gameID: id, playerID: playerID });

                    this.loadGame(game);
                    game.listen(this.#listener);
                } else {
                    this.#socket.emit('commandError', { error: 'Unable to join game.' });
                    this.#socket.emit('joinFailed', { gameID: id });
                }
            } else {
                this.#socket.emit('commandError', { error: 'Invalid game.' });
                this.#socket.emit('joinFailed', { gameID: id });
            }
        });

        this.#socket.on('spectateGame', (id) => {
            var game = this.#server.getGame(id);

            if (game != undefined) {
                this.addKnownGame(id, undefined);
                this.#socket.emit('gameJoined', { gameID: id });

                this.loadGame(game);
                game.listen(this.#listener);
            } else {
                this.#socket.emit('commandError', { error: 'Invalid game.' });
                this.#socket.emit('spectateFailed', { gameID: id });
            }
        });

        // TODO: There is no security here, anyone can rejoin as anyone else if they know their player ID
        //       which they will do from looking at the game events...
        this.#socket.on('rejoinGame', (id, playerID) => {
            var game = this.#server.getGame(id);

            if (game != undefined) {
                if (game.players()[playerID]) {
                    this.addKnownGame(id, playerID);
                    this.#socket.emit('gameJoined', { gameID: id, playerID: playerID });

                    this.loadGame(game);
                    game.listen(this.#listener);
                } else {
                    this.#socket.emit('commandError', { error: 'Player id is not known in game.' });
                    this.#socket.emit('rejoinFailed', { gameID: id, playerID: playerID });
                }
            } else {
                this.#socket.emit('commandError', { error: 'Invalid game.' });
            }
        });

        this.#socket.on('action', (gameid, action, target) => {
            var game = this.#server.getGame(gameid);

            if (game != undefined && this.#myGames[gameid].playerID != undefined) {
                try {
                    var target = thisGame.masker.getUnmaskedPlayerID(target);

                    game.doPlayerAction(this.#myGames[gameid].playerID, action, target);
                } catch (e) {
                    this.#socket.emit('actionError', { error: e.message });
                }
            }
        });

        this.#socket.on('disconnect', () => {
            for (const [gameid, info] of Object.entries(this.#myGames)) {
                var game = this.#server.getGame(gameid);

                if (game != undefined && info.playerID) {
                    game.unlisten(this.#listener);
                }
            }

            this.#server.removeSocket(this.#socket.id);
            console.log(`Client removed: ${this.#socket.id}`);
        });
    }

    gameRemoved(gameid) {
        if (this.#myGames[gameid]) {
            this.#socket.emit('gameRemoved', {
                'game': gameid,
                'date': new Date(),
            });

            delete this.#myGames[gameid];
        }
    }

    refreshGame(gameid) {
        if (this.#myGames[gameid]) {
            this.#socket.emit('refreshGame', {
                'game': gameid,
                'date': new Date(),
            });
        }
    }

    showActions(gameid, actions) {
        var thisGame = this.#myGames[gameid];
        var myPlayerMask = thisGame.masker.getMaskedPlayerID(thisGame.playerID);
        thisGame.lastActions = actions;

        // Only actually show actions once the game has loaded.
        // Saves us sending generated-events that we don't need to.
        if (thisGame.gameLoaded) {
            this.#socket.emit('handleGameEvent', {
                '__type': 'showActions',
                'game': gameid,
                'player': myPlayerMask,
                'date': new Date(),
                'actions': (actions ? actions : {})
            });
        }
    }

    handleGameEvent(event) {
        var thisGame = this.#myGames[event.game];
        var thisGamePlayers = this.#server.getGame(event.game)?.players();
        var myPlayerMask = thisGame.masker.getMaskedPlayerID(thisGame.playerID);

        thisGame.masker.maskEvent(event);

        // Hide Deck from players, and keep track of it ourself to deal with allocateNextInfluence
        if (event.__type == 'setDeck') {
            thisGame['deck'] = event.deck;

            event.deck = Array(event.deck.length - 1).fill("UNKNOWN");
        }

        // Modify allocateNextInfluence to actually be useful for the client if it is us
        // or hide it otherwise.
        if (event.__type == 'allocateNextInfluence') {
            var influence = thisGame['deck'].shift();

            event.__type = 'allocateInfluence';

            if (event.player == myPlayerMask) {
                event.influence = influence;
            } else {
                event.influence = 'UNKNOWN';
            }
        }

        // Hide re-decked influences.
        if (event.__type == 'returnInfluenceToDeck' && event.player != myPlayerMask) {
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

                if (Object.values(thisGamePlayers).filter(p => !p.ready).length == 0) {
                    pregameActions['STARTGAME'] = { name: "Start Game" };
                }
            }

            this.showActions(event.game, pregameActions);
        }

        if (event.__type == 'startGame') {
            this.showActions(event.game, {});
        }

        if (event.__type == 'gameOver' || event.__type == 'gameEnded') {
            this.showActions(event.game, {});

            // Reveal all player influences that we hid earlier.
            for (const [pid, player] of Object.entries(thisGamePlayers)) {
                this.#socket.emit('handleGameEvent', {
                    '__type': 'showPlayerInfluence',
                    'game': event.game,
                    'player': thisGame.masker.getMaskedPlayerID(pid),
                    'date': event.date,
                    'influence': player.influence
                });
            }
            
            // And the deck.
            this.#socket.emit('handleGameEvent', {
                '__type': 'setDeck',
                'game': event.game,
                'date': event.date,
                'deck': thisGame['deck'],
            });
        }

        if (event.__type == 'beginPlayerTurn') {
            if (event.player == myPlayerMask) {
                this.showActions(event.game, PlayerTurnActions);
            } else {
                this.showActions(event.game, {});
            }
        }

        if (event.__type == 'challengeablePlayerAction' || event.__type == 'counterablePlayerAction') {
            if (event.player == myPlayerMask || (thisGamePlayers[thisGame.playerID] && thisGamePlayers[thisGame.playerID].influence.length == 0)) {
                this.showActions(event.game, {});
            } else {
                var displayActions = { 'CHALLENGE': { name: 'Challenge' }, 'PASS': { name: 'Allow' } };

                if (PlayerTurnActions[event.action].counterActions && (PlayerTurnActions[event.action].anyoneCanCounter || event.target == myPlayerMask)) {
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

        if (event.__type == 'playerPassed' && event.player == myPlayerMask) {
            this.showActions(event.game, {});
        }

        if (event.__type == 'playerChallenged') {
            if (event.player == myPlayerMask) {
                this.showActions(event.game, { 'REVEAL': { name: 'Reveal Influence', options: thisGamePlayers[thisGame.playerID].influence } });
            } else {
                this.showActions(event.game, {});
            }
        }

        if (event.__type == 'playerCountered') {
            if (event.challenger == myPlayerMask) {
                this.showActions(event.game, {});
            } else {
                var displayActions = { 'CHALLENGE': { name: 'Challenge' }, 'PASS': { name: 'Allow' } };
                this.showActions(event.game, displayActions);
            }
        }

        if (event.__type == 'playerMustDiscardInfluence' && event.player != myPlayerMask) {
            this.showActions(event.game, {});
        }

        if (event.__type == 'playerPerformedAction' && event.player == myPlayerMask) {
            this.showActions(event.game, {});
        }

        if (event.__type == 'playerPassedChallenge' && event.player == myPlayerMask) {
            this.showActions(event.game, {});
        }

        if (event.__type == 'playerFailedChallenge' && event.player == myPlayerMask) {
            this.showActions(event.game, {});
        }

        if (event.__type == 'playerMustDiscardInfluence' && event.player == myPlayerMask) {
            this.showActions(event.game, { 'REVEAL': { name: 'Discard Influence', oneTime: true, options: thisGamePlayers[thisGame.playerID].influence } });
        }

        if (event.__type == 'playerExchangingCards' && event.player == myPlayerMask) {
            this.showActions(event.game, { 'EXCHANGE': { name: 'Discard Influence', oneTime: true, options: thisGamePlayers[thisGame.playerID].influence } });
        }
    }
}
