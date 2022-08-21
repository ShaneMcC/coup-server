export default {
    'name': "Coup",
    'hasTarget': true,
    'requiredCoins': 7,

    process(game, playerid, targetid) {
        game.emit('coupSuccess', {player: playerid, target: targetid});
        game.emit('playerMustDiscardInfluence', {player: targetid, reason: 'Coup'});
    },
}