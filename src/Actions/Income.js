export default {
    'name': "Income",

    process(game, player, target) {
        game.emit('playerGainedCoins', {player: player, coins: 1});
    },
}