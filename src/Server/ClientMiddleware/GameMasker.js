import Crypto from 'crypto';
import ClientMiddleware from './ClientMiddleware.js';

export default class GameMasker extends ClientMiddleware {
    #server;
    #gameID;
    #socketHandler;

    #gameDeck = [];
    #playerID;
    #playerMasks = {};

    constructor(server, socketHandler, gameID, playerID) {
        super(server, socketHandler, gameID, playerID);

        this.#server = server;
        this.#socketHandler = socketHandler;
        this.#gameID = gameID;
        this.#playerID = playerID;
    }

    getActionTarget(action, target) {
        // TODO: We should maybe know what specific actions we care about to actually de-mask
        // rather than doing it for all possible targets.
        //
        // but for now these are the ones that take arbitrary input that could allow unmasking.
        if (action == 'CHAT' || action == 'SETNAME') { return [action, target]; }

        for (const [id, p] of Object.entries(this.#playerMasks)) {
            if (p == target) {
                return [action, id];
            }
        }
        
        return [action, target];
    }

    #getMaskedPlayerID(playerID) {
        return this.#playerMasks[playerID] ? this.#playerMasks[playerID] : playerID;
    }

    preEmitHandler(event) {
        if (!this.enabled()) { return; }

        var myPlayerMask = this.#getMaskedPlayerID(this.#playerID);

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
        if (event.players) {
            var newPlayers = [];
            for (const p of event.players) { newPlayers.push(this.#playerMasks[p]); }
            event.players = newPlayers;
        }
        if (event.__type == 'removePlayer' && this.#playerMasks[event.id]) {
            event.id = this.#playerMasks[event.id];
            delete this.#playerMasks[event.id];
        }

        // Hide Deck from players, and keep track of it ourself to deal with allocateNextInfluence
        if (event.__type == 'setDeck') {
            this.#gameDeck = event.deck;

            event.deck = Array(event.deck.length).fill("UNKNOWN");
        }

        // Modify allocateNextInfluence to actually be useful for the client if it is us
        // or hide it otherwise.
        if (event.__type == 'allocateNextInfluence') {
            var influence = this.#gameDeck.shift();

            event.__type = 'allocateInfluence';

            if (event.player == myPlayerMask) {
                event.influence = influence;
            } else {
                event.influence = 'UNKNOWN';
            }
        }

        // Hide re-decked influences.
        if (event.__type == 'returnInfluenceToDeck' && event.player != myPlayerMask) {
            event.influence = 'UNKNOWN';
        }

        // Modify playerWillCounter to be a playerPassed event
        if (event.__type == 'playerWillCounter') {
            event.__type = 'playerPassed';
            event.player = event.challenger;

            for (const k of Object.keys(event)) {
                if (k != '__type' && k != 'player' && k != 'game'&& k != 'date') {
                    delete event[k];
                }
            }
        }

    }


    postEmitHandler(event) {
        if (!this.enabled()) { return; }

        var thisGamePlayers = this.#server.getGame(event.game)?.players();
        
        if (event.__type == 'gameOver' || event.__type == 'gameEnded') {
            // Reveal all player influences that we hid earlier.
            for (const [pid, player] of Object.entries(thisGamePlayers)) {
                this.#socketHandler.emitEvent('handleGameEvent', {
                    '__type': 'showPlayerInfluence',
                    'game': event.game,
                    'player': this.#getMaskedPlayerID(pid),
                    'date': event.date,
                    'influence': player.influence
                });
            }
            
            // And the deck.
            this.#socketHandler.emitEvent('handleGameEvent', {
                '__type': 'showDeck',
                'game': event.game,
                'date': event.date,
                'deck': this.#gameDeck,
            });
        }

    }
}