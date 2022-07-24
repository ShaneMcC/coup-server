import { Actions } from '../Actions.js';
import GameState from './GameState.js';

export default class PlayerTurnState extends GameState {

    player;

    constructor(game, player) {
        super(game);
        this.player = player;

        game.log('STATE: Player Turn ', player);
    }

    handlePlayerAction(playerid, action, target) {
        if (playerid != this.player.id) {
            return [false, 'Player is not the current player.'];
        }

        if (!Actions[action]) {
            return [false, 'Action is not valid.'];
        }

        if (Actions[action].hasTarget) {
            if (target == undefined) {
                return [false, `${Actions[action].name} requires a target.`];
            }

            if (this.game.players()[target] == undefined) {
                return [false, `${Actions[action].name} requires a valid target.`];
            }

            if (this.game.players()[target].influence.length == 0) {
                return [false, `${Actions[action].name} requires a living target.`];
            }
        } else {
            target = undefined;
        }

        if (Actions[action].requiredCoins && this.player.coins < Actions[action].requiredCoins) {
            return [false, `${Actions[action].name} requires ${Actions[action].requiredCoins} coins`];
        }

        if (this.player.coins >= 10 && action != 'COUP') {
            return [false, `${Actions[action].name} is not valid with more than 10 coins.`];
        }

        if (Actions[action].canChallenge) {
            this.game.emit('challengeablePlayerAction', { 'player': this.player.id, 'action': action, 'target': target });
        } else if (Actions[action].counterActions && Actions[action].counterActions.length > 0) {
            this.game.emit('counterablePlayerAction', { 'player': this.player.id, 'action': action, 'target': target });
        } else {
            // Action happens immediately.
            Actions[action].process(this.game, this.player, this.game.players()[target]);

            // If the action doesn't change the game state, then we can move on to the next turn
            if (this.game.state == this) {
                this.game.startNextTurn();
            }
        }

        return [true, ''];
    }
}
