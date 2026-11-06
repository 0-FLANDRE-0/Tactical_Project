// Presentation-only helpers. No simulation state or calculated results are cached.
const TacticalUICache = (() => {
  function setText(element, value) {
    const text = value == null ? '' : String(value);
    if (element.textContent !== text) element.textContent = text;
  }

  function setHTML(element, value) {
    // Callers must provide their own trusted markup, just as with innerHTML.
    if (element.innerHTML !== value) element.innerHTML = value;
  }

  function createListUpdater(textForItem, textSelector) {
    // Rows retain their markup for their lifetime. New rows get a fresh lookup.
    // Weak keys let removed rows and their cached text nodes be collected.
    const textNodes = new WeakMap();
    return function updateList(rows, items, selectedId) {
      // Rebuild on each update: resets can replace items without changing IDs,
      // and callers may edit/reorder an existing array in place.
      const itemsById = new Map();
      for (const item of items) {
        // Preserve Array.find's first-match behavior for duplicate IDs.
        if (!itemsById.has(item.id)) itemsById.set(item.id, item);
      }
      for (const row of rows) {
        const item = itemsById.get(row.dataset.id);
        const active = item.id === selectedId;
        if (row.classList.contains('active') !== active) row.classList.toggle('active', active);
        if (!textNodes.has(row)) textNodes.set(row, row.querySelector(textSelector));
        setText(textNodes.get(row), textForItem(item));
        const pressed = String(active);
        if (row.getAttribute('aria-pressed') !== pressed) row.setAttribute('aria-pressed', pressed);
      }
    };
  }

  return Object.freeze({ setText, setHTML, createListUpdater });
})();
if (typeof module !== 'undefined') module.exports = TacticalUICache;
