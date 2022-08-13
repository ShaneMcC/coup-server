export default {
    'name': "Tax",
    'canChallenge': true,
    'validCards': ['DUKE'],

    process(game, playerid) {
        game.emit('playerGainedCoins', { player: playerid, coins: 3 });
    },
}