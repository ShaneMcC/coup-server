import Express from "express";
import http from "http";
import cors from "cors";
import fs from "fs";
import Game from "../Game/Game.js";
import { Server as IOServer } from "socket.io";
import ClientSocketHandler from "./ClientSocketHandler.js";
import AdminSocketHandler from "./AdminSocketHandler.js";

import { uniqueNamesGenerator, adjectives as adjectiveList, colors as colourList, animals as animalList } from 'unique-names-generator';
import NewGameState from "../Game/GameStates/NewGameState.js";
import GameOverState from "../Game/GameStates/GameOverState.js";

import sanitize from "sanitize-filename";

export default class GameServer {
    appConfig;

    #app;
    #server;
    #io;

    #games = {};
    #sockets = {};

    constructor(appConfig) {
        this.appConfig = appConfig;

        this.#app = new Express();
        this.#app.use(new cors());

        this.#server = http.createServer(this.#app);
        this.#io = new IOServer(this.#server, { cors: { origin: '*' } });

        this.#io.of('/gameServer').on("connection", (socket) => {
            this.#sockets[socket.id] = { handler: new ClientSocketHandler(this, socket, appConfig), type: 'client' };
        });

        if (appConfig.adminAuthToken && appConfig.adminAuthToken.length > 0) {
            console.log(`Using admin auth token: ${appConfig.adminAuthToken}`)

            this.#io.of('/admin').use((socket, next) => {
                const authToken = socket.handshake.auth?.token;

                if (authToken != appConfig.adminAuthToken) {
                    next(new Error("Invalid auth token provided."));
                }

                next();
            }).on("connection", (socket) => {
                this.#sockets[socket.id] = { handler: new AdminSocketHandler(this, socket, appConfig), type: 'admin' };
            });
        }

        setInterval(() => { this.serverTick() }, 60 * 1000);
        setInterval(() => { this.hourly() }, 60 * 60 * 1000);
    }

    serverTick() {
        // Do Nothing 
    }

    hourly() {
        console.log(`Hourly Cleanup: ${JSON.stringify(this.cleanup())}`);
    }

    #prepareNewGame(gameid) {
        var game = new Game();
        game.debug = this.appConfig.debugGames;

        if (gameid == undefined || gameid == null || gameid.length == 0) {
            do {
                gameid = uniqueNamesGenerator({ dictionaries: [adjectiveList, colourList, animalList], length: 3, separator: '-', style: 'lowercase' });
            } while (this.#games[gameid]);
        } else {
            if (this.#games[gameid]) {
                throw new Error('game id already exists');
            }
        }

        return [game, sanitize(gameid)];
    }

    #addToGamesDict(game) {
        this.#games[game.gameID()] = { 'game': game, 'created': new Date() };
    }

    replaceGame(game) {
        const oldGame = this.#games[game.gameID()]['game'];
        oldGame.unlistenAll();

        this.#games[game.gameID()]['game'] = game;

    }

    createGame(gameid) {
        var [game, gameid] = this.#prepareNewGame(gameid);

        game.createGame(gameid);
        this.#addToGamesDict(game);

        return game;
    }

    createTestGame(gameID, players) {
        try {
            var testGame = this.createGame(gameID);

            for (const player of players) {
                testGame.emit('addPlayer', { 'id': player, 'name': player });
                testGame.doPlayerAction(player, 'READY');
            }

            testGame.doPlayerAction(players[0], 'STARTGAME');

            // Specifically start with the first player not random.
            testGame.emit('beginPlayerTurn', { 'player': Object.keys(testGame.players())[0] });

            for (const player of players) {
                testGame.doPlayerAction(player, 'INCOME');
            }

            return testGame;
        } catch (e) {
            this.removeGame(gameID);
            throw e;
        }
    }

    getGame(gameID) {
        return this.#games[gameID]?.game;
    }

    getOrLoadGame(gameID) {
        if (!this.#games[gameID]) {
            this.loadGame(gameID);
        }

        return this.getGame(gameID);
    }

    refreshGame(gameID) {
        if (this.#games[gameID]) {
            for (const socket of Object.values(this.#sockets).filter(s => s.type == 'client')) {
                socket.handler.refreshGame(gameID);
            }
            return true;
        }
        return false;
    }

    removeGame(gameID, silent = false) {
        if (this.#games[gameID]) {
            var game = this.#games[gameID].game;
            delete this.#games[gameID];
            game.unlistenAll();

            if (!silent) {
                for (const socket of Object.values(this.#sockets).filter(s => s.type == 'client')) {
                    socket.handler.gameRemoved(gameID);
                }
            }

            return true;
        }
        return false;
    }

    savedGameExists(gameID) {
        if (gameID == null || gameID == undefined) { return false; }

        if (fs.existsSync(this.appConfig.saveLocation)) {
            var gameFile = this.appConfig.saveLocation + '/' + sanitize(gameID) + '.json';

            return fs.existsSync(gameFile);
        }

        return false;
    }

    removeSaveGame(gameID) {
        if (gameID == null || gameID == undefined) { return false; }

        if (fs.existsSync(this.appConfig.saveLocation)) {
            var gameFile = this.appConfig.saveLocation + '/' + sanitize(gameID) + '.json';
            fs.unlinkSync(gameFile);
            return true;
        }

        return false;
    }

    saveGame(gameID) {
        if (gameID == null || gameID == undefined) { return false; }

        if (this.#games[gameID]) {
            var events = this.#games[gameID].game.collectEvents();

            if (fs.existsSync(this.appConfig.saveLocation)) {
                fs.writeFileSync(this.appConfig.saveLocation + '/' + sanitize(gameID) + '.json', JSON.stringify(events, null, 2));

                return true;
            }
        }

        return false;
    }

    loadGame(gameID) {
        if (gameID == null || gameID == undefined) { return false; }

        if (fs.existsSync(this.appConfig.saveLocation)) {
            var gameFile = this.appConfig.saveLocation + '/' + sanitize(gameID) + '.json';

            if (!this.#games[gameID] && fs.existsSync(gameFile)) {
                try {
                    var events = JSON.parse(fs.readFileSync(gameFile));
                } catch (e) {
                    console.log(`There was an error parsing game json for ${gameID}: `, e);
                    return false;
                }

                if (events.length > 0) {
                    try {
                        var [game, _] = this.#prepareNewGame(gameID);

                        if (events[0].__type == 'gameCreated') {
                            // Ensure this game is created with the correct ID internally.
                            var createGame = events.splice(0, 1)[0];
                            createGame.game = gameID;
                            game.hydrate([createGame]);

                            // Hydrate with the rest of the events.
                            game.hydrate(events);
                            this.#addToGamesDict(game);

                            return true;
                        }
                    } catch (e) {
                        console.log(`There was an error loading game json for ${gameID}: `, e);
                        return false;
                    }
                }
            }
        }

        return false;
    }

    getGameIDs() {
        return Object.keys(this.#games);
    }

    getAvailableGames() {
        const games = {};
        for (const [gameID, gameMeta] of Object.entries(this.#games)) {
            var gameInfo = {
                game: gameMeta.game.gameID(),
                serverCreated: gameMeta.created,
                created: gameMeta.game.createdAt,
                started: gameMeta.game.started,
                ended: gameMeta.game.ended,
                lastEventAt: gameMeta.game.lastEventAt,
                stalled: gameMeta.game.lastEventAt < new Date(Date.now() - (86400 * 1000)),
                state: gameMeta.game.state.toString(),
                stateName: gameMeta.game.state.constructor.name,
                players: gameMeta.game.players(),
            }

            games[gameID] = gameInfo;
        }

        return games;
    }

    getSavedGames() {
        const files = {};
        if (fs.existsSync(this.appConfig.saveLocation)) {
            for (const file of fs.readdirSync(this.appConfig.saveLocation)) {
                var filename = file.replace(/\.json$/, '');
                // TODO: Perhaps we should check this.
                files[filename] = { game: filename };
            }
        }
        return files;
    }

    removeSocket(socketID) {
        delete this.#sockets[socketID];
    }

    cleanup() {
        const cleanup = {};

        cleanup['unused'] = this.cleanupUnused();
        cleanup['finished'] = this.cleanupFinished();
        cleanup['stalled'] = this.cleanupStalled();

        return cleanup;
    }

    cleanupUnused() {
        const games = [];

        for (const [gameID, gameMeta] of Object.entries(this.#games)) {
            if (gameMeta.created > new Date(Date.now() - (3600 * 1000))) { continue; }

            if (gameMeta.game.state instanceof NewGameState) {
                if (gameMeta.game.createdAt < new Date(Date.now() - (86400 * 1000))) {
                    // Cleanup Game
                    gameMeta.game.endGame(`Game timed out.`);
                    this.removeGame(gameID);
                    this.removeSaveGame(gameID);

                    games.push(gameID);
                }
            }
        }

        return games;
    }

    cleanupFinished() {
        const games = [];

        for (const [gameID, gameMeta] of Object.entries(this.#games)) {
            if (gameMeta.created > new Date(Date.now() - (3600 * 1000))) { continue; }

            if (gameMeta.game.state instanceof GameOverState) {
                if (gameMeta.game.createdAt < new Date(Date.now() - (7 * (86400 * 1000)))) {
                    this.removeGame(gameID);
                    games.push(gameID);
                }
            }
        }

        return games;
    }

    cleanupStalled() {
        const games = [];

        for (const [gameID, gameMeta] of Object.entries(this.#games)) {
            if (gameMeta.created > new Date(Date.now() - (3600 * 1000))) { continue; }

            if (gameMeta.game.lastEventAt < new Date(Date.now() - (1 * (86400 * 1000)))) {
                this.removeGame(gameID);
                games.push(gameID);
            }
        }

        return games;
    }

    run() {
        this.#server.listen(this.appConfig.listenPort, () => {
            console.log(`Server is listening on :${this.appConfig.listenPort}`);
        });
    }
}


