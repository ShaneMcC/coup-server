export default {
    'name': "Coup",
    'hasTarget': true,
    'requiredCoins': 7,

    process(game, playerid, targetid) {
        game.emit('playerCallingCoup', {player: playerid, target: targetid});
    },
}