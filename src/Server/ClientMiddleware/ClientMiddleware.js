export default class ClientMiddleware {
    #enabled = true;

    constructor(server, socketHandler, gameID, playerID) { }

    setEnabled(value) {
        this.#enabled = value;
    }

    enabled() {
        return this.#enabled;
    }

    preEmitHandler(event) { }

    postEmitHandler(event) { }
}