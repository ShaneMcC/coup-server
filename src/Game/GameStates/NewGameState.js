import GameState from './GameState.js';

export default class NewGameState extends GameState {

    constructor(game) {
        super(game);
        game.log('STATE: Game Created.');
    }

    toString() {
        return `NewGame`
    }

    handlePlayerAction(playerid, action, target) {
        if (!this.game.players()[playerid]) {
            return [false, 'Player is not in this game.'];
        }
        
        if (action == 'READY') {
            this.game.emit('playerReady', { 'player': playerid });
            return [true, ''];
        }

        if (action == 'UNREADY') {
            this.game.emit('playerNotReady', { 'player': playerid });
            return [true, ''];
        }

        if (action == 'SETNAME') {
            this.game.emit('setPlayerName', { 'player': playerid, 'name': target });
            return [true, ''];
        }

        if (action == 'KICK') {
            this.game.emit('removePlayer', { 'id': target, 'reason': `Player Kicked.`, kickedBy: playerid });
            return [true, ''];
        }

        if (action != 'STARTGAME') {
            return [false, 'Game is not yet started.'];
        }

        // Check for correct number of players.
        // 3-10 players.
        //
        // Official 2-player doesn't work well, and I haven't implemented alternative rules yet.
        //
        // Consider: https://whatnerd.com/coup-2-players-ultimate-variant/
        if (Object.keys(this.game.players()).length < 3) {
            return [false, `You need at least 3 players to play.`];
        } else if (Object.keys(this.game.players()).length > 10) {
            return [false, `You can not play with more than 10 players.`];
        }

        // Check if all players are ready.
        for (const [playerID, player] of Object.entries(this.game.players())) {
            if (!player.ready) {
                return [false, `${player.name} is not ready.`];
            }
        }

        this.game.emit('startGame');

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
        for (const [playerID, _] of Object.entries(this.game.players())) {
            this.game.emit('allocateNextInfluence', { 'player': playerID });
            this.game.emit('allocateNextInfluence', { 'player': playerID });
            this.game.emit('playerGainedCoins', { 'player': playerID, 'coins': 2 });
        };
        this.game.emit('gameReady');

        // Pick a random starting player.
        var allPlayerIDs = Object.keys(this.game.players());
        this.game.emit('beginPlayerTurn', {'player': allPlayerIDs[Math.floor(Math.random() * allPlayerIDs.length)]});

        return [true, ''];
    }
}
