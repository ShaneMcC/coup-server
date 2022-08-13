export default {
    'name': "Exchange",
    'canChallenge': true,
    'validCards': ['AMBASSADOR'],

    process(game, playerid) {
        // Give the player 2 additional cards
        game.emit('allocateNextInfluence', { 'player': playerid });
        game.emit('allocateNextInfluence', { 'player': playerid });

        // They need to silently discard 2 of them
        game.emit('playerExchangingCards', {player: playerid, count: 2});
    },
}