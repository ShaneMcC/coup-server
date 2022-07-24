export default {
    'name': "Coup",
    'hasTarget': true,
    'requiredCoins': 7,

    process(game, player, target) {
        game.emit('playerLostCoins', {player: player, coins: this.requiredCoins});
        game.emit('playerMustDiscardInfluence', {player: target, reason: 'Coup'});
    },
}