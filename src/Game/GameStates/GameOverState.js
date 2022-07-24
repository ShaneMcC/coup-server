import GameState from './GameState.js';

export default class GameOverState extends GameState {
    constructor(game) {
        super(game);
        game.log('STATE: Game Over.');
    }
}
