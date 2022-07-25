import GameState from './GameState.js';

export default class PlayerMustDiscardTurnState extends GameState {
    player;
    previousState;

    constructor(game, player, previousState) {
        super(game);
        this.player = player;
        this.previousState = previousState;

        game.log('STATE: PlayerMustDiscard Turn ', [player]);
    }

    handlePlayerAction(playerid, action, target) {
        if (!this.game.players()[playerid]) {
            return [false, 'Player is not in this game.'];
        }
        
        if (playerid != this.player.id) {
            return [false, 'Player does not need to discard influence.'];
        }

        if (action == "REVEAL") {
            if (this.player.influence.indexOf(target) == -1) {
                return [false, 'Player can not reveal influence they do not have.'];
            }

            this.game.emit('discardInfluence', { 'player': this.player.id, 'influence': target });

            // Once we've discarded, hand back to the previous action to continue what it was doing.
            if (this.previousState != undefined && this.previousState.processAction) {
                this.previousState.processAction();
            }

            // If the previous action hasn't changed the game state handler, then we move on.
            if (this.game.state == this) {
                this.game.startNextTurn();
            }

            return [true, ''];
        }

        return [false, `Unknown action: ${action}`];
    }
}
