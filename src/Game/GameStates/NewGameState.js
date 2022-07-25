import GameState from './GameState.js';

export default class NewGameState extends GameState {

    constructor(game) {
        super(game);
        game.log('STATE: Game Created.');
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

        if (action != 'STARTGAME') {
            return [false, 'Game is not yet started.'];
        }

        // Check if all players are ready.
        for (const [playerID, player] of Object.entries(this.game.players())) {
            if (!player.ready) {
                return [false, `${player.name} is not ready.`];
            }
        }

        this.game.emit('startGame');
        this.game.emit('setDeck', { 'deck': this.game.getShuffledDeck() });

        // Allocate cards and coins to players.
        for (const [playerID, _] of Object.entries(this.game.players())) {
            this.game.emit('allocateNextInfluence', { 'player': playerID });
            this.game.emit('allocateNextInfluence', { 'player': playerID });
            this.game.emit('playerGainedCoins', { 'player': playerID, 'coins': 2 });
        };
        this.game.emit('gameReady');
        this.game.startNextTurn();

        return [true, ''];
    }
}
