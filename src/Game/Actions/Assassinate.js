export default {
    'name': "Assassinate",
    'hasTarget': true,
    'requiredCoins': 3,
    'canChallenge': true,
    'validCards': ['ASSASSIN'],
    'counterActions': ['BLOCK_ASSASSINATE'],

    process(game, playerid, targetid) {
        if (game.players()[targetid].influence.length > 0) {
            game.emit('playerMustDiscardInfluence', { player: targetid, reason: 'Assassination' });
        } else {
            game.emit('playerHasNoInfluenceToDiscard', { player: targetid, reason: 'Assassination' });
        }
    },
}