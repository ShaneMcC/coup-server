import GameState from './GameState.js';

export default class GameOverState extends GameState {
    #event;

    constructor(game, event) {
        super(game);
        this.#event = JSON.parse(JSON.stringify(event));
        delete this.#event['game'];
        game.log('STATE: Game Over', [event]);
    }

    toString() {
        return `GameOver [${JSON.stringify(this.#event)}]`
    }
}
