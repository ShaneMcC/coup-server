import { When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'

When('{word} wants to claim {word}', function (player, action) {
    this.game.doPlayerAction(player, action);
});

When('{word} wants to try to claim {word}', function (player, action) {
    try {
        this.game.doPlayerAction(player, action);
    } catch (e) { }
});

When('{word} wants to claim {word} on {word}', function (player, action, target) {
    this.game.doPlayerAction(player, action, target);
});

When('{word} wants to try to claim {word} on {word}', function (player, action, target) {
    try {
        this.game.doPlayerAction(player, action, target);
    } catch (e) { }
});

Then('{word} wants to exchange card {int}', function (player, card) {
    this.game.doPlayerAction(player, 'EXCHANGE', this.game.players()[player].influence[card]);
});

When('{word} counters with {word}', function (player, action) {
    this.game.doPlayerAction(player, 'COUNTER', action);
});

When('{word} reveals {word}', function (player, influence) {
    this.game.doPlayerAction(player, 'REVEAL', influence.toUpperCase());
});

When('{word} challenges', function (player) {
    this.game.doPlayerAction(player, 'CHALLENGE');
});

When('all players pass', function () {
    // TODO: We should only pass the correct players

    for (const [playerID, _] of Object.entries(this.game.players())) {
        try {
            this.game.doPlayerAction(playerID, 'PASS');
        } catch (e) { }
    }
});

When('{word} passes', function (player) {
    this.game.doPlayerAction(player, 'PASS');
});

Then('{word} has {int} coins remaining', function (player, coins) {
    assert(this.game.players()[player].coins == coins)
});

Then('{word} has at least {int} coins remaining', function (player, coins) {
    assert(this.game.players()[player].coins >= coins)
});

Then('{word} has {int} influence remaining', function (player, coins) {
    assert(this.game.players()[player].influence.length == coins)
});