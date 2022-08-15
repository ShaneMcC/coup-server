import { When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import ChallengeTurnState from '../../src/Game/GameStates/ChallengeTurnState.js';

When('{word} wants to claim {word}', function (player, action) {
    this.clients[player].socket.clientEmit('action', this.game.gameID(), action);
});

When('{word} wants to claim {word} on {word}', function (player, action, target) {
    this.clients[player].socket.clientEmit('action', this.game.gameID(), action, target);
});

Then('{word} wants to exchange card {int}', function (player, card) {
    this.clients[player].socket.clientEmit('action', this.game.gameID(), 'EXCHANGE', this.game.players()[player].influence[card]);
});

When('{word} counters with {word}', function (player, action) {
    this.clients[player].socket.clientEmit('action', this.game.gameID(), 'COUNTER', action);
});

When('{word} reveals {word}', function (player, influence) {
    this.clients[player].socket.clientEmit('action', this.game.gameID(), 'REVEAL', influence.toUpperCase());
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
    
    this.clients[player].socket.clientEmit('action', this.game.gameID(), 'CHALLENGE');
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
        this.clients[playerID].socket.clientEmit('action', this.game.gameID(), 'PASS');
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

    this.clients[player].socket.clientEmit('action', this.game.gameID(), 'PASS');
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