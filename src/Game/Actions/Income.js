export default {
    'name': "Income",

    process(game, playerid, targetid) {
        game.emit('playerGainedCoins', {player: playerid, coins: 1});
    },
}