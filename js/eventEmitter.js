// ============================================================================
// eventEmitter.js — Pub/Sub factory (Observer Pattern core)
// ============================================================================
//
// COMPLETE REFERENCE IMPLEMENTATION — provided by instructor.
//
// You used an EventEmitter like this in the memory game. This is the same
// pattern. You do NOT need to modify this file. Your job is to wire the
// DataService and UI layer to this bus via `on`, `off`, and `emit`.
//
// API:
//   const bus = createEventEmitter();
//   bus.on('event:name', payload => { ... });    // subscribe
//   bus.off('event:name', handler);              // unsubscribe
//   bus.emit('event:name', payload);             // publish
//
// Guarantees:
//   - Multiple listeners per event are supported.
//   - `off` removes only the specific listener reference you pass in.
//   - One listener throwing does not prevent others from being called.
//   - Listeners added or removed during an `emit` do not corrupt iteration.
// ============================================================================

export function createEventEmitter() {
  const listeners = Object.create(null);

  function on(eventName, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError(
        `createEventEmitter.on: listener for "${eventName}" must be a function.`
      );
    }
    if (!listeners[eventName]) listeners[eventName] = [];
    listeners[eventName].push(listener);
  }

  function off(eventName, listener) {
    const arr = listeners[eventName];
    if (!arr) return;
    listeners[eventName] = arr.filter((fn) => fn !== listener);
  }

  function emit(eventName, payload) {
    const arr = listeners[eventName];
    if (!arr || arr.length === 0) return;
    const snapshot = arr.slice();
    for (const listener of snapshot) {
      try {
        listener(payload);
      } catch (err) {
        console.error(`[eventEmitter] Listener for "${eventName}" threw:`, err);
      }
    }
  }

  return Object.freeze({ on, off, emit });
}
