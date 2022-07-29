import process from 'process';
import { uniqueNamesGenerator, adjectives as adjectiveList, colors as colourList, animals as animalList } from 'unique-names-generator';

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
                var game = this.#server.createGame(gameId);
                this.doListGames();
                this.#socket.emit('success', { message: `New game was created: ${game.gameID()}` });
            } catch (e) {
                this.#socket.emit('error', { error: `New game was not created: ${e.message}` });
            }
        });

        this.#socket.on('createTestGame', (gameId, playerCount) => {
            try {
                playerCount = parseInt(playerCount);
                if (playerCount == undefined) { playerCount = 3; }
                var players = [];
                const nameConfig = { dictionaries: [[...adjectiveList, ...colourList], animalList], length: 2, separator: '', style: 'capital' };
                for (var i = 0; i < playerCount; i++) {
                    players.push(uniqueNamesGenerator(nameConfig));
                }

                var game = this.#server.createTestGame(gameId, players);
                this.doListGames();
                this.#socket.emit('success', { message: `New game was created: ${game.gameID()}` });
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
            this.#socket.emit('success', { message: `${gameId} was refreshed.` });
            this.#server.refreshGame(gameId);
        });

        const doAllAction = (action, callback, savedGames) => {
            var success = [];
            var failed = [];

            for (const gameId in (savedGames ? this.#server.getSavedGames() : this.#server.getAvailableGames())) {
                console.log(`${action} on ${gameId}`);

                try {
                    if (!callback(gameId)) {
                        throw new Error('Error in callback');
                    };
                    success.push(gameId);
                } catch (e) {
                    console.log(`E: ${e}`);
                    failed.push(gameId);
                }
            }

            if (success.length > 0) { this.#socket.emit('success', { message: `${action} success: ${JSON.stringify(success)}` }); }
            if (failed.length > 0) { this.#socket.emit('error', { error: `${action} failed: ${JSON.stringify(failed)}` }); }

            this.doListGames();
        }

        const requireValidGame = (gameId, callback) => {
            var game = this.#server.getGame(gameId);

            if (game != undefined) {
                callback(game);
            } else {
                this.#socket.emit('error', { error: `${gameId} does not exist.` });
            }
        }

        this.#socket.on('collectGameEvents', (gameId) => {
            requireValidGame(gameId, (game) => {
                this.#socket.emit('gameEventsCollected', { game: gameId, events: game.collectEvents() });
                this.#socket.emit('success', { message: `${gameId} events collected.` });
            });
        });

        this.#socket.on('sendAdminMessage', (gameId, message) => {
            requireValidGame(gameId, (game) => {
                this.#socket.emit('success', { message: `Message was sent to: ${gameId}` });
                game.adminMessage(message);
            });
        });

        this.#socket.on('endGame', (gameId, reason) => {
            requireValidGame(gameId, (game) => {
                this.#socket.emit('success', { message: `${gameId} was ended.` });
                game.endGame(reason ? `Ended by admin: ${reason}` : 'Ended by admin.');
                this.doListGames();
            });
        });

        this.#socket.on('killGame', (gameId, reason) => {
            requireValidGame(gameId, (game) => {
                this.#socket.emit('success', { message: `${gameId} was killed.` });
                game.endGame(reason ? `Killed by admin: ${reason}` : 'Killed by admin.');
                this.#server.removeGame(gameId);
                this.doListGames();
            });
        });

        this.#socket.on('saveGame', (gameId) => {
            if (this.#server.saveGame(gameId)) {
                this.#socket.emit('success', { message: `${gameId} was saved.` });
            } else {
                this.#socket.emit('error', { error: `Error saving ${gameId}.` });
            }
            this.doListGames();
        });

        this.#socket.on('removeSavedGame', (gameId) => {
            if (this.#server.removeSaveGame(gameId)) {
                this.#socket.emit('success', { message: `${gameId} was removed.` });
            } else {
                this.#socket.emit('error', { error: `Error removing ${gameId}.` });
            }
            this.doListGames();
        });

        this.#socket.on('loadGame', (gameId) => {
            var game = this.#server.getGame(gameId);

            if (game == undefined) {
                if (this.#server.loadGame(gameId)) {
                    this.#socket.emit('success', { message: `${gameId} was loaded.` });
                } else {
                    this.#socket.emit('error', { error: `Error loading ${gameId}.` });
                }
            } else {
                this.#socket.emit('error', { error: `${gameId} already exists.` });
            }

            this.doListGames();
        });

        this.#socket.on('saveAllGames', () => {
            doAllAction('saveAllGames', gameId => this.#server.saveGame(gameId));
        });

        this.#socket.on('loadAllGames', () => {
            doAllAction('loadAllGames', gameId => this.#server.loadGame(gameId), true);
        });

        this.#socket.on('killAllGames', (reason) => {
            doAllAction('killAllGames', gameId => {
                var game = this.#server.getGame(gameId);
                game.endGame(reason ? `Killed by admin: ${reason}` : 'Killed by admin.');
                this.#server.removeGame(gameId);
                return true;
            });
        });

        this.#socket.on('refreshAllGames', () => {
            doAllAction('refreshAllGames', gameId => this.#server.refreshGame(gameId));
        });

        this.#socket.on('killServer', () => {
            this.#socket.emit('success', { message: 'Server is exiting.' });
            process.exit(0);
        });

        this.#socket.on('disconnect', () => {
            this.#server.removeSocket(this.#socket.id);
            console.log(`Client removed: ${this.#socket.id}`);
        });

        this.#socket.on('adminAction', (gameid, playerid, action, target) => {
            requireValidGame(gameId, (game) => {
                try {
                    game.doPlayerAction(playerid, action, target);
                } catch (e) {
                    this.#socket.emit('error', { error: e.message });
                }
            });
        });

        this.#socket.on('adminEmitEvent', (gameid, event) => {
            requireValidGame(gameId, (game) => {
                try {
                    // Weird use of hydrate, but should work.
                    game.hydrate([event]);
                    this.#socket.emit('success', { message: `Event emited to ${gameid}.` });
                } catch (e) {
                    this.#socket.emit('error', { error: e.message });
                }
            });
        });
    }
}
