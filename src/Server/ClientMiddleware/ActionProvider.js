import ClientMiddleware from './ClientMiddleware.js';

export default class ActionProvider extends ClientMiddleware {
    #server;
    #gameID;
    #socketHandler;
    #playerID;

    #lastActions = {};
    #sendActions = false;
    #myPlayerMask = '';

    constructor(server, socketHandler, gameID, playerID) {
        super(server, socketHandler, gameID, playerID);

        this.#server = server;
        this.#socketHandler = socketHandler;
        this.#gameID = gameID;
        this.#playerID = playerID;
    }

    preLoadGame() {
        this.#sendActions = false;
    }

    postLoadGame() {
        this.#sendActions = true;
        this.showActions(this.#lastActions);
    }

    showActions(actions) {
        this.#lastActions = actions;

        // Only actually show actions once the game has loaded.
        // Saves us sending generated-events that we don't need to.
        if (this.#sendActions) {
            this.#socketHandler.emitEvent('handleGameEvent', {
                '__type': 'showActions',
                'game': this.#gameID,
                'player': this.#myPlayerMask,
                'date': new Date(),
                'actions': (actions ? actions : {})
            });
        }
    }

    validAction(validCards, playerInfluence) {
        // If validcards is undefined, then anyone can do the action
        if (validCards == undefined) { return true; }
        
        // If validCards is empty, no one can do the action.
        if (validCards.length == 0) { return false; }

        // Now go through all the influence the player has, and if they
        // are considered valid, then allow the action.
        if (playerInfluence?.length > 0) {
            for (const i of playerInfluence) {
                if (validCards.indexOf(i) > -1) {
                    return true;
                }
            }
        }

        // Player had no valid cards
        return false;
    }

    postEmitHandler(event) {
        if (!this.enabled()) { return; }

        var thisGame = this.#server.getGame(event.game);
        var thisGamePlayers = thisGame?.players();

        if (event.__type == 'addPlayer' && event.self) {
            this.#myPlayerMask = event.id;
        }

        if (event.__type == 'addPlayer' || event.__type == 'removePlayer' || event.__type == 'playerReady' || event.__type == 'playerNotReady') {
            var pregameActions = {};

            if (thisGamePlayers[this.#playerID]) {
                if (thisGamePlayers[this.#playerID].ready) {
                    pregameActions['UNREADY'] = { name: "Not Ready" };
                } else {
                    pregameActions['READY'] = { name: "Ready" };
                }

                pregameActions['SETNAME'] = { name: 'Change Name', prompt: 'Enter new name' };

                if (Object.values(thisGamePlayers).filter(p => !p.ready).length == 0) {
                    pregameActions['STARTGAME'] = { name: "Start Game" };
                }
            }

            this.showActions(pregameActions);
        }

        if (event.__type == 'startGame') {
            this.showActions({});
        }

        if (event.__type == 'gameOver' || event.__type == 'gameEnded') {
            this.showActions({});
        }

        if (event.__type == 'beginPlayerTurn') {
            if (event.player == this.#myPlayerMask) {
                if (thisGamePlayers[this.#playerID].coins >= 10) {
                    this.showActions({'COUP': thisGame.GameActions.COUP});
                } else {
                    const displayActions = JSON.parse(JSON.stringify(thisGame.GameActions));
                    for (const a in displayActions) {
                        displayActions[a].name += this.validAction(displayActions[a].validCards, thisGamePlayers[this.#playerID].influence) ? '' : ' (Bluff)';
                    }
                    this.showActions(displayActions);
                }
            } else {
                this.showActions({});
            }
        }

        if (event.__type == 'challengeablePlayerAction' || event.__type == 'counterablePlayerAction' || event.__type == 'playerActionStillCounterable') {
            if (event.player == this.#myPlayerMask || (thisGamePlayers[this.#playerID] && thisGamePlayers[this.#playerID].influence.length == 0)) {
                this.showActions({});
            } else {
                var displayActions = {'PASS': { name: 'Allow' }};

                if (event.__type == 'challengeablePlayerAction') {
                    displayActions['CHALLENGE'] = { name: 'Challenge' };
                } else if (event.__type == 'counterablePlayerAction' && thisGame.GameActions[event.action].validCards?.length > 0) {
                    displayActions['CHALLENGE'] = { name: 'Challenge' };
                }

                if (thisGame.GameActions[event.action]?.counterActions && (thisGame.GameActions[event.action].anyoneCanCounter || event.target == this.#myPlayerMask)) {
                    for (const ca of thisGame.GameActions[event.action].counterActions) {
                        displayActions[ca] = {
                            name: thisGame.GameCounterActions[ca].name + (this.validAction(thisGame.GameCounterActions[ca].validCards, thisGamePlayers[this.#playerID].influence) ? '' : ' (Bluff)'),
                            target: ca,
                            action: 'COUNTER',
                            validCards: thisGame.GameCounterActions[ca].validCards,
                        }
                    }
                }

                if (!event.players || event.players.indexOf(this.#myPlayerMask) > -1) {
                    this.showActions(displayActions);
                } else {
                    this.showActions({});
                }
            }
        }

        if (event.__type == 'playerPassed' && event.player == this.#myPlayerMask) {
            this.showActions({});
        }

        if (event.__type == 'playerChallenged') {
            if (event.player == this.#myPlayerMask) {
                this.showActions({ 'REVEAL': { name: 'Reveal Influence', options: thisGamePlayers[this.#playerID].influence } });
            } else {
                this.showActions({});
            }
        }

        if (event.__type == 'playerCountered') {
            if (event.challenger == this.#myPlayerMask || (thisGamePlayers[this.#playerID] && thisGamePlayers[this.#playerID].influence.length == 0)) {
                this.showActions({});
            } else {
                var displayActions = {'PASS': { name: 'Allow' }, 'CHALLENGE': { name: 'Challenge' }};
                this.showActions(displayActions);
            }
        }

        if (event.__type == 'playerMustDiscardInfluence' && event.player != this.#myPlayerMask) {
            this.showActions({});
        }

        if (event.__type == 'playerPerformedAction' && event.player == this.#myPlayerMask) {
            this.showActions({});
        }

        if (event.__type == 'playerPassedChallenge' && event.player == this.#myPlayerMask) {
            this.showActions({});
        }

        if (event.__type == 'playerFailedChallenge' && event.player == this.#myPlayerMask) {
            this.showActions({});
        }

        if (event.__type == 'playerMustDiscardInfluence' && event.player == this.#myPlayerMask) {
            this.showActions({ 'REVEAL': { name: 'Discard Influence', oneTime: true, options: thisGamePlayers[this.#playerID].influence } });
        }

        if (event.__type == 'playerFinishedDiscardingInfluence' && event.player == this.#myPlayerMask) {
            this.showActions({});
        }

        if (event.__type == 'playerExchangingCards' && event.player == this.#myPlayerMask) {
            this.showActions({ 'EXCHANGE': { name: 'Discard Influence', oneTime: true, options: thisGamePlayers[this.#playerID].influence } });
        }

        if (event.__type == 'playerFinishedExchangingCards' && event.player == this.#myPlayerMask) {
            this.showActions({});
        }
    }
}