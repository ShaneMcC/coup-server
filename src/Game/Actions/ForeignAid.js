export default {
    'name': "Foreign Aid",
    'counterActions': ['BLOCK_FOREIGN_AID'],
    'anyoneCanCounter': true,

    process(game, playerid, targetid) {
        game.emit('playerGainedCoins', { player: playerid, coins: 2 });
    },
}