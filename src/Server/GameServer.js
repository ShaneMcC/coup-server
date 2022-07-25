import Express from "express";
import http from "http";
import Game from "../Game/Game.js";
import { Server as IOServer } from "socket.io";


export default class GameServer {

    #app;
    #server;
    #io;

    #games = {};
    #sockets = {};

    constructor() {
        this.#app = new Express();
        this.#server = http.createServer(this.#app);
        this.#io = new IOServer(this.#server);
        
        this.#io.of('/gameServer').on("connection", (socket) => {
            console.log(`New client: ${socket.id}`);

            this.#sockets[socket.id] = new SocketHandler(this, socket);
        });

        // TODO: Games need to age out somehow
        // TODO: Games need to persist to disk somewhow
    }

    createGame() {
        var game = new Game();
        game.debug = true;
        game.createGame();

        this.#games[game.gameID()] = game;

        return game;
    }

    getGame(gameID) {
        return this.#games[gameID];
    }

    removeSocket(socketID) {
        delete this.#sockets[socketID];
    }

    run() {
        this.#server.listen(3000, () => {
            console.log('Server is listening');
        });
    }
}

export class SocketHandler {
    #socket;
    #server;
    #myGames = {};
    #listener = (e) => { this.handleGameEvent(e); }

    constructor(server, socket) {
        this.#server = server;
        this.#socket = socket;
        this.#socket.emit('clientConnected', {socketID: socket.id });

        this.addHandlers();
    }

    loadGame(game) {
        for (const event of game.collectEvents()) {
            this.handleGameEvent(event);
        }
        this.#socket.emit('gameLoaded', {gameID: game.gameID() });
        game.listen(this.#listener);
    }

    addHandlers() {
        this.#socket.on('createGame', (playerName) => {
            var game = this.#server.createGame();

            this.#socket.emit('gameCreated', { game: game.gameID() });
        });

        this.#socket.on('joinGame', (id, playerName) => {
            var game = this.#server.getGame(id);

            if (game != undefined) {
                var playerID = game.addPlayer(playerName);
                this.#socket.emit('gameJoined', { gameID: id, playerID: playerID });
                this.#myGames[id] = {'playerID': playerID};

                this.loadGame(game);
            }
        });

        // TODO: There is no security here, anyone could rejoin as anyone else.
        this.#socket.on('rejoinGame', (id, playerID) => {
            var game = this.#server.getGame(id);

            if (game != undefined && game.players()[playerID]) {
                this.#socket.emit('gameJoined', { gameID: id, playerID: playerID });
                this.#myGames[id] = {'playerID': playerID};
                
                this.loadGame(game);
            }
        });

        this.#socket.on('action', (gameid, action, target) => {
            var game = this.#server.getGame(gameid);

            if (game != undefined && this.#myGames[gameid].playerID != undefined) {
                game.doPlayerAction(this.#myGames[gameid].playerID, action, target);
            }
        });

        this.#socket.on('disconnect', () => {
            for (const [gameid, info] of Object.entries(this.#myGames)) {
                var game = this.#server.getGame(gameid);

                if (game != undefined && info.playerID) {
                    game.removePlayer(info.playerID, 'Socket Disconnected');
                    game.unlisten(this.#listener);
                }
            }

            this.#server.removeSocket(this.#socket.id);
        });

        // TODO: There is no security here, anyone could run any action as any player.
        this.#socket.on('adminAction', (gameid, playerid, action, target) => {
            var game = this.#server.getGame(gameid);

            if (game != undefined) {
                game.doPlayerAction(playerid, action, target);
            }
        });
    }

    handleGameEvent(event) {
        // TODO: We need to filter some of these to not give away everything.
        // but for now, this will let us simulate some games with some clients!
        this.#socket.emit('handleGameEvent', event);
    }
}