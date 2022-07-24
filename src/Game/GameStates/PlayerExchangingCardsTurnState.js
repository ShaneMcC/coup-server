import GameState from './GameState.js';

export default class PlayerExchangingCardsTurnState extends GameState {
    player;

    #count = 0;

    constructor(game, player, previousState) {
        super(game);
        this.player = player;

        game.log('STATE: PlayerExchangingCards Turn ', [player]);
    }

    handlePlayerAction(playerid, action, target) {
        if (playerid != this.player.id) {
            return [false, 'Player does not need to exchange cards influence.'];
        }

        if (action == "EXCHANGE") {
            if (this.player.influence.indexOf(target) == -1) {
                return [false, 'Player can not exchange influence they do not have.'];
            }

            this.game.emit('discardInfluence', { 'player': this.player.id, 'influence': target, 'deck': true });
            this.#count++;

            if (this.#count == 2) {
                // Shuffle the deck and continue the next turn
                this.game.emit('setDeck', { 'deck': this.game.getShuffledDeck() });
                this.game.startNextTurn();
            }

            return [true, ''];
        }

        return [false, `Unknown action: ${action}`];
    }
}
