export default {
    'name': "Steal",
    'hasTarget': true,
    'canChallenge': true,
    'validCards': ['CAPTAIN'],
    'counterActions': ['BLOCK_STEAL_WITH_CAPTAIN', 'BLOCK_STEAL_WITH_AMBASSADOR'],

    process(game, player, target) {
        var targetCoinCount = Math.min(target.coins, 2);

        game.emit('playerLostCoins', { player: target.id, coins: targetCoinCount });
        game.emit('playerGainedCoins', { player: player.id, coins: targetCoinCount });
    },
}