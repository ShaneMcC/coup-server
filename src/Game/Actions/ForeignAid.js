export default {
    'name': "Foreign Aid",
    'counterActions': ['BLOCK_FOREIGN_AID'],
    'anyoneCanCounter': true,

    process(game, player, target) {
        game.emit('playerGainedCoins', { player: player.id, coins: 2 });
    },
}