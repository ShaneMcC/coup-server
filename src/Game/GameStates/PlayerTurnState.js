import GameState from './GameState.js';

export default class PlayerTurnState extends GameState {

    player;

    constructor(game, playerid) {
        super(game);
        this.player = this.game.players()[playerid];

        game.log('STATE: Player Turn ', playerid);
    }

    #updatePlayerArrays() {
        this.player = this.game.players()[this.player.id];
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

        if (!this.game.GameActions[action]) {
            return [false, 'Action is not valid.'];
        }

        this.#updatePlayerArrays();

        if (this.game.GameActions[action].hasTarget) {
            if (target == undefined) {
                return [false, `${this.game.GameActions[action].name} requires a target.`];
            }

            if (this.game.players()[target] == undefined) {
                return [false, `${this.game.GameActions[action].name} requires a valid target.`];
            }

            if (this.game.players()[target].influence.length == 0) {
                return [false, `${this.game.GameActions[action].name} requires a living target.`];
            }

            if (target == this.player.id) {
                return [false, `${this.game.GameActions[action].name} can not self-target.`];
            }
        } else {
            target = undefined;
        }

        if (this.player.coins >= 10 && action != 'COUP') {
            return [false, `${this.game.GameActions[action].name} is not valid with 10 or more coins.`];
        }

        if (this.game.GameActions[action].requiredCoins) {
            if (this.player.coins < this.game.GameActions[action].requiredCoins) {
                return [false, `${this.game.GameActions[action].name} requires ${this.game.GameActions[action].requiredCoins} coins`];
            } else {
                this.game.emit('playerSpentCoins', {player: this.player.id, coins: this.game.GameActions[action].requiredCoins});
            }
        }

        if (this.game.GameActions[action].counterActions && this.game.GameActions[action].counterActions.length > 0) {
            this.game.emit('counterablePlayerAction', { 'player': this.player.id, 'action': action, 'target': target });
        } else if (this.game.GameActions[action].canChallenge) {
            this.game.emit('challengeablePlayerAction', { 'player': this.player.id, 'action': action, 'target': target });
        } else {
            // Action happens immediately.
            this.game.emit('playerPerformedAction', { 'player': this.player.id, 'action': action, 'target': target });
            this.game.GameActions[action].process(this.game, this.player.id, target);

            // If the action doesn't change the game state, then we can move on to the next turn
            if (this.game.state == this) {
                this.game.startNextTurn();
            }
        }

        return [true, ''];
    }
}
