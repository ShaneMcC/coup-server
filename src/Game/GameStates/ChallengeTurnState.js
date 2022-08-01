import { Actions, CounterActions } from '../Actions.js';
import GameState from './GameState.js';

export default class ChallengeTurnState extends GameState {
    player;
    action;
    target;
    previousState;
    waitingFor;
    required;
    counterOnly = false;

    #hasProcessed = false;

    constructor(game, player, action, target, previousState) {
        super(game);
        this.player = player;
        this.action = action;
        this.target = target;
        this.previousState = previousState;

        this.waitingFor = {};
        this.required = {};
        for (const [playerID, p] of Object.entries(this.game.players())) {
            // Only allow players who are alive and not the active player to challenge/pass
            if (p.influence.length > 0 && playerID != this.player.id) {
                this.waitingFor[playerID] = true;
                if (Actions[this.action] && ((this.target && this.target.id == playerID) || Actions[this.action].anyoneCanCounter)) {
                    this.required[playerID] = true;
                }
            }
        }

        game.log('STATE: Challenge Turn ', [player, action, target]);
    }

    toString() {
        return `CanChallenge[${this.player.name} => ${this.action} => ${this.target?.name ? this.target.name : this.target}]`
    }

    processAction() {
        if (Object.keys(this.required).length > 0) {
            this.game.emit('playerActionStillCounterable', { 'player': this.player.id, 'action': this.action, 'target': this.target?.id, 'players': Object.keys(this.required) });
            this.game.state = this;
            return;
        }

        if (this.#hasProcessed) { return; }
        this.#hasProcessed = true;

        this.game.log('STATE: Challenge/ProcessAction ', [this.player, this.action, this.target]);

        if (Actions[this.action]) {
            this.game.emit('playerPerformedAction', { 'player': this.player.id, 'action': this.action, 'target': this.target?.id });
            Actions[this.action].process(this.game, this.player, this.target);
        }
    }

    processPreviousAction() {
        this.game.log('STATE: Challenge/ProcessPreviousAction ', [this.player, this.action, this.target]);
        this.previousState.processAction();
    }

    handlePlayerAction(playerid, action, target) {
        if (!this.game.players()[playerid]) {
            return [false, 'Player is not in this game.'];
        }

        if (playerid == this.player.id) {
            return [false, 'Player can not challenge their own action.'];
        }

        if (this.waitingFor[playerid] == undefined) {
            return [false, `Player ${playerid} has already reacted to this action.`];
        }

        if (action == "PASS") {
            this.game.emit('playerPassed', { 'player': playerid });

            // TODO: Some of this tracking should be in Game maybe?
            delete this.waitingFor[playerid];
            delete this.required[playerid];

            if (Object.entries(this.waitingFor).length == 0) {
                this.processAction();

                if (this.game.state == this) {
                    // If the game state hasn't changed, then we can advance to the next turn.
                    this.game.startNextTurn();
                }
            }

            return [true, ''];
        }

        if (action == "CHALLENGE" && !this.counterOnly && Actions[this.action] && Actions[this.action].canChallenge) {
            delete this.waitingFor[playerid];
            delete this.required[playerid];
            this.counterOnly = true;

            this.game.emit('playerChallenged', { 'player': this.player.id, 'action': this.action, 'target': this.target?.id, 'challenger': playerid });
            return [true, ''];
        }

        if (action == "CHALLENGE" && !this.counterOnly && CounterActions[this.action]) {
            delete this.waitingFor[playerid];
            delete this.required[playerid];
            this.counterOnly = true;

            this.game.emit('playerChallenged', { 'player': this.player.id, 'action': this.action, 'target': this.target?.id, 'challenger': playerid });
            return [true, ''];
        }

        if (action == "COUNTER" && Actions[this.action] && ((this.target && this.target.id == playerid) || Actions[this.action].anyoneCanCounter) && Actions[this.action].counterActions && Actions[this.action].counterActions.indexOf(target) > -1) {
            delete this.waitingFor[playerid];
            delete this.required[playerid];

            // Only 1 player can counter, I think.
            this.required = {};

            this.game.emit('playerCountered', { 'player': this.player.id, 'action': this.action, 'target': this.target?.id, 'challenger': playerid, 'counter': target });
            return [true, ''];
        }

        return [false, `Invalid action: ${action}`];
    }
}
