import { Actions, CounterActions } from '../Actions.js';
import GameState from './GameState.js';

export default class PlayerChallengedTurnState extends GameState {
    player;
    action;
    challenger;
    previousState;

    #successfulChallenge;

    #continueAction = true;

    #revealedInfluence = '';

    constructor(game, player, action, challenger, previousState) {
        super(game);
        this.player = player;
        this.action = action;
        this.challenger = challenger;
        this.previousState = previousState;
        this.#successfulChallenge = false;

        game.log('STATE: PlayerChallenged Turn ', [player, action, challenger]);
    }

    toString() {
        return `PlayerChallenged[${this.player.name} => ${this.action} => ${this.challenger.name}]`
    }

    processAction() {

        // If we need to continue our turn, then do so.
        // This will happen if a challenge occurs as a player needs to discard a card
        // before we continue.
        if (this.#continueAction) {
            this.#continueAction = false;

            if (this.#successfulChallenge) {
                this.game.emit('returnKnownInfluenceToDeck', { 'player': this.player.id, 'influence': this.#revealedInfluence });
                this.game.emit('setDeck', { 'deck': this.game.getShuffledDeck(this.game.getGameDeck()) });
                this.game.emit('allocateNextInfluence', { 'player': this.player.id });
            } else {
                this.game.emit('discardInfluence', { 'player': this.player.id, 'influence': this.#revealedInfluence });
            }

            if (Actions[this.action] && this.#successfulChallenge) {
                // If this was a challenge on an action, and they passed
                // the they get to do the action.
                this.previousState.processAction();
            } else if (CounterActions[this.action] && !this.#successfulChallenge) {
                // If this was a challenge on a counter action, and it failed
                // then the original action gets to happen.
                this.previousState.processPreviousAction();
            }

            // If we're not waiting for something else (eg a discard) then continue to the next turn
            if (this.game.state == this) {
                this.game.startNextTurn();
            }
        } else {
            // If we get called again then advance.
            // TODO: This feels unclean and "happens to work" rather than being nessecarily
            // correct maybe. Need to look into this.
            this.game.startNextTurn();
        }
    }

    handlePlayerAction(playerid, action, target) {
        if (!this.game.players()[playerid]) {
            return [false, 'Player is not in this game.'];
        }
        
        if (playerid != this.player.id) {
            return [false, 'Player was not challenged.'];
        }

        var challengedAction;

        if (Actions[this.action]) {
            challengedAction = Actions[this.action];
        } else if (CounterActions[this.action]) {
            challengedAction = CounterActions[this.action];
        }

        if (action == "REVEAL") {
            if (this.player.influence.indexOf(target) == -1) {
                return [false, 'Player can not reveal influence they do not have.'];
            }

            if (challengedAction.validCards.indexOf(target) > -1) {
                this.game.emit('playerPassedChallenge', { 'player': this.player.id, 'influence': target });
                this.game.emit('playerMustDiscardInfluence', { 'player': this.challenger.id, 'reason': 'Player unsuccessfully challenged' });
            } else {
                this.game.emit('playerFailedChallenge', { 'player': this.player.id, 'influence': target });
            }
            // Note, the revealed influence will be discarded by processAction();

            // Continue with the action if we don't need to wait for anything else.
            // (ie, if we didn't end up requiring a player to discard influence.)
            if (this.game.state == this) {
                this.processAction();
            }

            return [true, ''];
        }

        return [false, `Unknown action: ${action}`];
    }

    handleGameEvent(event, args) {
        if (event == 'playerPassedChallenge' || event == 'playerFailedChallenge') {
            this.#revealedInfluence = args.influence;
            this.#successfulChallenge = (event == 'playerPassedChallenge');
        }
    }
}
