export default {
    'name': "Coup",
    'hasTarget': true,
    'requiredCoins': 7,

    process(game, player, target) {
        game.emit('playerMustDiscardInfluence', {player: target.id, reason: 'Coup'});
    },
}