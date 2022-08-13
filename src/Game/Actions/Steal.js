export default {
    'name': "Steal",
    'hasTarget': true,
    'canChallenge': true,
    'validCards': ['CAPTAIN'],
    'counterActions': ['BLOCK_STEAL_WITH_CAPTAIN', 'BLOCK_STEAL_WITH_AMBASSADOR'],

    process(game, playerid, targetid) {
        var targetCoinCount = Math.max(Math.min(game.players()[targetid].coins, 2), 0);

        game.emit('playerLostCoins', { player: targetid, coins: targetCoinCount });
        game.emit('playerGainedCoins', { player: playerid, coins: targetCoinCount });
    },
}