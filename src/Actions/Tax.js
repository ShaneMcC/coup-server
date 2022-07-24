export default {
    'name': "Tax",
    'canChallenge': true,
    'validCards': ['DUKE'],

    process(game, player, target) {
        game.emit('playerGainedCoins', { player: player, coins: 3 });
    },
}