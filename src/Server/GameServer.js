import Express from "express";
import http from "http";
import cors from "cors";
import Game from "../Game/Game.js";
import { Server as IOServer } from "socket.io";
import ClientSocketHandler from "./ClientSocketHandler.js";

export default class GameServer {
    #listenPort;

    #app;
    #server;
    #io;

    #games = {};
    #sockets = {};

    constructor(listenPort) {
        this.#listenPort = listenPort;

        this.#app = new Express();
        this.#app.use(new cors());

        this.#server = http.createServer(this.#app);
        this.#io = new IOServer(this.#server, { cors: { origin: '*' }});

        this.#io.of('/gameServer').on("connection", (socket) => {
            this.#sockets[socket.id] = new ClientSocketHandler(this, socket);
        });

        // TODO: Games need to age out somehow
        // TODO: Games need to persist to disk somewhow
    }

    createGame(gameid) {
        var game = new Game();
        game.debug = true;
        game.createGame(gameid);

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
        this.#server.listen(this.#listenPort, () => {
            console.log(`Server is listening on :${this.#listenPort}`);
        });
    }
}


