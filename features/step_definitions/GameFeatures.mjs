import { When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import ChallengeTurnState from '../../src/Game/GameStates/ChallengeTurnState.js';

When('{word} wants to claim {word}', async function (player, action) {
    await this.clients[player].socket.clientEmit('action', this.game.gameID(), action).catch(() => {});
});

When('{word} wants to claim {word} on {word}', async function (player, action, target) {
    await this.clients[player].socket.clientEmit('action', this.game.gameID(), action, target).catch(() => {});
});

Then('{word} wants to exchange card {int}', async function (player, card) {
    await this.clients[player].socket.clientEmit('action', this.game.gameID(), 'EXCHANGE', this.game.players()[player].influence[card]).catch(() => {});
});

When('{word} counters with {word}', async function (player, action) {
    await this.clients[player].socket.clientEmit('action', this.game.gameID(), 'COUNTER', action).catch(() => {});
});

When('{word} reveals {word}', async function (player, influence) {
    await this.clients[player].socket.clientEmit('action', this.game.gameID(), 'REVEAL', influence.toUpperCase()).catch(() => {});
});

Then('{word} reveals card {int}', async function (player, card) {
    await this.clients[player].socket.clientEmit('action', this.game.gameID(), 'REVEAL', this.game.players()[player].influence[card]).catch(() => {});
});

When(/([^\s]+) challenges the (Action|Counter)/, async function (player, thing) {
    if (!(this.game.state instanceof ChallengeTurnState)) {
        throw new Error('Game does not require any challenging.');
    }

    if (thing == 'Action' && this.game.GameActions[this.game.state.action] == undefined) {
        throw new Error(`Player is not challenging an action: ${this.game.state.toString()}`)
    } else if (thing == 'Counter' && this.game.GameCounterActions[this.game.state.action] == undefined) {
        throw new Error(`Player is not challenging a counter: ${this.game.state.toString()}`)
    }
    
    await this.clients[player].socket.clientEmit('action', this.game.gameID(), 'CHALLENGE').catch(() => {});
});

When(/all players pass the (Action|Counter)/, async function (thing) {
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
        await this.clients[playerID].socket.clientEmit('action', this.game.gameID(), 'PASS').catch(() => {});
    }
});

When(/([^\s]+) passes the (Action|Counter)/, async function (player, thing) {
    if (!(this.game.state instanceof ChallengeTurnState)) {
        throw new Error('Game does not require any passing.');
    }

    if (thing == 'Action' && this.game.GameActions[this.game.state.action] == undefined) {
        throw new Error(`Player is not passing an action: ${this.game.state.toString()}`)
    } else if (thing == 'Counter' && this.game.GameCounterActions[this.game.state.action] == undefined) {
        throw new Error(`Player is not passing a counter: ${this.game.state.toString()}`)
    }

    await this.clients[player].socket.clientEmit('action', this.game.gameID(), 'PASS').catch(() => {});
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