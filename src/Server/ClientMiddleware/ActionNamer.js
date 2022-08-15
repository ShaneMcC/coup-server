import ClientMiddleware from './ClientMiddleware.js';

export default class ActionNamer extends ClientMiddleware {
    #server;
    #gameID;
    #socketHandler;
    #playerID;

    constructor(server, socketHandler, gameID, playerID) {
        super(server, socketHandler, gameID, playerID);

        this.#server = server;
        this.#socketHandler = socketHandler;
        this.#gameID = gameID;
        this.#playerID = playerID;
    }

    preEmitHandler(event) {
        if (!this.enabled()) { return; }
        var thisGame = this.#server.getGame(event.game);

        if (event.action && !event.actionName) {
            if (thisGame.GameActions[event.action]) {
                event.actionName = thisGame.GameActions[event.action].name;
            } else if (thisGame.GameCounterActions[event.action]) {
                event.actionName = thisGame.GameCounterActions[event.action].name;
            }
        }

        if (event.counter && !event.counterName && thisGame.GameCounterActions[event.counter]) {
            event.counterName = thisGame.GameCounterActions[event.counter].name;
        }
    }
}