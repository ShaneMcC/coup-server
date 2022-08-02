import Crypto from 'crypto';
import CollectableEventBus from './CollectableEventBus.js';

import GameState from './GameStates/GameState.js';
import NewGameState from './GameStates/NewGameState.js';
import PlayerTurnState from './GameStates/PlayerTurnState.js';
import ChallengeTurnState from './GameStates/ChallengeTurnState.js';
import PlayerChallengedTurnState from './GameStates/PlayerChallengedTurnState.js';
import PlayerMustDiscardTurnState from './GameStates/PlayerMustDiscardTurnState.js';
import PlayerExchangingCardsTurnState from './GameStates/PlayerExchangingCardsTurnState.js';
import GameOverState from './GameStates/GameOverState.js';

export default class Game {
    #gameDeck = [];
    #players = {};
    #playerIDs = [];
    #currentPlayerNumber = -1;

    #gameEvents = new CollectableEventBus(this);
    state = new NewGameState(this);

    #gameID = '';
    #nextGameID = undefined;

    started = false;
    ended = false;
    createdAt = new Date(0);
    debug = false;

    constructor() {
        this.addHandlers();
    }

    log(...args) {
        if (this.debug) { console.log(...args); }
    }

    createGame(gameid) {
        if (gameid == undefined) { gameid = Crypto.randomUUID(); }
        this.emit('gameCreated', { game: gameid });
    }

    endGame(reason) {
        this.emit('gameEnded', { reason: reason });
    }

    gameID() {
        return this.#gameID;
    }

    nextGameID() {
        return this.#nextGameID;
    }

    nextGameAvailable(gameid) {
        if (gameid != undefined) {
            this.emit('nextGameAvailable', { nextGameID: gameid });
        }
    }

    hydrate(events) {
        events.forEach(e => {
            var eventType = e['__type'];
            delete e['__type'];
            this.emit(eventType, e);
        });
    }

    emit(event, ...args) {
        this.#gameEvents.emit(event, ...args);
    }

    listen(handler) {
        this.#gameEvents.addClientHandler(handler);
    }

    unlisten(handler) {
        this.#gameEvents.removeClientHandler(handler);
    }

    unlistenAll() {
        this.#gameEvents.removeAllClientHandlers();
    }

    addPlayer(name) {
        if (this.started) { return undefined; }

        var playerID;
        do {
            playerID = Crypto.randomUUID();
        } while (this.#players[playerID]);

        this.emit('addPlayer', { 'id': playerID, 'name': name });

        return playerID;
    }

    removePlayer(playerID, reason) {
        if (this.started) { return false; }

        this.emit('removePlayer', { 'id': playerID, 'reason': reason });
    }

    doPlayerAction(playerid, action, target) {
        this.log('Player Action: ', [playerid, action, target])

        if (action == 'CHAT') {
            if (!this.#players[playerid]) {
                return [false, 'Player is not in this game.'];
            }

            this.chatMessage(playerid, target);
            return;
        }

        var [result, reason] = this.state.handlePlayerAction(playerid, action, target);

        if (!result) {
            throw new Error(`doPlayerAction failed: ${reason}`)
        }
    }

    getGameDeck() {
        return [...this.#gameDeck];
    }

    getShuffledDeck(currentDeck) {
        if (currentDeck == undefined) { currentDeck = this.getGameDeck(); }
        var deck = [...currentDeck];

        // https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    }

    collectEvents() {
        return this.#gameEvents.collect();
    }

    clearEvents() {
        return this.#gameEvents.clear();
    }

    players() {
        return JSON.parse(JSON.stringify(this.#players));
    }

    #advancePlayer() {
        for (var i = 0; i < Object.entries(this.#players).length; i++) {
            this.#currentPlayerNumber++;
            if (this.#currentPlayerNumber >= Object.entries(this.#players).length) { this.#currentPlayerNumber = 0; }

            if (this.#players[this.currentPlayerID()].influence.length > 0) {
                return true;
            }
        }

        throw new Error('No valid players found.');
    }

    startNextTurn() {
        this.#advancePlayer();

        var validPlayers = 0;
        for (const [_, player] of Object.entries(this.#players)) {
            if (player.influence.length > 0) {
                validPlayers++;
            }
        }

        if (validPlayers == 1) {
            this.emit('gameOver', { 'winner': this.currentPlayerID() });
        } else {
            this.emit('beginPlayerTurn', { 'player': this.currentPlayerID() });
        }
    }

    currentPlayerID() {
        return this.#playerIDs[this.#currentPlayerNumber];
    }

    adminMessage(message) {
        this.emit('adminMessage', { message: message });
    }

    serverMessage(message) {
        this.emit('serverMessage', { message: message });
    }

    chatMessage(playerid, message) {
        this.emit('chatMessage', { player: playerid, message: message });
    }

    addHandlers() {
        this.#gameEvents.on('gameCreated', event => {
            this.#gameID = event.game;
            this.createdAt = event.date;
        });

        this.#gameEvents.on('addPlayer', event => {
            this.#players[event.id] = { 'id': event.id, 'name': event.name, 'coins': 0, 'influence': [] };

            this.#playerIDs.push(event.id);
        });

        this.#gameEvents.on('removePlayer', event => {
            delete this.#players[event.id];
            this.#playerIDs.splice(this.#playerIDs.indexOf(event.id), 1);
        });

        this.#gameEvents.on('setPlayerName', event => {
            this.#players[event.player]['name'] = event.name;
        });

        this.#gameEvents.on('playerReady', event => {
            this.#players[event.player]['ready'] = true;
        });

        this.#gameEvents.on('playerNotReady', event => {
            this.#players[event.player]['ready'] = false;
        });

        this.#gameEvents.on('startGame', event => {
            this.started = true;
            this.#currentPlayerNumber = -1;
        });

        this.#gameEvents.on('setDeck', event => {
            this.#gameDeck = event.deck;
        });

        // TODO: I don't like this event
        this.#gameEvents.on('allocateNextInfluence', event => {
            this.#players[event.player].influence.push(this.#gameDeck.shift());
        });

        this.#gameEvents.on('allocateInfluence', event => {
            var influenceLocation = this.#gameDeck.indexOf(event.influence);
            if (influenceLocation == -1) {
                throw new Error('Unable to allocate influence.');
            }

            this.#players[event.player].influence.push(event.influence);
            this.#gameDeck.splice(influenceLocation, 1);
        });

        const discardInfluenceHandler = event => {
            var influenceLocation = this.#players[event.player].influence.indexOf(event.influence);
            if (influenceLocation == -1) {
                throw new Error(`Unable to discard ${event.influence}.`);
            }

            this.#players[event.player].influence.splice(influenceLocation, 1);
        };

        this.#gameEvents.on('discardInfluence', discardInfluenceHandler);

        this.#gameEvents.on('returnInfluenceToDeck', event => {
            discardInfluenceHandler(event);
            this.#gameDeck.push(event.influence);
        });

        this.#gameEvents.on('returnKnownInfluenceToDeck', event => {
            discardInfluenceHandler(event);
            this.#gameDeck.push(event.influence);
        });

        this.#gameEvents.on('gameReady', event => {
            this.state = new GameState(this);
        });

        this.#gameEvents.on('beginPlayerTurn', event => {
            this.#currentPlayerNumber = Object.keys(this.#players).indexOf(event.player);

            this.state = new PlayerTurnState(this, this.#players[event.player]);
        });

        this.#gameEvents.on('challengeablePlayerAction', event => {
            this.state = new ChallengeTurnState(this, this.#players[event.player], event.action, this.#players[event.target]);
        });

        this.#gameEvents.on('counterablePlayerAction', event => {
            this.state = new ChallengeTurnState(this, this.#players[event.player], event.action, this.#players[event.target]);
        });

        this.#gameEvents.on('playerCountered', event => {
            this.state = new ChallengeTurnState(this, this.#players[event.challenger], event.counter, this.#players[event.player], this.state);
        });

        this.#gameEvents.on('playerChallenged', event => {
            this.state = new PlayerChallengedTurnState(this, this.#players[event.player], event.action, this.#players[event.challenger], this.state);
        });

        this.#gameEvents.on('playerMustDiscardInfluence', event => {
            this.state = new PlayerMustDiscardTurnState(this, this.#players[event.player], this.state);
        });

        this.#gameEvents.on('playerExchangingCards', event => {
            this.state = new PlayerExchangingCardsTurnState(this, this.#players[event.player], event.count ? event.count : 2);
        });

        this.#gameEvents.on('playerGainedCoins', event => {
            this.#players[event.player].coins += parseInt(event.coins);
        });

        this.#gameEvents.on('playerLostCoins', event => {
            this.#players[event.player].coins -= parseInt(event.coins);
        });

        this.#gameEvents.on('playerSpentCoins', event => {
            this.#players[event.player].coins -= parseInt(event.coins);
        });

        this.#gameEvents.on('gameOver', event => {
            this.state = new GameOverState(this, event);
            this.ended = true;
        });

        this.#gameEvents.on('gameEnded', event => {
            this.state = new GameOverState(this, event);
            this.ended = true;
        });

        this.#gameEvents.on('nextGameAvailable', event => {
            this.#nextGameID = event.nextGameID;
        });
    }
}