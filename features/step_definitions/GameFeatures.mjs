import { When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import ChallengeTurnState from '../../src/Game/GameStates/ChallengeTurnState.js';

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

When(/([^\s]+) challenges the (Action|Counter)/, function (player, thing) {
    if (!(this.game.state instanceof ChallengeTurnState)) {
        throw new Error('Game does not require any challenging.');
    }

    if (thing == 'Action' && this.game.GameActions[this.game.state.action] == undefined) {
        throw new Error(`Player is not challenging an action: ${this.game.state.toString()}`)
    } else if (thing == 'Counter' && this.game.GameCounterActions[this.game.state.action] == undefined) {
        throw new Error(`Player is not challenging a counter: ${this.game.state.toString()}`)
    }
    
    this.game.doPlayerAction(player, 'CHALLENGE');
});

When(/all players pass the (Action|Counter)/, function (thing) {
    if (!(this.game.state instanceof ChallengeTurnState)) {
        throw new Error('Game does not require any passing.');
    }

    if (thing == 'Action' && this.game.GameActions[this.game.state.action] == undefined) {
        throw new Error(`Player is not passing an action: ${this.game.state.toString()}`)
    } else if (thing == 'Counter' && this.game.GameCounterActions[this.game.state.action] == undefined) {
        throw new Error(`Player is not passing a counter: ${this.game.state.toString()}`)
    }
    
    const playersToPass = Object.keys(this.game.state.canChallenge).length > 0 ? this.game.state.canChallenge : this.game.state.canCounter;

    if (Object.keys(playersToPass).length == 0) {
        throw new Error(`There is no one waiting on passing the ${thing}`)
    }

    for (const [playerID, _] of Object.entries(playersToPass)) {
        this.game.doPlayerAction(playerID, 'PASS');
    }
});

When(/([^\s]+) passes the (Action|Counter)/, function (player, thing) {
    if (!(this.game.state instanceof ChallengeTurnState)) {
        throw new Error('Game does not require any passing.');
    }

    if (thing == 'Action' && this.game.GameActions[this.game.state.action] == undefined) {
        throw new Error(`Player is not passing an action: ${this.game.state.toString()}`)
    } else if (thing == 'Counter' && this.game.GameCounterActions[this.game.state.action] == undefined) {
        throw new Error(`Player is not passing a counter: ${this.game.state.toString()}`)
    }
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