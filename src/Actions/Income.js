export default {
    'name': "Income",

    process(game, player, target) {
        game.emit('playerGainedCoins', {player: player.id, coins: 1});
    },
}