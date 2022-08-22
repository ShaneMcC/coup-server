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
            if (target != undefined && target != null && target.length > 0) {
                this.game.emit('setPlayerName', { 'player': playerid, 'name': target.substring(0, 20) });
                return [true, ''];
            } else {
                return [false, 'Name is not valid.'];
            }
        }

        if (action == 'KICK') {
            this.game.emit('removePlayer', { 'id': target, 'reason': `Player Kicked.`, kickedBy: playerid });
            return [true, ''];
        }

        if (action != 'STARTGAME') {
            return [false, 'Game is not yet started.'];
        }

        // Check for correct number of players.
        // 2-10 players.
        if (Object.keys(this.game.players()).length < 2) {
            return [false, `You need at least 2 players to play.`];
        } else if (Object.keys(this.game.players()).length > 10) {
            return [false, `You can not play with more than 10 players.`];
        }

        // Check if all players are ready.
        for (const [playerID, player] of Object.entries(this.game.players())) {
            if (!player.ready) {
                return [false, `${player.name} is not ready.`];
            }
        }

        var gameOptions = {};
        if (target?.options) {
            for (const [id, data] of Object.entries(target.options)) {
                if (this.game.ValidGameOptions[id] && 'value' in data) {
                    gameOptions[id] = data.value;
                }
            }
        }

        if (Object.keys(this.game.players()).length == 2) {
            this.game.emit('startGame', {'mode': 'StandardTwoPlayerGame', 'options': gameOptions});
        } else {
            this.game.emit('startGame', {'mode': 'StandardGame', 'options': gameOptions});
        }

        // Let the game setup handler set up the game.
        this.game.state.processAction();

        return [true, ''];
    }
}
