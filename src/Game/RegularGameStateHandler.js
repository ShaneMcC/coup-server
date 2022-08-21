import GameState from './GameStates/GameState.js';
import PlayerTurnState from './GameStates/PlayerTurnState.js';
import ChallengeTurnState from './GameStates/ChallengeTurnState.js';
import PlayerChallengedTurnState from './GameStates/PlayerChallengedTurnState.js';
import PlayerMustDiscardTurnState from './GameStates/PlayerMustDiscardTurnState.js';
import PlayerExchangingCardsTurnState from './GameStates/PlayerExchangingCardsTurnState.js';
import GameOverState from './GameStates/GameOverState.js';
import StandardGameSetup from './GameStates/GameSetup/StandardGameSetup.js';
import StandardTwoPlayerGameSetup from './GameStates/GameSetup/StandardTwoPlayerGameSetup.js';
import EventEmitter from 'events';
import CalledCoupAction from './Actions/CalledCoup.js';
import PlayerCallingCoupTurnState from './GameStates/PlayerCallingCoup.js';

export default class RegularGameStateHandler {
    #gameEvents = new EventEmitter();
    game;
    #gameSetupState = undefined;

    constructor(game) {
        this.game = game;
        this.addHandlers();
    }

    handleGameEvent(event, args) {
        this.#gameEvents.emit(event, args);
    }

    addHandlers() {
        this.#gameEvents.on('startGame', event => {
            const gameMode = event.mode ? event.mode : 'StandardGame' ;

            switch (gameMode) {
                case 'StandardTwoPlayerGame':
                    this.#gameSetupState = new StandardTwoPlayerGameSetup(this.game);
                    break;
                case 'StandardGame':
                default:
                    this.#gameSetupState = new StandardGameSetup(this.game);
                    break;
            }

            this.game.state = this.#gameSetupState;
        });

        this.#gameEvents.on('continueGameSetup', event => {
            this.game.state = this.#gameSetupState;
        });

        // TODO: This should be better maybe.
        this.#gameEvents.on('enableVariant', event => {
            if (event.variant == 'CallTheCoup') {
                this.game.GameActions['COUP'] = CalledCoupAction;
            }
        });

        this.#gameEvents.on('gameReady', event => {
            this.#gameSetupState = undefined;
            this.game.state = new GameState(this.game);
        });

        this.#gameEvents.on('beginPlayerTurn', event => {
            this.game.state = new PlayerTurnState(this.game, event.player);
        });

        this.#gameEvents.on('playerCallingCoup', event => {
            this.game.state = new PlayerCallingCoupTurnState(this.game, event.player, event.target);
        });

        this.#gameEvents.on('challengeablePlayerAction', event => {
            this.game.state = new ChallengeTurnState(this.game, event.player, event.action, event.target);
        });

        this.#gameEvents.on('counterablePlayerAction', event => {
            this.game.state = new ChallengeTurnState(this.game, event.player, event.action, event.target);
        });

        this.#gameEvents.on('playerCountered', event => {
            this.game.state = new ChallengeTurnState(this.game, event.challenger, event.counter, event.player, this.game.state);
        });

        this.#gameEvents.on('playerChallenged', event => {
            this.game.state = new PlayerChallengedTurnState(this.game, event.player, event.action, event.challenger, this.game.state);
        });

        this.#gameEvents.on('playerMustDiscardInfluence', event => {
            this.game.state = new PlayerMustDiscardTurnState(this.game, event.player, this.game.state);
        });

        this.#gameEvents.on('playerExchangingCards', event => {
            this.game.state = new PlayerExchangingCardsTurnState(this.game, event.player, event.count ? event.count : 2, this.game.state);
        });

        this.#gameEvents.on('gameOver', event => {
            this.game.state = new GameOverState(this.game, event);
        });

        this.#gameEvents.on('gameEnded', event => {
            this.game.state = new GameOverState(this.game, event);
        });
    }
}
