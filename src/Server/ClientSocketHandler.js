import { Actions as PlayerTurnActions, CounterActions } from "../Game/Actions.js";
import Crypto from 'crypto';

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
            'playerMasks': {},
            'gameLoaded': false,
            'lastActions': {},
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
                }
            } else {
                this.#socket.emit('commandError', { error: 'Invalid game.' });
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
                }
            } else {
                this.#socket.emit('commandError', { error: 'Invalid game.' });
            }
        });

        this.#socket.on('action', (gameid, action, target) => {
            var game = this.#server.getGame(gameid);

            if (game != undefined && this.#myGames[gameid].playerID != undefined) {
                try {
                    var thisGame = this.#myGames[gameid];
                    var targetPlayerMask = target;
                    for (const [id, p] of Object.entries(thisGame.playerMasks)) {
                        if (p == target) { targetPlayerMask = id; break; }
                    }

                    game.doPlayerAction(this.#myGames[gameid].playerID, action, targetPlayerMask);
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
        var myPlayerMask = thisGame.playerMasks[thisGame.playerID] ? thisGame.playerMasks[thisGame.playerID] : thisGame.playerID;
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
        var myPlayerMask = thisGame.playerMasks[thisGame.playerID] ? thisGame.playerMasks[thisGame.playerID] : thisGame.playerID;

        // Mask player IDs to stop people being able to reconnect as someone else easily.
        if (event.__type == 'addPlayer') {
            if (event.id == thisGame.playerID) { event.self = true; }

            // Generate a unique mask for this player.
            var newMask = '';
            do {
                newMask = 'Player-Mask-' + Crypto.randomUUID();
            } while (Object.values(thisGame.playerMasks).indexOf(newMask) > -1);

            thisGame.playerMasks[event.id] = newMask;
            event.id = thisGame.playerMasks[event.id];
        }
        // Replace player IDs with masked IDs.
        if (event.player && thisGame.playerMasks[event.player]) {
            event.player = thisGame.playerMasks[event.player];
        }
        if (event.target && thisGame.playerMasks[event.target]) {
            event.target = thisGame.playerMasks[event.target];
        }
        if (event.challenger && thisGame.playerMasks[event.challenger]) {
            event.challenger = thisGame.playerMasks[event.challenger];
        }
        if (event.kickedBy && thisGame.playerMasks[event.kickedBy]) {
            event.kickedBy = thisGame.playerMasks[event.kickedBy];
        }
        if (event.winner && thisGame.playerMasks[event.winner]) {
            event.winner = thisGame.playerMasks[event.winner];
        }
        if (event.__type == 'removePlayer' && thisGame.playerMasks[event.id]) {
            event.id = thisGame.playerMasks[event.id];
            delete thisGame.playerMasks[event.id];
        }

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

        if (event.__type == 'startGame' || event.__type == 'gameOver' || event.__type == 'gameEnded') {
            this.showActions(event.game, {});
        }

        if (event.__type == 'beginPlayerTurn') {
            if (event.player == myPlayerMask) {
                this.showActions(event.game, PlayerTurnActions);
            } else {
                this.showActions(event.game, {});
            }
        }

        if (event.__type == 'challengeablePlayerAction' || event.__type == 'counterablePlayerAction') {
            if (event.player == myPlayerMask) {
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
