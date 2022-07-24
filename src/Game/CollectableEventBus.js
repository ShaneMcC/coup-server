import EventEmitter from 'events';

export default class CollectableEventBus extends EventEmitter {
    #events;
    #game;

    constructor(game) {
        super();
        this.#game = game;
        this.#events = [];
    }

    emit(event, eventBits) {
        if (eventBits == undefined) { eventBits = {}; }
        
        if (!eventBits['date']) {
            eventBits['date'] = new Date();
        }

        this.#events.push(JSON.parse(JSON.stringify({'__type': event, ...eventBits})));
        this.#game.log(`EVENT: ${event} -> ${JSON.stringify(eventBits)}`);
        
        super.emit(event, eventBits);
    }

    collect() {
        return this.#events;
    }

    clear() {
        this.#events = [];
    }
}