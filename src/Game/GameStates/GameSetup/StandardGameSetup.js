import GameState from '../GameState.js';

export default class StandardGameSetup extends GameState {

    #startingPlayer = '';

    gameOptions = {};

    constructor(game, gameOptions) {
        super(game);
        this.gameOptions = gameOptions;
        game.log('STATE: Setup Standard Game.');
        this.#setupEventHandlers();
    }

    toString() {
        return `StandardGameSetup`
    }

    processAction() {
        if (this.gameOptions['CallTheCoup']) {
            this.game.emit('enableVariant', {variant: 'CallTheCoup'});
        }

        // Get a deck of cards.
        var deck = [];
        for (const [card, _] of Object.entries(this.game.GameCards)) {
            deck.push(card);
            deck.push(card);
            deck.push(card);
            if (Object.keys(this.game.players()).length >= 7) {
                deck.push(card);
            }
            if (Object.keys(this.game.players()).length >= 9) {
                deck.push(card);
            }
        };

        this.game.emit('setDeck', { 'deck':  this.game.getShuffledDeck(deck)});

        // Allocate cards and coins to players.
        this.game.emit('allocatingPlayerInfluence');
        for (const [playerID, _] of Object.entries(this.game.players())) {
            this.game.emit('allocateNextInfluence', { 'player': playerID });
            this.game.emit('allocateNextInfluence', { 'player': playerID });
            this.game.emit('playerGainedCoins', { 'player': playerID, 'coins': 2 });
        };
        this.game.emit('playerInfluenceAllocated');

        // Pick a random starting player.
        var allPlayerIDs = Object.keys(this.game.players());
        this.game.emit('startingPlayerSelected', {'player': allPlayerIDs[Math.floor(Math.random() * allPlayerIDs.length)]});

        this.game.emit('gameReady');

        this.game.emit('beginPlayerTurn', {'player': this.#startingPlayer});
    }

    #setupEventHandlers() {
        this.gameEvents.on('startingPlayerSelected', (event) => {
            this.#startingPlayer = event.player;
        });
    }
}
