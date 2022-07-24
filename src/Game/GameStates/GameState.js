export default class GameState {
    game;

    constructor(game) { this.game = game; }
    handlePlayerAction(playerid, action, target) { return [false, 'Game is not accepting actions.']; }
}
