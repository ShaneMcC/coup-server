import process from 'process';
import { uniqueNamesGenerator, adjectives as adjectiveList, colors as colourList, animals as animalList } from 'unique-names-generator';
import Game from '../Game/Game.js';

export default class AdminSocketHandler {
    #socket;
    #server;

    constructor(server, socket) {
        this.#server = server;
        this.#socket = socket;

        if (!this.#server.appConfig.silent) {
            console.log(`New admin client: ${socket.id}`);
        }
        this.#socket.emit('clientConnected', { socketID: socket.id, 'type': 'admin', 'serverVersion': this.#server.appConfig.buildConfig.gitVersion });

        this.addSocketHandlers();
    }

    doListGames() {
        const sortedObject = (obj) => Object.keys(obj).sort().reduce((acc, c) => { acc[c] = obj[c]; return acc }, {});

        this.#socket.emit('gamesAvailable', sortedObject(this.#server.getAvailableGames()));
        this.#socket.emit('savedGamesAvailable', sortedObject(this.#server.getSavedGames()));
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

        this.#socket.on('getGameInfo', (gameID) => {
            const games = this.#server.getAvailableGames();
            if (games[gameID]) {
                const event = {};
                event[gameID] = games[gameID];
                this.#socket.emit('gameInfo', event);
            }
        });

        this.#socket.on('listGames', () => {
            this.doListGames();
        });

        this.#socket.on('cleanup', (type) => {
            var gameIDs = {};

            switch (type) {
                case 'unused':
                    gameIDs['unused'] = this.#server.cleanupUnused();
                    break;

                case 'finished':
                    gameIDs['finished'] = this.#server.cleanupFinished();
                    break;

                case 'stalled':
                    gameIDs['stalled'] = this.#server.cleanupStalled();
                    break;

                default:
                    gameIDs = this.#server.cleanup();
                    break;
            }

            var anyGames = false;

            if (gameIDs['unused']?.length > 0) {
                this.#socket.emit('success', { message: `Cleanup unused: ${JSON.stringify(gameIDs['unused'])}` });
                anyGames = true;
            }

            if (gameIDs['finished']?.length > 0) {
                this.#socket.emit('success', { message: `Cleanup finished: ${JSON.stringify(gameIDs['finished'])}` });
                anyGames = true;
            }

            if (gameIDs['stalled']?.length > 0) {
                this.#socket.emit('success', { message: `Cleanup stalled: ${JSON.stringify(gameIDs['stalled'])}` });
                anyGames = true;
            }

            if (!anyGames) {
                this.#socket.emit('error', { error: `Cleanup removed no games.` });
            }

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
                try {
                    if (!callback(gameId)) {
                        throw new Error('Error in callback');
                    };
                    success.push(gameId);
                } catch (e) {
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

        this.#socket.on('sendGlobalAdminMessage', (message) => {
            doAllAction('sendGlobalAdminMessage', gameId => {
                this.#server.getGame(gameId).adminMessage(message);
                return true;
            });
        });

        this.#socket.on('killServer', () => {
            this.#socket.emit('success', { message: 'Server is exiting.' });
            process.exit(0);
        });

        this.#socket.on('disconnect', () => {
            this.#server.removeSocket(this.#socket.id);
            if (!this.#server.appConfig.silent) {
                console.log(`Client removed: ${this.#socket.id}`);
            }
        });

        this.#socket.on('adminAction', (gameid, playerid, action, target) => {
            requireValidGame(gameid, (game) => {
                try {
                    game.doPlayerAction(playerid, action, target);
                } catch (e) {
                    this.#socket.emit('error', { error: e.message });
                }
            });
        });

        this.#socket.on('nextPlayerTurn', (gameId) => {
            requireValidGame(gameId, (game) => {
                game.serverMessage('Admin advanced play to next player.');
                game.startNextTurn();
                
                this.doListGames();
            });
        });

        this.#socket.on('removePlayer', (gameId, playerid) => {
            requireValidGame(gameId, (game) => {
                if (!game.ended && game.players()[playerid]) {
                    const player = game.players()[playerid];

                    if (game.started) {
                        game.serverMessage(`Admin removed player: ${player.name}`);
                        for (const influence of player.influence) {
                            game.emit('discardInfluence', { 'player': player.id, 'influence': influence });
                        }
                        game.emit('playerOutOfInfluence', { 'player': player.id });

                        // If player was current player, advance to next player.
                        // If there is only now 1 remaining valid player, declare them the winner.
                        if (game.currentPlayerID() == player.id || game.validPlayers() == 1) {
                            game.startNextTurn();
                        }
                    } else {
                        game.removePlayer(playerid, 'Removed by admin.');
                    }
                }
                
                this.doListGames();
            });
        });


        this.#socket.on('startPlayerTurn', (gameId, playerid) => {
            requireValidGame(gameId, (game) => {
                if (game.players()[playerid]) {
                    game.serverMessage('Admin advanced play to specific player.');
                    game.emit('beginPlayerTurn', { 'player': playerid });
                }
                
                this.doListGames();
            });
        });

        this.#socket.on('removePlayerCoins', (gameId, playerid, coins) => {
            requireValidGame(gameId, (game) => {
                if (game.players()[playerid]) {
                    game.serverMessage('Admin removed coins from player.');
                    game.emit('playerLostCoins', { player: playerid, coins: coins });
                }
            });
        });

        this.#socket.on('givePlayerCoins', (gameId, playerid, coins) => {
            requireValidGame(gameId, (game) => {
                if (game.players()[playerid]) {
                    game.serverMessage('Admin gave coins to player.');
                    game.emit('playerGainedCoins', { player: playerid, coins: coins });
                }
            });
        });

        this.#socket.on('reloadGame', (gameId) => {
            requireValidGame(gameId, (_game) => {
                this.#server.removeGame(gameId, true);
                this.#server.loadGame(gameId);
                this.#server.refreshGame(gameId);
            });
        });

        this.#socket.on('rollbackEvents', (gameId, eventCount = 1) => {
            requireValidGame(gameId, (game) => {
                const events = game.collectEvents();
                for (var i = 0; i < eventCount; i++) {
                    if (events.length > 2) { // Don't rollback beyond the first event.
                        events.pop();
                    }
                }

                var newGame = new Game();
                newGame.hydrate(events);

                this.#server.replaceGame(newGame);
                this.#server.refreshGame(gameId);
            });
        });

        this.#socket.on('rollbackUntil', (gameId, until) => {
            requireValidGame(gameId, (game) => {
                const events = game.collectEvents();

                var newGame = new Game();
                newGame.hydrate(events, until);

                this.#server.replaceGame(newGame);
                this.#server.refreshGame(gameId);
            });
        });

        this.#socket.on('adminEmitEvent', (gameid, event) => {
            requireValidGame(gameid, (game) => {
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
