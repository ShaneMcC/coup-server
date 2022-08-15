import EventEmitter from 'events';

export default class CollectableEventBus extends EventEmitter {
    #events;

    constructor() {
        super();
        this.#events = [];
    }

    emit(event, eventBits) {
        this.#events.push(JSON.parse(JSON.stringify({'__type': event, ...eventBits})));
        super.emit(event, eventBits);
    }

    collect() {
        return JSON.parse(JSON.stringify(this.#events));
    }

    clear() {
        this.#events = [];
    }
}