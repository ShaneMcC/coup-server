import Express from "express";
import http from "http";
import cors from "cors";
import fs from "fs";
import Game from "../Game/Game.js";
import { Server as IOServer } from "socket.io";
import ClientSocketHandler from "./ClientSocketHandler.js";
import AdminSocketHandler from "./AdminSocketHandler.js";

import { uniqueNamesGenerator, adjectives as adjectiveList, colors as colourList, animals as animalList } from 'unique-names-generator';

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

        // TODO: Games need to age out somehow
        // TODO: Games need to persist to disk somewhow
    }

    #prepareNewGame(gameid) {
        var game = new Game();
        game.debug = this.appConfig.debugGames;

        if (gameid == undefined || gameid.length == 0) {
            do {
                gameid = uniqueNamesGenerator({ dictionaries: [adjectiveList, colourList, animalList], length: 3, separator: '-', style: 'lowercase' });
            } while (this.#games[gameid]);
        } else {
            if (this.#games[gameid]) {
                throw new Error('game id already exists');
            }
        }

        return [game, gameid];
    }

    createGame(gameid) {
        var [game, gameid] = this.#prepareNewGame(gameid);

        game.createGame(gameid);
        this.#games[game.gameID()] = game;

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
        return this.#games[gameID];
    }

    refreshGame(gameID) {
        if (this.#games[gameID]) {
            for (const socket of Object.values(this.#sockets).filter(s => s.type == 'client')) {
                socket.handler.refreshGame(gameID);
            }
        }
    }

    removeGame(gameID) {
        if (this.#games[gameID]) {
            var game = this.#games[gameID];
            delete this.#games[gameID];
            game.unlistenAll();

            for (const socket of Object.values(this.#sockets).filter(s => s.type == 'client')) {
                socket.handler.gameRemoved(gameID);
            }
        }

        delete this.#games[gameID];
    }

    removeSaveGame(gameID) {
        if (fs.existsSync(this.appConfig.saveLocation)) {
            var gameFile = this.appConfig.saveLocation + '/' + gameID + '.json';
            fs.unlinkSync(gameFile);
        }

        return false;
    }

    saveGame(gameID) {
        if (this.#games[gameID]) {
            var events = this.#games[gameID].collectEvents();

            if (fs.existsSync(this.appConfig.saveLocation)) {
                fs.writeFileSync(this.appConfig.saveLocation + '/' + gameID + '.json', JSON.stringify(events, null, 2));

                return true;
            }
        }

        return false;
    }

    loadGame(gameID) {
        if (fs.existsSync(this.appConfig.saveLocation)) {
            var gameFile = this.appConfig.saveLocation + '/' + gameID + '.json';

            if (!this.#games[gameID] && fs.existsSync(gameFile)) {
                var events = JSON.parse(fs.readFileSync(gameFile));
                if (events.length > 0) {
                    var [game, _] = this.#prepareNewGame(gameID);

                    if (events[0].__type == 'gameCreated') {
                        // Ensure this game is created with the correct ID internally.
                        var createGame = events.splice(0, 1)[0];
                        createGame.game = gameID;
                        game.hydrate([createGame]);

                        // Hydrate with the rest of the events.
                        game.hydrate(events);
                        this.#games[game.gameID()] = game;

                        return true;
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
        for (const [gameID, game] of Object.entries(this.#games)) {
            var gameInfo = {
                game: game.gameID(),
                created: game.createdAt,
                state: game.state.toString(),
                players: game.players(),
            }

            games[game.gameID()] = gameInfo;
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

    run() {
        this.#server.listen(this.appConfig.listenPort, () => {
            console.log(`Server is listening on :${this.appConfig.listenPort}`);
        });
    }
}


