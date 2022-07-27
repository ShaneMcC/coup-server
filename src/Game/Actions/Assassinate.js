export default {
    'name': "Assassinate",
    'hasTarget': true,
    'requiredCoins': 3,
    'canChallenge': true,
    'validCards': ['ASSASSIN'],
    'counterActions': ['BLOCK_ASSASSINATE'],

    process(game, player, target) {
        game.emit('playerMustDiscardInfluence', {player: target.id, reason: 'Assassination'}); 
    },
}