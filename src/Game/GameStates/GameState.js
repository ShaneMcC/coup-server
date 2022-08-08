import EventEmitter from 'events';

export default class GameState {
    game;
    gameEvents = new EventEmitter();

    constructor(game) { this.game = game; }
    handlePlayerAction(playerid, action, target) { return [false, 'Game is not accepting actions.']; }
    handleGameEvent(event, args) { this.gameEvents.emit(event, args); }
    toString() { return `GameState`; }
}
