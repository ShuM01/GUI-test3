# Belize Tourism Arrivals — CMPS2212 Final Project

## Overview

You will build an **interactive data table** that lets a user explore Belize tourism arrivals data through search, filters, sorting, and pagination. The application is organized into three decoupled layers using the **Observer Pattern** — the same architecture you used for the Memory Match assessment, applied to a real data-product use case.

This project tests your ability to:

- Apply the Observer Pattern to a real-world data application (not a game).
- Keep filtering/sorting/pagination logic in the data layer, not the UI.
- Write clean functional JavaScript — **no classes**.
- Handle asynchronous data loading with proper states (loading, ready, error).
- Respect a well-defined event contract with rich payloads.
- Build a production-quality table UI with multiple coordinated controls.

**Estimated effort:** ~2 weeks part-time.

---

## The Critical Architectural Rule

There is one rule that separates passing submissions from failing ones:

> **The service filters, searches, sorts, and paginates the data. The UI only renders what the service hands it.**

If you find yourself calling `.filter()`, `.sort()`, or `.slice()` on row data inside `ui.js`, **stop**. You are in the wrong layer. The service publishes a `view:changed` event with a `visibleRows` array that is already filtered, sorted, and paginated. The UI's job is to render that array — nothing else.

This is the single most important lesson of the Observer Pattern: **computation lives with data, presentation lives with the DOM, and events flow between them.**

---

## Architecture

```
   ┌────────────────────┐      emits events      ┌───────────────────┐
   │   dataService.js   │ ─────────────────────▶ │  eventEmitter.js  │
   │   (Data / Logic)   │                        │   (Pub / Sub)     │
   └────────────────────┘                        └─────────┬─────────┘
             ▲                                             │ notifies
             │ method calls                                ▼
             │ (load, setSearch,          ┌───────────────────┐
             │  setFilter, setSort,       │      ui.js        │
             │  setPage, resetView)       │  (View / DOM)     │
             └────────────────────────────│                   │
                                          └───────────────────┘
```

**Three rules that must never be broken:**

1. `dataService.js` must not touch the DOM.
2. `ui.js` must not filter, sort, or paginate data.
3. Service and UI only communicate through the event bus (plus the UI calling service methods on user input).

---

## File Map

| File                 | Status                  | Your job                                  |
| -------------------- | ----------------------- | ----------------------------------------- |
| `index.html`         | Complete                | Read only                                 |
| `styles.css`         | Complete                | Read only                                 |
| `data.json`          | Complete                | Read only (276 rows of tourism data)      |
| `js/eventEmitter.js` | **Complete (gift)**     | Read and understand — same as memory game |
| `js/dataService.js`  | **Skeleton (13 TODOs)** | Implement every `TODO (N)`                |
| `js/ui.js`           | **Skeleton (10 TODOs)** | Implement every `TODO (N)`                |
| `js/main.js`         | Complete                | Read only                                 |

---

## The Event Contract

Your service emits these events. Your UI subscribes to them.

| Event             | Payload        | When                                  |
| ----------------- | -------------- | ------------------------------------- |
| `data:loading`    | `null`         | `load()` starts.                      |
| `data:loaded`     | `{ totalAll }` | Fetch succeeded, `allRows` populated. |
| `data:loadFailed` | `{ message }`  | Fetch or JSON parse failed.           |
| `view:changed`    | (see below)    | Any search/filter/sort/page change.   |

### `view:changed` payload shape

```js
{
  visibleRows:    Row[],      // already filtered, sorted, paginated
  totalAll:       number,     // rows in the full dataset
  totalFiltered:  number,     // rows after search+filter (before pagination)
  page:           number,     // current page (1-based)
  pageCount:      number,     // total pages (at least 1)
  pageSize:       number,
  sortColumn:     string | null,
  sortDirection:  'asc' | 'desc',
}
```

This is a **rich** payload on purpose. One event carries everything the UI needs to re-render completely. You should NOT invent additional events (`sort:changed`, `page:changed`, etc.) — a single `view:changed` after every change is the pattern we want.

---

## Acceptance Criteria

Your submission is complete when all of these pass:

1. Opening `index.html` loads the data and shows the first 20 rows in the table.
2. The status bar shows `Showing 20 of 276 rows`.
3. Typing in the search box filters rows by country (case-insensitive, partial match). Page resets to 1.
4. Selecting a district, purpose, or year from a filter dropdown narrows results. Page resets to 1.
5. Filters stack (district + purpose + year + search all apply together).
6. Clicking a column header sorts by that column:
   - First click: ascending.
   - Same column again: toggles to descending.
   - Different column: switches, resets to ascending.
   - An arrow indicator appears next to the active sort column.
7. The **Month** column sorts in calendar order (January, February, …), not alphabetical.
8. Pagination buttons work: First, Prev, Next, Last.
9. First/Prev are disabled on page 1; Next/Last are disabled on the last page.
10. If filtering/search reduces results to 0 rows, a "No results match" row appears.
11. If current page becomes invalid after filtering (e.g. you were on page 5 and now there are only 2 pages), the page clamps to the new last page (or the service may reset to page 1 — the spec accepts either).
12. The "Reset" button clears all search and filters AND clears the input/select DOM values.
13. DevTools Console shows no errors during any interaction.
14. Viewing the Network tab: `data.json` is fetched exactly once.

---

## Constraints (non-negotiable)

- **Functional JavaScript only.** No `class`, no `this`, no prototypes. Factory functions + closures.
- **ES modules** (`import` / `export`) — don't collapse files together.
- **No external libraries.** Vanilla JS only.
- **No `innerHTML`** for dynamic content. Use `createElement` + `textContent`.
- **Event delegation** on the table header for sort clicks.
- Do not modify `index.html`, `styles.css`, `data.json`, `js/eventEmitter.js`, or `js/main.js`.
- Do not add new event names. Use exactly the names in the contract.
- Do not expose `dataService`'s internal state. The UI only learns about state through event payloads.

---

## Grading Rubric (100 points)

| Area                                      | Points | What we check                                                                                                              |
| ----------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- |
| **Service — load & error handling**       | 8      | `data:loading` → `data:loaded` sequence correct; `data:loadFailed` on failure; `allRows` populated after success.          |
| **Service — search**                      | 6      | Case-insensitive partial match on `country`; empty term shows all; resets to page 1.                                       |
| **Service — filters**                     | 10     | All three filter keys work; stacked filters AND together; empty string clears; year string→number correctly handled.       |
| **Service — sort**                        | 10     | Toggle same column flips direction; new column resets to asc; month uses calendar order; numeric columns sort numerically. |
| **Service — pagination**                  | 8      | Page 1-based; `pageCount ≥ 1` always; `clampPage` keeps in range; last page may be partial.                                |
| **Service — `recomputeAndEmit` pipeline** | 10     | Correct order (search → filter → sort → paginate); single event per change; `allRows` never mutated.                       |
| **Service — event contract**              | 6      | Exact event names used; payload shapes correct; no invented events.                                                        |
| **UI — table rendering**                  | 8      | Correct `<tr>` structure with 7 cells; purpose badge; `num` class on numeric cells; commas on arrivals; empty-state row.   |
| **UI — sort indicators**                  | 4      | Headers toggle `is-sort-asc` / `is-sort-desc` correctly.                                                                   |
| **UI — pagination rendering**             | 4      | Page info text; disabled states correct on edges.                                                                          |
| **UI — controls wiring**                  | 6      | Search, filters, reset button, sort clicks all forward to service.                                                         |
| **UI — subscription & cleanup**           | 6      | All events subscribed via the tracked helper; `unmount()` cleans up DOM listeners and bus subscriptions.                   |
| **UI — event delegation & DOM hygiene**   | 6      | Header click uses `closest()`; `textContent` never `innerHTML`; `DocumentFragment` used when appending many rows.          |
| **Layer discipline**                      | 8      | Service never touches DOM. UI never filters/sorts/paginates. Clean separation.                                             |

**Automatic 0** if you use `class`, `this`, or OOP patterns anywhere in the JS layers.
**Major deduction** if the UI filters/sorts/paginates instead of the service.

---

## Extra Credit (+10 points)

**Row detail modal.** Clicking a table row opens a modal showing the full record; clicking the close button, clicking the backdrop, or pressing Escape closes it.

The skeleton already contains the required markup, CSS, and `BONUS-*` TODOs. If you want the points, implement all of the following:

### Service additions

- **State field** `selectedRowId: number | null` (already in `createInitialState`).
- **Method** `selectRow(id)`:
  - Coerce `id` to a number (may come in as a string from `dataset`).
  - Look up the row in `allRows`. If not found, return silently — no event.
  - Set `state.selectedRowId` and emit `'row:selected'` with `{ row }`.
- **Method** `clearSelection()`:
  - If nothing is selected, return silently (no spurious events).
  - Otherwise set `selectedRowId = null` and emit `'row:deselected'` with `null`.

### UI additions

- Each row's `<tr>` must carry `data-row-id="<id>"` so clicks can be identified via event delegation.
- Click a row (not on an empty-state row) → call `dataService.selectRow(id)`.
- Subscribe to `'row:selected'` → populate fields and show the modal, and add `.is-selected` to the matching `<tr>`.
- Subscribe to `'row:deselected'` → hide the modal and remove `.is-selected`.
- Close triggers: click the × button, click the backdrop (not the panel), or press Escape.
- `unmount()` must detach the new listeners (including the `document` keydown listener).

### Extra Credit Rubric

| Area                                                 | Points | Check                                                                                     |
| ---------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| Service — `selectRow` / `clearSelection` correctness | 3      | Correct events emitted; unknown id is a no-op; clearing nothing is a no-op.               |
| Service — `selectedRowId` state tracking             | 1      | State updated correctly; does not leak out via return object.                             |
| UI — modal rendering from payload                    | 3      | All 8 detail fields populated from `row`; arrivals formatted; `.is-selected` toggled.     |
| UI — close interactions                              | 2      | Close button, backdrop click, AND Escape all work; clicking panel content does NOT close. |
| UI — cleanup                                         | 1      | `unmount()` removes the new listeners (including `document` keydown).                     |

**Full +10 requires all criteria met.** Partial implementations score proportionally. Do NOT leave stub methods in the service if you skip the bonus — that causes silent failures in the UI subscription.

---

## How To Test As You Build

Build in this order:

1. **Read `eventEmitter.js`** — understand the API. You don't need to modify it.
2. **Service first — pure helpers.** Implement `applySearch`, `applyFilters`, `applySort`, `applyPagination`, `computePageCount`, `clampPage`. Test each in isolation in the browser console.
3. **Service — `recomputeAndEmit`.** Once the helpers work, compose them.
4. **Service — public API.** Implement `load`, `setSearch`, `setFilter`, `setSort`, `setPage`, `resetView`. Test from the console:
   ```js
   // With just the service wired to the bus, no UI:
   bus.on("view:changed", (p) => console.log("view changed:", p));
   await svc.load();
   svc.setSearch("united");
   svc.setFilter("district", "Cayo");
   ```
5. **UI — renderers.** Now implement each render function. Visible progress from here.
6. **UI — handlers & subscriptions.** Wire up the clicks and events.

---

## Submission

Submit a ZIP of the project folder containing:

```
tourism-table/
├── index.html
├── styles.css
├── data.json
├── js/
│   ├── eventEmitter.js
│   ├── dataService.js
│   ├── ui.js
│   └── main.js
└── README.md
```

**Filename:** `<LastName>_<FirstName>_CMPS2212_Final.zip`

**Deadline:** See course schedule.

---

## Hints

- **Search resets page to 1, filters reset page to 1, but sort does NOT.** Users expect their page to stick when they re-sort.
- **`pageCount` is always at least 1**, even when there are zero visible rows. This avoids a "Page 1 of 0" display bug.
- **Clamp the page inside `recomputeAndEmit`**, not in the setters. That way filter/search changes that reduce the page count automatically snap back to a valid page.
- **`filters.year` is a STRING** (comes from a `<select>` value). Row.year is a number. `String(row.year) === filters.year` is the fix.
- **The Month column sorts by `MONTH_ORDER` lookup**, not alphabetically. A constant is provided in the skeleton.
- **When there are zero visible rows**, render a single `<tr class="empty-row">` with a colspan=7 `<td>`. Do not leave the tbody empty.
- **Every render function should be idempotent** — calling it twice with the same input produces the same DOM. That means `replaceChildren()` before appending, and clearing sort-indicator classes before adding a new one.
- **Use `DocumentFragment`** when appending many rows at once. Appending 20 nodes one-by-one to a live DOM causes 20 reflows; appending a fragment causes 1.

Good luck. Trust the pattern.
