import EventEmitter from 'events';

export default class CollectableEventBus extends EventEmitter {
    #events;
    #game;

    #clientEventBus = new EventEmitter();

    constructor(game) {
        super();
        this.#game = game;
        this.#events = [];
        this.#clientEventBus.setMaxListeners(0);
    }

    emit(event, eventBits) {
        if (eventBits == undefined) { eventBits = {}; }
        
        if (!eventBits['date']) {
            eventBits['date'] = new Date();
        }

        if (this.#game.gameID() && (!eventBits['game'] || eventBits['game'] != this.#game.gameID())) {
            eventBits['game'] = this.#game.gameID();
        }

        this.#events.push(JSON.parse(JSON.stringify({'__type': event, ...eventBits})));
        this.#game.log(`EVENT: ${event} -> ${JSON.stringify(eventBits)}`);
        
        super.emit(event, eventBits);

        this.#clientEventBus.emit('handleEvent', JSON.parse(JSON.stringify({'__type': event, ...eventBits})));
    }

    collect() {
        return this.#events;
    }

    clear() {
        this.#events = [];
    }

    addClientHandler(handler) {
        this.#clientEventBus.on('handleEvent', handler);
    }

    removeClientHandler(handler) {
        this.#clientEventBus.removeListener('handleEvent', handler);
    }
    
    removeAllClientHandlers() {
        this.#clientEventBus.removeAllListeners('handleEvent');
    }
}