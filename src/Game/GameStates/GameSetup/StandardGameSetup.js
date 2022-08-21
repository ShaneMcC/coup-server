import GameState from '../GameState.js';

export default class StandardGameSetup extends GameState {

    constructor(game) {
        super(game);
        game.log('STATE: Setup Standard Game.');
    }

    toString() {
        return `StandardGameSetup`
    }

    processAction() {
        // Get a deck of cards.
        this.game.emit('prepareDeck');
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
        this.game.emit('gameReady');

        // Pick a random starting player.
        var allPlayerIDs = Object.keys(this.game.players());
        this.game.emit('startingPlayerSelected', {'player': allPlayerIDs[Math.floor(Math.random() * allPlayerIDs.length)]});
        this.game.emit('beginPlayerTurn', {'player': allPlayerIDs[Math.floor(Math.random() * allPlayerIDs.length)]});
    }
}
