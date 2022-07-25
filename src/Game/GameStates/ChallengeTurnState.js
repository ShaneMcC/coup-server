import { Actions, CounterActions } from '../Actions.js';
import GameState from './GameState.js';

export default class ChallengeTurnState extends GameState {
    player;
    action;
    target;
    previousState;
    waitingFor;

    #hasProcessed = false;

    constructor(game, player, action, target, previousState) {
        super(game);
        this.player = player;
        this.action = action;
        this.target = target;
        this.previousState = previousState;

        this.waitingFor = {};
        for (const [playerID, _] of Object.entries(this.game.players())) {
            this.waitingFor[playerID] = true;
        }

        delete this.waitingFor[this.player.id];

        game.log('STATE: Challenge Turn ', [player, action, target]);
    }

    processAction() {
        if (this.#hasProcessed) { return; }
        this.#hasProcessed = true;

        this.game.log('STATE: Challenge/ProcessAction ', [this.player, this.action, this.target]);

        if (Actions[this.action]) {
            Actions[this.action].process(this.game, this.player, this.target);
        }
    }

    processPreviousAction() {
        this.game.log('STATE: Challenge/ProcessPreviousAction ', [this.player, this.action, this.target]);
        this.previousState.processAction();
    }

    handlePlayerAction(playerid, action, target) {
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

            if (Object.entries(this.waitingFor).length == 0) {
                this.processAction();

                if (this.game.state == this) {
                    // If the game state hasn't changed, then we can advance to the next turn.
                    this.game.startNextTurn();
                }
            }

            return [true, ''];
        }

        if (action == "CHALLENGE" && Actions[this.action] && Actions[this.action].canChallenge) {
            this.game.emit('playerChallenged', { 'player': this.player.id, 'action': this.action, 'target': this.target, 'challenger': playerid });
            return [true, ''];
        }

        if (action == "CHALLENGE" && CounterActions[this.action]) {
            this.game.emit('playerChallenged', { 'player': this.player.id, 'action': this.action, 'target': this.target, 'challenger': playerid });
            return [true, ''];
        }

        if (action == "COUNTER" && Actions[this.action] && ((this.target && this.target.id == playerid) || Actions[this.action].anyoneCanCounter) && Actions[this.action].counterActions && Actions[this.action].counterActions.indexOf(target) > -1) {
            this.game.emit('playerCountered', { 'player': this.player.id, 'action': this.action, 'target': this.target, 'challenger': playerid, 'counter': target });
            return [true, ''];
        }

        return [false, `Invalid action: ${action}`];
    }
}