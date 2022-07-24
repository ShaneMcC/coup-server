export default {
    'name': "Tax",
    'canChallenge': true,
    'validCards': ['DUKE'],

    process(game, player) {
        game.emit('playerGainedCoins', { player: player.id, coins: 3 });
    },
}