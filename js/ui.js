// ============================================================================
// ui.js — View Layer (Observer)
// ============================================================================
//
// LAYER RULES
//
//   1. This file is the ONLY place allowed to touch the DOM.
//
//   2. This file MUST NOT filter, search, sort, or paginate anything.
//      That is the service's job. You only render the array the service
//      hands you in each `view:changed` payload. If you call .filter(),
//      .sort(), or .slice() on the visible rows here, you have broken
//      the pattern.
//
//   3. Communicate with the service ONLY by calling its public methods
//      (setSearch, setFilter, setSort, setPage, resetView). Never read
//      service state directly.
//
// ============================================================================
// EVENT SUBSCRIPTIONS YOU WILL WIRE UP
//
//   'data:loading'     → showStatus('Loading…')
//   'data:loaded'      → (typically no-op; view:changed follows immediately)
//   'data:loadFailed'  → showStatus(message, { error: true })
//   'view:changed'     → renderTable(visibleRows),
//                         renderPagination(page, pageCount),
//                         renderSortIndicators(sortColumn, sortDirection),
//                         renderStatus(totalFiltered, totalAll)
//
// ============================================================================

export function createUI(eventBus, dataService, rootEl) {
  // -------------------------------------------------------------------------
  // DOM element cache — resolved on mount.
  // -------------------------------------------------------------------------
  const els = {
    tbody:           null,
    search:          null,
    filterDistrict:  null,
    filterPurpose:   null,
    filterYear:      null,
    resetBtn:        null,
    status:          null,
    statusText:      null,
    pageFirst:       null,
    pagePrev:        null,
    pageNext:        null,
    pageLast:        null,
    pageInfo:        null,
    sortHeaders:     null,  // NodeList

    // --- EXTRA CREDIT: row detail modal ---
    detail:          null,  // the backdrop + panel container
    detailClose:     null,
    detailYear:      null,
    detailMonth:     null,
    detailCountry:   null,
    detailDistrict:  null,
    detailPurpose:   null,
    detailArrivals: null,
    detailStay:      null,
    detailId:        null,
  };

  const subscriptions = [];

  // -------------------------------------------------------------------------
  // Formatting helpers (pure, safe to keep here — not business logic).
  // -------------------------------------------------------------------------
  function formatNumber(n) {
    // 12345 → "12,345"
    return Number(n).toLocaleString('en-US');
  }

  // -------------------------------------------------------------------------
  // RENDERERS
  // -------------------------------------------------------------------------

  /**
   * Build a single table row for a data row. Returns a <tr> element.
   *
   * Expected structure:
   *   <tr>
   *     <td>2024</td>
   *     <td>March</td>
   *     <td>United States</td>
   *     <td>Cayo</td>
   *     <td><span class="purpose-badge">Leisure</span></td>
   *     <td class="num">4,523</td>
   *     <td class="num">6.2</td>
   *   </tr>
   *
   * Security note: use textContent, never innerHTML.
   */
  function buildRowElement(row) {
    const tr = document.createElement('tr');
    tr.dataset.rowId = row.id;

    const tdYear = document.createElement('td');
    tdYear.textContent = row.year;
    tr.appendChild(tdYear);

    const tdMonth = document.createElement('td');
    tdMonth.textContent = row.month;
    tr.appendChild(tdMonth);

    const tdCountry = document.createElement('td');
    tdCountry.textContent = row.country;
    tr.appendChild(tdCountry);

    const tdDistrict = document.createElement('td');
    tdDistrict.textContent = row.district;
    tr.appendChild(tdDistrict);

    const tdPurpose = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'purpose-badge';
    badge.textContent = row.purpose;
    tdPurpose.appendChild(badge);
    tr.appendChild(tdPurpose);

    const tdArrivals = document.createElement('td');
    tdArrivals.className = 'num';
    tdArrivals.textContent = formatNumber(row.arrivals);
    tr.appendChild(tdArrivals);

    const tdStay = document.createElement('td');
    tdStay.className = 'num';
    tdStay.textContent = row.avgStayNights;
    tr.appendChild(tdStay);

    return tr;
  }

  /**
   * Replace tbody contents with rows from the given array.
   * If the array is empty, render a single "no results" row.
   */
  function renderTable(visibleRows) {
    els.tbody.replaceChildren();
    if (visibleRows.length === 0) {
      const tr = document.createElement('tr');
      tr.className = 'empty-row';
      const td = document.createElement('td');
      td.colSpan = 7;
      td.textContent = 'No results match your search and filters.';
      tr.appendChild(td);
      els.tbody.appendChild(tr);
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const row of visibleRows) {
      fragment.appendChild(buildRowElement(row));
    }
    els.tbody.appendChild(fragment);
  }

  /**
   * Update the sort indicator arrows on the <th> elements.
   * Remove .is-sort-asc / .is-sort-desc from ALL headers, then add
   * the correct class to the active header.
   */
  function renderSortIndicators(sortColumn, sortDirection) {
    for (const th of els.sortHeaders) {
      th.classList.remove('is-sort-asc', 'is-sort-desc');
    }
    if (!sortColumn) return;
    const active = els.sortHeaders.item(0).parentElement.querySelector(`[data-sort-column="${sortColumn}"]`);
    if (active) {
      active.classList.add(sortDirection === 'asc' ? 'is-sort-asc' : 'is-sort-desc');
    }
  }

  /**
   * Update the pagination controls.
   *   - Page info: "Page X of Y"
   *   - First/Prev: disabled when on page 1
   *   - Next/Last:  disabled when on last page
   */
  function renderPagination(page, pageCount) {
    els.pageInfo.textContent = `Page ${page} of ${pageCount}`;
    els.pageFirst.disabled = page <= 1;
    els.pagePrev.disabled = page <= 1;
    els.pageNext.disabled = page >= pageCount;
    els.pageLast.disabled = page >= pageCount;
  }

  /**
   * Update the status bar above the table.
   * Example: "Showing 20 of 142 rows (filtered from 276 total)"
   */
  function renderStatus(totalFiltered, totalAll, visibleCount) {
    els.status.classList.remove('is-error');
    let message;
    if (totalFiltered === totalAll) {
      message = `Showing ${formatNumber(visibleCount)} of ${formatNumber(totalAll)} rows`;
    } else {
      message = `Showing ${formatNumber(visibleCount)} of ${formatNumber(totalFiltered)} rows (filtered from ${formatNumber(totalAll)} total)`;
    }
    els.statusText.textContent = message;
  }

  function showStatus(message, opts = {}) {
    els.statusText.textContent = message;
    els.status.classList.toggle('is-error', Boolean(opts.error));
  }

  // ==========================================================================
  //  EXTRA CREDIT: Row Detail Modal Renderers (+5 of the 10 bonus points)
  // --------------------------------------------------------------------------
  //  These render the modal open/closed and populate its fields.
  //  Also highlight the selected row in the table body.
  //
  //  If you skip extra credit, remove these functions AND the bonus
  //  subscriptions below. Leaving empty stubs causes silent bugs.
  // ==========================================================================

  /**
   * Populate the modal fields from a row and make it visible.
   * Also add .is-selected to the corresponding table row (if visible).
   */
  function showDetail(row) {
    els.detailYear.textContent = row.year;
    els.detailMonth.textContent = row.month;
    els.detailCountry.textContent = row.country;
    els.detailDistrict.textContent = row.district;
    els.detailPurpose.textContent = row.purpose;
    els.detailArrivals.textContent = formatNumber(row.arrivals);
    els.detailStay.textContent = `${row.avgStayNights} nights`;
    els.detailId.textContent = row.id;
    els.detail.classList.add('is-visible');
    els.detail.setAttribute('aria-hidden', 'false');
    const selectedRow = els.tbody.querySelector(`tr[data-row-id="${row.id}"]`);
    if (selectedRow) {
      selectedRow.classList.add('is-selected');
    }
  }

  /**
   * Close the modal and clear any row highlight.
   */
  function hideDetail() {
    els.detail.classList.remove('is-visible');
    els.detail.setAttribute('aria-hidden', 'true');
    const selectedRow = els.tbody.querySelector('tr.is-selected');
    if (selectedRow) {
      selectedRow.classList.remove('is-selected');
    }
  }

  // -------------------------------------------------------------------------
  // DOM EVENT HANDLERS — user input → service method calls
  // -------------------------------------------------------------------------

  function onSearchInput(domEvent) {
    dataService.setSearch(domEvent.target.value);
  }

  function onFilterChange(domEvent) {
    const role = domEvent.target.dataset.role;
    const keyMap = {
      'filter-district': 'district',
      'filter-purpose': 'purpose',
      'filter-year': 'year',
    };
    const key = keyMap[role];
    if (key) {
      dataService.setFilter(key, domEvent.target.value);
    }
  }

  function onSortHeaderClick(domEvent) {
    const th = domEvent.target.closest('th[data-sort-column]');
    if (!th) return;
    dataService.setSort(th.dataset.sortColumn);
  }

  function onResetClick() {
    els.search.value = '';
    els.filterDistrict.value = '';
    els.filterPurpose.value = '';
    els.filterYear.value = '';
    dataService.resetView();
  }

  // Pagination handlers — each calls setPage with the right number.
  // `currentPage` and `pageCount` are captured in module-level vars
  // that update on every view:changed. See wireSubscriptions().
  let currentPage = 1;
  let currentPageCount = 1;

  function onPageFirst() { dataService.setPage(1); }
  function onPagePrev()  { dataService.setPage(Math.max(1, currentPage - 1)); }
  function onPageNext()  { dataService.setPage(Math.min(currentPageCount, currentPage + 1)); }
  function onPageLast()  { dataService.setPage(currentPageCount); }

  // ==========================================================================
  //  EXTRA CREDIT: Detail Handlers (+5 of the 10 bonus points)
  // ==========================================================================

  /**
   * Click on the table body — open detail for the clicked row.
   * Uses event delegation on els.tbody (already wired in mount).
   */
  function onRowClick(domEvent) {
    const tr = domEvent.target.closest('tr');
    if (!tr || tr.classList.contains('empty-row')) return;
    const id = Number(tr.dataset.rowId);
    if (isNaN(id)) return;
    dataService.selectRow(id);
  }

  /**
   * Click the close button, or click outside the panel (on the backdrop),
   * or press Escape — any of these should close the modal.
   */
  function onDetailClose() {
    dataService.clearSelection();
  }

  function onDetailBackdropClick(domEvent) {
    // Only close if the click was on the backdrop itself, not the panel.
    if (domEvent.target === els.detail) {
      dataService.clearSelection();
    }
  }

  function onEscapeKey(domEvent) {
    if (domEvent.key === 'Escape' && els.detail.classList.contains('is-visible')) {
      dataService.clearSelection();
    }
  }

  // -------------------------------------------------------------------------
  // SUBSCRIPTION WIRING
  // -------------------------------------------------------------------------

  function subscribe(eventName, handler) {
    eventBus.on(eventName, handler);
    subscriptions.push({ event: eventName, handler });
  }

  function wireSubscriptions() {
    subscribe('data:loading', () => {
      showStatus('Loading tourism data…');
    });

    subscribe('data:loadFailed', ({ message }) => {
      showStatus(`Failed to load data: ${message}`, { error: true });
    });

    subscribe('view:changed', ({ visibleRows, totalFiltered, totalAll, page, pageCount, sortColumn, sortDirection }) => {
      renderTable(visibleRows);
      renderSortIndicators(sortColumn, sortDirection);
      renderPagination(page, pageCount);
      renderStatus(totalFiltered, totalAll, visibleRows.length);
      currentPage = page;
      currentPageCount = pageCount;
    });

    subscribe('row:selected', ({ row }) => {
      showDetail(row);
    });

    subscribe('row:deselected', () => {
      hideDetail();
    });
  }

  // -------------------------------------------------------------------------
  // LIFECYCLE
  // -------------------------------------------------------------------------

  function mount() {
    els.tbody          = rootEl.querySelector('[data-role="tbody"]');
    els.search         = rootEl.querySelector('[data-role="search"]');
    els.filterDistrict = rootEl.querySelector('[data-role="filter-district"]');
    els.filterPurpose  = rootEl.querySelector('[data-role="filter-purpose"]');
    els.filterYear     = rootEl.querySelector('[data-role="filter-year"]');
    els.resetBtn       = rootEl.querySelector('[data-role="reset"]');
    els.status         = rootEl.querySelector('[data-role="status"]');
    els.statusText     = rootEl.querySelector('[data-role="status-text"]');
    els.pageFirst      = rootEl.querySelector('[data-role="page-first"]');
    els.pagePrev       = rootEl.querySelector('[data-role="page-prev"]');
    els.pageNext       = rootEl.querySelector('[data-role="page-next"]');
    els.pageLast       = rootEl.querySelector('[data-role="page-last"]');
    els.pageInfo       = rootEl.querySelector('[data-role="page-info"]');
    els.sortHeaders    = rootEl.querySelectorAll('[data-role="sort-header"]');

    // --- EXTRA CREDIT: modal elements ---
    els.detail         = rootEl.querySelector('[data-role="row-detail"]');
    els.detailClose    = rootEl.querySelector('[data-role="detail-close"]');
    els.detailYear     = rootEl.querySelector('[data-role="detail-year"]');
    els.detailMonth    = rootEl.querySelector('[data-role="detail-month"]');
    els.detailCountry  = rootEl.querySelector('[data-role="detail-country"]');
    els.detailDistrict = rootEl.querySelector('[data-role="detail-district"]');
    els.detailPurpose  = rootEl.querySelector('[data-role="detail-purpose"]');
    els.detailArrivals = rootEl.querySelector('[data-role="detail-arrivals"]');
    els.detailStay     = rootEl.querySelector('[data-role="detail-stay"]');
    els.detailId       = rootEl.querySelector('[data-role="detail-id"]');

    // Attach DOM listeners.
    els.search.addEventListener('input',   onSearchInput);
    els.filterDistrict.addEventListener('change', onFilterChange);
    els.filterPurpose.addEventListener('change',  onFilterChange);
    els.filterYear.addEventListener('change',     onFilterChange);
    els.resetBtn.addEventListener('click', onResetClick);

    // Event delegation on the table head for sort clicks.
    const thead = rootEl.querySelector('.data-table thead');
    thead.addEventListener('click', onSortHeaderClick);

    // Event delegation on the tbody for row clicks (extra credit).
    els.tbody.addEventListener('click', onRowClick);

    els.pageFirst.addEventListener('click', onPageFirst);
    els.pagePrev.addEventListener('click',  onPagePrev);
    els.pageNext.addEventListener('click',  onPageNext);
    els.pageLast.addEventListener('click',  onPageLast);

    // --- EXTRA CREDIT: modal listeners ---
    els.detailClose.addEventListener('click', onDetailClose);
    els.detail.addEventListener('click',      onDetailBackdropClick);
    document.addEventListener('keydown',      onEscapeKey);

    // Subscribe to service events.
    wireSubscriptions();
  }

  function unmount() {
    els.search.removeEventListener('input',   onSearchInput);
    els.filterDistrict.removeEventListener('change', onFilterChange);
    els.filterPurpose.removeEventListener('change',  onFilterChange);
    els.filterYear.removeEventListener('change',     onFilterChange);
    els.resetBtn.removeEventListener('click', onResetClick);

    const thead = rootEl.querySelector('.data-table thead');
    thead.removeEventListener('click', onSortHeaderClick);

    els.tbody.removeEventListener('click', onRowClick);

    els.pageFirst.removeEventListener('click', onPageFirst);
    els.pagePrev.removeEventListener('click',  onPagePrev);
    els.pageNext.removeEventListener('click',  onPageNext);
    els.pageLast.removeEventListener('click',  onPageLast);

    els.detailClose.removeEventListener('click', onDetailClose);
    els.detail.removeEventListener('click',      onDetailBackdropClick);
    document.removeEventListener('keydown',      onEscapeKey);

    subscriptions.forEach(({ event, handler }) => eventBus.off(event, handler));
    subscriptions.length = 0;
  }

  return Object.freeze({ mount, unmount });
}
