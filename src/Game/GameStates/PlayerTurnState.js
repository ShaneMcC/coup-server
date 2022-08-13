import { Actions } from '../Actions.js';
import GameState from './GameState.js';

export default class PlayerTurnState extends GameState {

    player;

    constructor(game, playerid) {
        super(game);
        this.player = this.game.players()[playerid];

        game.log('STATE: Player Turn ', playerid);
    }

    toString() {
        return `PlayerTurn[${this.player.name}]`
    }

    handlePlayerAction(playerid, action, target) {
        if (!this.game.players()[playerid]) {
            return [false, 'Player is not in this game.'];
        }
        
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

            if (target == this.player.id) {
                return [false, `${Actions[action].name} can not self-target.`];
            }
        } else {
            target = undefined;
        }

        if (this.player.coins >= 10 && action != 'COUP') {
            return [false, `${Actions[action].name} is not valid with 10 or more coins.`];
        }

        if (Actions[action].requiredCoins) {
            if (this.player.coins < Actions[action].requiredCoins) {
                return [false, `${Actions[action].name} requires ${Actions[action].requiredCoins} coins`];
            } else {
                this.game.emit('playerSpentCoins', {player: this.player.id, coins: Actions[action].requiredCoins});
            }
        }

        if (Actions[action].counterActions && Actions[action].counterActions.length > 0) {
            this.game.emit('counterablePlayerAction', { 'player': this.player.id, 'action': action, 'target': target });
        } else if (Actions[action].canChallenge) {
            this.game.emit('challengeablePlayerAction', { 'player': this.player.id, 'action': action, 'target': target });
        } else {
            // Action happens immediately.
            this.game.emit('playerPerformedAction', { 'player': this.player.id, 'action': action, 'target': target });
            Actions[action].process(this.game, this.player.id, target);

            // If the action doesn't change the game state, then we can move on to the next turn
            if (this.game.state == this) {
                this.game.startNextTurn();
            }
        }

        return [true, ''];
    }
}
