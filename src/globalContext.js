import EventEmitter from 'events';

export const globalContext = {}
globalContext.events = new EventEmitter();