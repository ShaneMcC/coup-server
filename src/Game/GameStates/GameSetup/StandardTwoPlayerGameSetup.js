import GameState from '../GameState.js';
import StandardGameSetup from './StandardGameSetup.js';

export default class StandardTwoPlayerGameSetup extends GameState {

    #setupStages = {
        INITIAL: 'Initial',
        PLAYER1: 'Player1',
        PLAYER2: 'Player2',
        FINAL: 'Final',
    };
    #setupStage = this.#setupStages.INITIAL;

    #player1 = '';
    #player2 = '';

    gameOptions = {};

    constructor(game, gameOptions) {
        super(game, gameOptions);
        this.gameOptions = gameOptions;
        game.log('STATE: Setup Two Player Game.');
        this.#setupEventHandlers();
    }

    toString() {
        return `StandardTwoPlayerGameSetup[${this.#setupStage}] with {${JSON.stringify(this.gameOptions)}}`
    }

    processAction() {
        this.game.log(`processAction: ${this.toString()}`);

        switch (this.#setupStage) {
            case this.#setupStages.INITIAL:
                this.processAction_initial();
                break;

            case this.#setupStages.PLAYER1:
                // Player 1 has finished discarding, move to player 2:
                this.game.emit('continueGameSetup');
                this.game.emit('playerExchangingCards', { player: this.#player2, count: 4, reason: 'Pick starting influence' });
                break;

            case this.#setupStages.PLAYER2:
                // Player 2 has finished discarding, begin game.
                this.game.emit('continueGameSetup');
                this.processAction_final();
                break;
        }
    }

    shuffleAndDealDeck() {
        // Put 2 of each card in the deck.
        var deck = [];
        for (const [card, _] of Object.entries(this.game.GameCards)) {
            deck.push(card);
            deck.push(card);
        };

        // Shuffle the court deck.
        this.game.emit('setDeck', { 'deck': this.game.getShuffledDeck(deck) });

        // Give each player 1 of each card, leaving the remaining cards in the court deck.
        this.game.emit('allocatingPlayerInfluence');
        for (const [playerID, _] of Object.entries(this.game.players())) {
            for (const [card, _] of Object.entries(this.game.GameCards)) {
                this.game.emit('allocateInfluence', { 'player': playerID, 'influence': card });
            }
        }
    }

    processAction_initial() {
        if (this.gameOptions['CallTheCoup']) {
            this.game.emit('enableVariant', { variant: 'CallTheCoup' });
        }

        if (this.gameOptions['TwoPlayerExtraLives']) {
            this.game.emit('enableVariant', { variant: 'ExtraLives' });

            // Do standard game setup.
            (new StandardGameSetup(this.game, this.gameOptions)).shuffleAndDealDeck();
        } else {
            this.shuffleAndDealDeck();
        }

        // Pick a random starting player.
        var allPlayerIDs = Object.keys(this.game.players());
        this.game.emit('startingPlayerSelected', { 'player': allPlayerIDs[Math.floor(Math.random() * allPlayerIDs.length)] });


        if (this.gameOptions['TwoPlayerExtraLives']) {
            // Allocate lives to players
            this.game.emit('playerAllocatedExtraLives', { 'player': this.#player1, 'lives': 3 });
            this.game.emit('playerAllocatedExtraLives', { 'player': this.#player2, 'lives': 3 });
        }

        switch (this.#setupStage) {
            case this.#setupStages.INITIAL:
                // Player 1 Discard.
                this.game.emit('playerExchangingCards', { player: this.#player1, count: 4, reason: 'Pick starting influence' });
                break;

            case this.#setupStages.FINAL:
                // Start the game.
                this.gameReady();
                break;
        }
    }

    processAction_final() {
        // Put 1 of each card in the deck.
        var deck = [];
        for (const [card, _] of Object.entries(this.game.GameCards)) {
            deck.push(card);
        };

        // Shuffle the deck.
        this.game.emit('setDeck', { 'deck': this.game.getShuffledDeck(deck) });

        // Allocate a random cards to each player.
        this.game.emit('allocateNextInfluence', { 'player': this.#player1 });
        this.game.emit('allocateNextInfluence', { 'player': this.#player2 });

        // Allocate starting coins
        this.game.emit('playerGainedCoins', { 'player': this.#player1, 'coins': 1 });
        this.game.emit('playerGainedCoins', { 'player': this.#player2, 'coins': 2 });

        // Game is ready
        this.game.emit('playerInfluenceAllocated');
        
        this.gameReady();
    }

    gameReady() {
        this.game.emit('gameReady');
        this.game.emit('beginPlayerTurn', { 'player': this.#player1 });
    }

    #setupEventHandlers() {
        this.gameEvents.on('startingPlayerSelected', (event) => {
            var allPlayerIDs = Object.keys(this.game.players());

            this.#player1 = event.player;
            this.#player2 = allPlayerIDs.filter(e => e != event.player)[0];
        });

        this.gameEvents.on('playerExchangingCards', (event) => {
            if (event.player == this.#player1) {
                this.#setupStage = this.#setupStages.PLAYER1;
            } else if (event.player == this.#player2) {
                this.#setupStage = this.#setupStages.PLAYER2;
            }
        });

        this.gameEvents.on('playerInfluenceAllocated', () => {
            this.#setupStage = this.#setupStages.FINAL;
        });
    }
}
