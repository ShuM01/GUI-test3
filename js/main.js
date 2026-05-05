// ============================================================================
// main.js — Composition root
// ============================================================================
//
// READ ONLY. You do not need to modify this file to complete the assignment.
//
// Wiring:
//     eventBus    ←  dataService   (service publishes)
//     eventBus    ←  ui            (ui subscribes)
//     ui          →  dataService   (ui calls service methods on user input)
//
// Service and UI are decoupled — they only know about the bus.
// ============================================================================

import { createEventEmitter } from './eventEmitter.js';
import { createDataService }  from './dataService.js';
import { createUI }           from './ui.js';

const eventBus    = createEventEmitter();
const dataService = createDataService(eventBus, './data.json');
const ui          = createUI(eventBus, dataService, document.body);

ui.mount();
dataService.load();
