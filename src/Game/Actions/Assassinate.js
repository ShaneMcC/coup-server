export default {
    'name': "Assassinate",
    'hasTarget': true,
    'requiredCoins': 3,
    'canChallenge': true,
    'validCards': ['ASSASSIN'],
    'counterActions': ['BLOCK_ASSASSINATE'],

    process(game, player, target) {
        if (target.influence.length > 0) {
            game.emit('playerMustDiscardInfluence', { player: target.id, reason: 'Assassination' });
        } else {
            game.emit('playerHasNoInfluenceToDiscard', { player: target.id, reason: 'Assassination' });
        }
    },
}