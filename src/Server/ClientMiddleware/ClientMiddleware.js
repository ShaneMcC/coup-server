export default class ClientMiddleware {
    #enabled = true;

    constructor(server, socketHandler, gameID, playerID) { }

    setEnabled(value) {
        this.#enabled = value;
    }

    enabled() {
        return this.#enabled;
    }

    getActionTarget(action, target) { return [action, target]; }

    preEmitHandler(event) { }
    
    postEmitHandler(event) { }

    preLoadGame() { }

    postLoadGame() { }
}