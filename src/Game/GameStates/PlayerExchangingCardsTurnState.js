import GameState from './GameState.js';

export default class PlayerExchangingCardsTurnState extends GameState {
    player;

    #count = 0;
    #exchangesRequired = 2;

    constructor(game, playerid, exchangesRequired) {
        super(game);
        this.player = this.game.players()[playerid];
        this.#exchangesRequired = exchangesRequired;

        game.log('STATE: PlayerExchangingCards Turn ', [this.player, exchangesRequired]);

        this.#setupEventHandlers();
    }

    #updatePlayerArrays() {
        this.player = this.game.players()[this.player.id];
    }

    toString() {
        return `PlayerExchangingCards[${this.player.name} => ${this.#exchangesRequired}]`
    }

    handlePlayerAction(playerid, action, target) {
        if (!this.game.players()[playerid]) {
            return [false, 'Player is not in this game.'];
        }
        
        if (playerid != this.player.id) {
            return [false, 'Player does not need to exchange cards.'];
        }

        this.#updatePlayerArrays();

        if (action == "EXCHANGE") {
            if (this.player.influence.indexOf(target) == -1) {
                return [false, 'Player can not exchange influence they do not have.'];
            }

            this.game.emit('returnInfluenceToDeck', { 'player': this.player.id, 'influence': target });

            if (this.#count == this.#exchangesRequired) {
                this.game.emit('playerFinishedExchangingCards', { 'player': this.player.id });

                // Shuffle the deck and continue the next turn
                this.game.emit('setDeck', { 'deck': this.game.getShuffledDeck(this.game.getGameDeck()) });
                this.game.startNextTurn();
            }

            return [true, ''];
        }

        return [false, `Unknown action: ${action}`];
    }

    #setupEventHandlers() {
        this.gameEvents.on('returnInfluenceToDeck', (args) => {
            if (args.player == this.player.id) {
                this.#count++;
            }
        });
    }
}
