import GameState from './GameState.js';

export default class PlayerCallingCoupTurnState extends GameState {
    player;
    target;
    previousState;

    constructor(game, playerid, targetid) {
        super(game);
        this.player = this.game.players()[playerid];
        this.target = this.game.players()[targetid];

        game.log('STATE: PlayerCallingCoup Turn ', [this.player, this.target]);
    }

    #updatePlayerArrays() {
        this.player = this.game.players()[this.player.id];
        this.target = this.game.players()[this.target.id];
    }

    toString() {
        return `PlayerMustDiscard[${this.player.name} => ${this.target.name}]`
    }

    handlePlayerAction(playerid, action, target) {
        if (!this.game.players()[playerid]) {
            return [false, 'Player is not in this game.'];
        }
        
        if (playerid != this.player.id) {
            return [false, 'Player is not the player calling the coup.'];
        }

        this.#updatePlayerArrays();

        if (action == "COUP") {
            if (!this.game.GameCards[target]) {
                return [false, 'Player can not call for an influence not in the game.'];
            }

            if (this.target.influence.indexOf(target) == -1) {
                this.game.emit('coupFailed', {player: this.player.id, target: this.target.id, reason: `Target player does not have ${target}.`});
            } else {
                this.game.emit('coupSuccess', {player: this.player.id, target: this.target.id});
                this.game.discardPlayerInfluence(this.target.id, target);
                this.game.emit('playerFinishedDiscardingInfluence', { 'player': this.target.id });
            }

            this.game.startNextTurn();
            return [true, ''];
        }

        return [false, `Unknown action: ${action}`];
    }
}
