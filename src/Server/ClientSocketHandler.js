import GameMasker from "./ClientMiddleware/GameMasker.js";
import ActionProvider from "./ClientMiddleware/ActionProvider.js";
import ActionNamer from "./ClientMiddleware/ActionNamer.js";

export default class ClientSocketHandler {
    #socket;
    #server;
    #myGames = {};

    #listener = (e) => { this.handleGameEvent(JSON.parse(JSON.stringify(e))); };

    constructor(server, socket) {
        this.#server = server;
        this.#socket = socket;

        if (!this.#server.appConfig.silent) {
            console.log(`New client: ${socket.id}`);
        }
        this.#socket.emit('clientConnected', { socketID: this.#socket.id, 'type': 'client', 'serverVersion': this.#server.appConfig.buildConfig.gitVersion });
        this.#socket.emit('gameCreationEnabled', { value: this.#server.appConfig.publicGames });

        this.addSocketHandlers();
    }

    loadGame(game) {
        for (const middleware of Object.values(this.#myGames[game.gameID()].middleware)) {
            middleware.preLoadGame();
        }
        
        for (const event of game.collectEvents()) {
            this.#listener(event);
        }
        this.#socket.emit('gameLoaded', { gameID: game.gameID() });
        
        for (const middleware of Object.values(this.#myGames[game.gameID()].middleware)) {
            middleware.postLoadGame();
        }
    }

    addKnownGame(gameID, playerID) {
        this.#myGames[gameID] = {
            'playerID': playerID,
            'middleware': {
                'masker': new GameMasker(this.#server, this, gameID, playerID),
                'actionProvider': new ActionProvider(this.#server, this, gameID, playerID),
                'actionNamer': new ActionNamer(this.#server, this, gameID, playerID),
            },
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
            var game = this.#server.getOrLoadGame(id);

            if (game != undefined) {
                var joinable = !game.started;
                this.#socket.emit('gameExists', { game: id, joinable: joinable });
            } else {
                this.#socket.emit('gameDoesNotExist', { game: id });
            }
        });

        this.#socket.on('joinGame', (id, playerName) => {
            var game = this.#server.getOrLoadGame(id);

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
            var game = this.#server.getOrLoadGame(id);

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
            var game = this.#server.getOrLoadGame(id);

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

        this.#socket.on('exitGame', (id) => {
            var game = this.#server.getGame(id);

            if (game != undefined) {
                delete this.#myGames[id];
                this.#socket.emit('gameExited', { gameID: id });
                game.unlisten(this.#listener);
            } else {
                this.#socket.emit('commandError', { error: 'Invalid game.' });
                this.#socket.emit('exitFailed', { gameID: id });
            }
        });

        this.#socket.on('action', (gameid, action, target) => {
            var game = this.#server.getGame(gameid);

            if (game != undefined && this.#myGames[gameid].playerID != undefined) {
                try {
                    for (const middleware of Object.values(this.#myGames[gameid].middleware)) {
                        [action, target] = middleware.getActionTarget(action, target);
                    }

                    game.doPlayerAction(this.#myGames[gameid].playerID, action, target);
                    this.#socket.emit('actionSuccess');
                } catch (e) {
                    this.#socket.emit('actionError', { error: e.message });
                    if (!this.#server.appConfig.silent) {
                        console.log('Action Error: ', [gameid, this.#myGames[gameid].playerID, action, target], e);
                    }
                }
            }
        });

        this.#socket.on('getNextGame', (gameid) => {
            var game = this.#server.getGame(gameid);

            if (game != undefined) {
                var newGame = game.nextGameID();
                if (newGame == undefined) {
                    if (this.#server.appConfig.publicGames) {
                        var newGame = this.#server.createGame().gameID();
                        game.nextGameAvailable(newGame);
                    } else {
                        this.#socket.emit('error', { error: 'Game creation is disabled.' });
                        return
                    }
                }

                this.#socket.emit('foundNextGame', { nextGameID: newGame });
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
            if (!this.#server.appConfig.silent) {
                console.log(`Client removed: ${this.#socket.id}`);
            }
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

    emitEvent(type, ...args) {
        this.#socket.emit(type, ...args);
    }

    handleGameEvent(event) {
        var thisGame = this.#myGames[event.game];

        for (const middleware of Object.values(thisGame.middleware)) {
            middleware.preEmitHandler(event);
        }

        // Emit the event.
        this.#socket.emit('handleGameEvent', event);

        for (const middleware of Object.values(thisGame.middleware)) {
            middleware.postEmitHandler(event);
        }
    }
}
