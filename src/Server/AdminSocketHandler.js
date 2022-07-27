import { Actions as PlayerTurnActions, CounterActions } from "../Game/Actions.js";

export default class AdminSocketHandler {
    #socket;
    #server;

    constructor(server, socket) {
        this.#server = server;
        this.#socket = socket;

        console.log(`New admin client: ${socket.id}`);
        this.#socket.emit('clientConnected', { socketID: socket.id });

        this.addSocketHandlers();
    }

    doListGames() {
        this.#socket.emit('gamesAvailable', this.#server.getAvailableGames());
        this.#socket.emit('savedGamesAvailable', this.#server.getSavedGames());
    }

    doGetServerConfig() {
        this.#socket.emit('serverConfig', this.#server.appConfig);
    }

    addSocketHandlers() {
        this.#socket.on('allowPublicGames', () => {
            this.#server.appConfig.publicGames = true;
            this.doGetServerConfig();
        });

        this.#socket.on('disallowPublicGames', () => {
            this.#server.appConfig.publicGames = false;
            this.doGetServerConfig();
        });

        this.#socket.on('createGame', (gameId) => {
            try {
                this.#server.createGame(gameId);
                this.doListGames();
                this.#socket.emit('success', { message: 'New game was crated.' });
            } catch (e) {
                this.#socket.emit('error', { error: `New game was not created: ${e.message}` });
            }
        });

        this.#socket.on('getServerConfig', () => {
            this.doGetServerConfig();
        });

        this.#socket.on('listGames', () => {
            this.doListGames();
        });

        this.#socket.on('refreshGame', (gameId) => {
            this.#socket.emit('success', { message: 'Game was refreshed.' });
            this.#server.refreshGame(gameId);
        });

        this.#socket.on('collectGameEvents', (gameId) => {
            var game = this.#server.getGame(gameId);

            if (game != undefined) {
                this.#socket.emit('gameEventsCollected', { game: gameId, events: game.collectEvents() });
                this.#socket.emit('success', { message: 'Game events collected.' });
            } else {
                this.#socket.emit('error', { error: 'Game does not exist.' });
            }
        });

        this.#socket.on('endGame', (gameId, reason) => {
            var game = this.#server.getGame(gameId);

            if (game != undefined) {
                this.#socket.emit('success', { message: 'Game was ended.' });
                game.endGame(reason ? 'Ended by admin: ${reason}' : 'Ended by admin.');
                this.doListGames();
            }
        });

        this.#socket.on('killGame', (gameId, reason) => {
            var game = this.#server.getGame(gameId);

            if (game != undefined) {
                this.#socket.emit('success', { message: 'Game was killed.' });
                game.endGame(reason ? 'Killed by admin: ${reason}' : 'Killed by admin.');
                this.#server.removeGame(gameId);
                this.doListGames();
            }
        });

        this.#socket.on('saveGame', (gameId) => {
            if (this.#server.saveGame(gameId)) {
                this.#socket.emit('success', { message: 'Game was saved.' });
            } else {
                this.#socket.emit('error', { error: 'Error saving game.' });
            }
            this.doListGames();
        });

        this.#socket.on('loadGame', (gameId) => {
            var game = this.#server.getGame(gameId);

            if (game == undefined) {
                if (this.#server.loadGame(gameId)) {
                    this.#socket.emit('success', { message: 'Game was loaded.' });
                } else {
                    this.#socket.emit('error', { error: 'Error loading game.' });
                }
            } else {
                this.#socket.emit('error', { error: 'Game already exists.' });
            }

            this.doListGames();
        });

        this.#socket.on('disconnect', () => {
            this.#server.removeSocket(this.#socket.id);
            console.log(`Client removed: ${this.#socket.id}`);
        });

        this.#socket.on('adminAction', (gameid, playerid, action, target) => {
            var game = this.#server.getGame(gameid);

            if (game != undefined) {
                try {
                    game.doPlayerAction(playerid, action, target);
                } catch (e) {
                    this.#socket.emit('error', { error: e.message });
                }
            }
        });
    }
}
