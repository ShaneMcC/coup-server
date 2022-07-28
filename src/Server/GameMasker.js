import Crypto from 'crypto';

export default class GameMasker {
    #server;
    #gameID;
    #playerID;
    #playerMasks = {};

    constructor(server, gameID, playerID) {
        this.#server = server;
        this.#gameID = gameID;
        this.#playerID = playerID;
    }

    getUnmaskedPlayerID(maskedID) {
        for (const [id, p] of Object.entries(this.#playerMasks)) {
            if (p == maskedID) {
                return id;
            }
        }
        
        return maskedID;
    }

    getMaskedPlayerID(playerID) {
        return this.#playerMasks[playerID] ? this.#playerMasks[playerID] : playerID;
    }

    maskEvent(event) {
        // Mask player IDs to stop people being able to reconnect as someone else easily.
        if (event.__type == 'addPlayer') {
            if (event.id == this.#playerID) { event.self = true; }

            // Generate a unique mask for this player.
            var newMask = '';
            do {
                newMask = 'Player-Mask-' + Crypto.randomUUID();
            } while (Object.values(this.#playerMasks).indexOf(newMask) > -1);

            this.#playerMasks[event.id] = newMask;
            event.id = this.#playerMasks[event.id];
        }
        // Replace player IDs with masked IDs.
        if (event.player && this.#playerMasks[event.player]) {
            event.player = this.#playerMasks[event.player];
        }
        if (event.target && this.#playerMasks[event.target]) {
            event.target = this.#playerMasks[event.target];
        }
        if (event.challenger && this.#playerMasks[event.challenger]) {
            event.challenger = this.#playerMasks[event.challenger];
        }
        if (event.kickedBy && this.#playerMasks[event.kickedBy]) {
            event.kickedBy = this.#playerMasks[event.kickedBy];
        }
        if (event.winner && this.#playerMasks[event.winner]) {
            event.winner = this.#playerMasks[event.winner];
        }
        if (event.__type == 'removePlayer' && this.#playerMasks[event.id]) {
            event.id = this.#playerMasks[event.id];
            delete this.#playerMasks[event.id];
        }
    }
}