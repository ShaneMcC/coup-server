import { Actions, CounterActions } from '../Actions.js';
import GameState from './GameState.js';

export default class ChallengeTurnState extends GameState {
    player;
    action;
    target;
    previousState;
    canChallenge = {};
    canCounter = {};
    counterOnly = false;
    pendingCounters = [];

    #hasProcessed = false;

    constructor(game, player, action, target, previousState) {
        super(game);
        this.player = player;
        this.action = action;
        this.target = target;
        this.previousState = previousState;

        this.canChallenge = {};
        this.canCounter = {};
        for (const [playerID, p] of Object.entries(this.game.players())) {
            // Only allow players who are alive and not the active player to challenge/pass
            if (p.influence.length > 0 && playerID != this.player.id) {
                this.canChallenge[playerID] = true;
                if (Actions[this.action] && ((this.target && this.target.id == playerID) || Actions[this.action].anyoneCanCounter)) {
                    this.canCounter[playerID] = true;
                }
            }
        }

        game.log('STATE: Challenge Turn ', [player, action, target]);
    }

    toString() {
        return `CanChallenge[${this.player.name} => ${this.action} => ${this.target?.name ? this.target.name : this.target}]`
    }

    processAction() {
        if (Object.keys(this.canCounter).length > 0) {
            this.game.emit('playerActionStillCounterable', { 'player': this.player.id, 'action': this.action, 'target': this.target?.id, 'players': Object.keys(this.canCounter) });
            this.game.state = this;
            return;
        }

        if (this.pendingCounters.length > 0) {
            const pendingCounter = this.pendingCounters.shift();
            this.game.emit('playerCountered', pendingCounter);
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
            return [false, 'Player can not challenge or counter their own action.'];
        }

        if (this.canChallenge[playerid] == undefined && this.canCounter[playerid] == undefined) {
            return [false, `Player ${playerid} has already reacted to this action.`];
        }

        if (action == "PASS") {
            this.game.emit('playerPassed', { 'player': playerid });

            delete this.canChallenge[playerid];
            delete this.canCounter[playerid];

            if (Object.entries(this.canChallenge).length == 0 && Object.entries(this.canCounter).length == 0) {
                this.processAction();

                if (this.game.state == this) {
                    // If the game state hasn't changed, then we can advance to the next turn.
                    this.game.startNextTurn();
                }
            }

            return [true, ''];
        }

        if (action == "CHALLENGE" && !this.counterOnly && Actions[this.action] && Actions[this.action].canChallenge) {
            this.canChallenge = {};
            this.counterOnly = true;

            this.game.emit('playerChallenged', { 'player': this.player.id, 'action': this.action, 'target': this.target?.id, 'challenger': playerid });
            return [true, ''];
        }

        if (action == "CHALLENGE" && !this.counterOnly && CounterActions[this.action]) {
            this.canChallenge = {};
            this.counterOnly = true;

            this.game.emit('playerChallenged', { 'player': this.player.id, 'action': this.action, 'target': this.target?.id, 'challenger': playerid });
            return [true, ''];
        }

        if (action == "COUNTER" && Actions[this.action] && ((this.target && this.target.id == playerid) || Actions[this.action].anyoneCanCounter) && Actions[this.action].counterActions && Actions[this.action].counterActions.indexOf(target) > -1) {
            delete this.canChallenge[playerid];
            delete this.canCounter[playerid];

            // Technically we should collect all the COUNTER claims, then allow challenging them 
            // as a whole, not a one-by-one thing like we do here.
            // 
            // But this will require a bit more reworking, so for now lets do it this way
            // and allow others to continue to counter if the first fails.
            // 
            // https://boardgamegeek.com/filepage/86105/action-resolution-order-flowchart
            // https://boardgamegeek.com/thread/1059909/multiple-counters-foreign-aid

            const counterAction = { 'player': this.player.id, 'action': this.action, 'target': this.target?.id, 'challenger': playerid, 'counter': target };
            if (Object.keys(this.canChallenge).length > 0) {
                this.game.emit('playerWillCounter', counterAction);
                this.pendingCounters.push(counterAction);
            } else {
                this.game.emit('playerCountered', counterAction);
            }
            return [true, ''];
        }

        return [false, `Invalid action: ${action}`];
    }
}
