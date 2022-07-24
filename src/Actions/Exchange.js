export default {
    'name': "Exchange",
    'canChallenge': true,
    'validCards': ['AMBASSADOR'],

    process(game, player) {
        // Give the player 2 additional cards
        game.emit('allocateNextInfluence', { 'player': player });
        game.emit('allocateNextInfluence', { 'player': player });

        // They need to silently discard 2 of them
        game.emit('playerExchangingCards', {player: player});
    },
}