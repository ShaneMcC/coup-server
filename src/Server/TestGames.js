import { uniqueNamesGenerator, adjectives as adjectiveList, colors as colourList, animals as animalList } from 'unique-names-generator';

export default class TestGames {
    constructor(gs) {
        this.#createTestGame(gs, 'TestGame', ['Alice', 'Bob', 'Charlie']);

        const nameConfig = { dictionaries: [[...adjectiveList, ...colourList], animalList], length: 2, separator: '', style: 'capital' };
        const player1 = uniqueNamesGenerator(nameConfig);
        const player2 = uniqueNamesGenerator(nameConfig);
        const player3 = uniqueNamesGenerator(nameConfig);
        this.#createTestGame(gs, undefined, [player1, player2, player3]);
    }

    #createTestGame(gs, gameID, players) {
        var testGame = gs.createGame(gameID);
        console.log(`Creating test game: ${testGame.gameID()}`);

        for (const player of players) {
            testGame.emit('addPlayer', { 'id': player, 'name': player });
            testGame.doPlayerAction(player, 'READY');
        }

        testGame.doPlayerAction(players[0], 'STARTGAME');

        for (const player of players) {
            testGame.doPlayerAction(player, 'INCOME');
        }
    }
}