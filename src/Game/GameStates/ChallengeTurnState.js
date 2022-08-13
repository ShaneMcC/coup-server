
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

    constructor(game, playerid, action, targetid, previousState) {
        super(game);
        this.player = this.game.players()[playerid];
        this.action = action;
        this.target = this.game.players()[targetid];
        this.previousState = previousState;

        this.canChallenge = {};
        this.canCounter = {};
        for (const [playerID, p] of Object.entries(this.game.players())) {
            // Only allow players who are alive and not the active player to challenge/pass
            if (p.influence.length > 0 && playerID != this.player.id) {
                this.canChallenge[playerID] = true;
                if (this.game.GameActions[this.action] && ((this.target && this.target.id == playerID) || this.game.GameActions[this.action].anyoneCanCounter)) {
                    this.canCounter[playerID] = true;
                }
            }
        }

        this.#setupEventHandlers();
        game.log('STATE: Challenge Turn ', [this.player, action, this.target]);
    }

    toString() {
        return `CanChallenge[${this.player.name} => ${this.action} => ${this.target?.name ? this.target.name : this.target}]`
    }

    processAction() {
        // Remove dead players from canCounter list (eg, if they challenged and failed.)
        this.canCounter = Object.fromEntries(Object.entries(this.canCounter).filter(([playerid, _]) => this.game.players()[playerid].influence.length > 0));

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

        if (this.game.GameActions[this.action]) {
            this.game.emit('playerPerformedAction', { 'player': this.player.id, 'action': this.action, 'target': this.target?.id });
            this.game.GameActions[this.action].process(this.game, this.player.id, this.target?.id);
        }

        if (this.game.GameCounterActions[this.action]) {
            this.game.emit('playerPerformedCounterAction', { 'player': this.player.id, 'action': this.action, 'target': this.target?.id });
            if (this.game.GameCounterActions[this.action].process) {
                this.game.GameCounterActions[this.action].process(this.game, this.player.id, this.target?.id);
            }
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

            if (Object.entries(this.canChallenge).length == 0 && Object.entries(this.canCounter).length == 0) {
                this.processAction();

                if (this.game.state == this) {
                    // If the game state hasn't changed, then we can advance to the next turn.
                    this.game.startNextTurn();
                }
            }

            return [true, ''];
        }

        if (action == "CHALLENGE" && !this.counterOnly && this.game.GameActions[this.action] && this.game.GameActions[this.action].canChallenge) {
            this.game.emit('playerChallenged', { 'player': this.player.id, 'action': this.action, 'target': this.target?.id, 'challenger': playerid });
            return [true, ''];
        }

        if (action == "CHALLENGE" && !this.counterOnly && this.game.GameCounterActions[this.action]) {
            this.game.emit('playerChallenged', { 'player': this.player.id, 'action': this.action, 'target': this.target?.id, 'challenger': playerid });
            return [true, ''];
        }

        if (action == "COUNTER" && this.game.GameActions[this.action] && ((this.target && this.target.id == playerid) || this.game.GameActions[this.action].anyoneCanCounter) && this.game.GameActions[this.action].counterActions && this.game.GameActions[this.action].counterActions.indexOf(target) > -1) {
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
            } else {
                this.game.emit('playerCountered', counterAction);
            }
            return [true, ''];
        }

        return [false, `Invalid action: ${action}`];
    }

    #setupEventHandlers() {
        this.gameEvents.on('playerPassed', (args) => {
            delete this.canChallenge[args.player];
            delete this.canCounter[args.player];
        });

        const playerCounteredHandler = (args) => {
            delete this.canChallenge[args.challenger];
            delete this.canCounter[args.challenger];
        };

        this.gameEvents.on('playerCountered', playerCounteredHandler);

        this.gameEvents.on('playerWillCounter', (args) => {
            playerCounteredHandler(args);
            this.pendingCounters.push(args);
        });

        this.gameEvents.on('playerChallenged', (args) => {
            this.canChallenge = {};
            this.counterOnly = true;
        });
    }
}
