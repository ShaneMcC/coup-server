export default class TestGames {
    constructor(gs) {
        this.#createTestGame(gs, 'TestGame');
    }

    #createTestGame(gs, gameID) {
        console.log(`Creating test game: ${gameID}`);
        var testGame = gs.createGame(gameID);

        testGame.emit('addPlayer', { 'id': 'Alice', 'name': 'Alice' });
        testGame.emit('addPlayer', { 'id': 'Bob', 'name': 'Bob' });
        testGame.emit('addPlayer', { 'id': 'Charlie', 'name': 'Charlie' });

        testGame.doPlayerAction('Alice', 'READY');
        testGame.doPlayerAction('Bob', 'READY');
        testGame.doPlayerAction('Charlie', 'READY');

        testGame.doPlayerAction('Alice', 'STARTGAME');

        testGame.doPlayerAction('Alice', 'INCOME');
        testGame.doPlayerAction('Bob', 'INCOME');
        testGame.doPlayerAction('Charlie', 'INCOME');
    }
}