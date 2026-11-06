// Synthetic DOM adapter, deliberately limited to list text/classes/attributes.
// Counters record setter/method calls, not browser DOM mutations or layout work.
function createFixture(count) {
  const counts = { textWrites: 0, htmlWrites: 0, attributeWrites: 0, classToggleCalls: 0, queries: 0 };
  const items = Array.from({ length: count }, (_, i) => ({ id: `item-${i}`, state: 'idle', speed: 0 }));
  function makeRow(id) {
    let text = '', html = '';
    const classes = new Set(), attributes = {};
    const subtitle = {
      get textContent() { return text; },
      set textContent(value) { counts.textWrites++; text = value == null ? '' : String(value); },
      get innerHTML() { return html; },
      set innerHTML(value) { counts.htmlWrites++; html = String(value); }
    };
    return {
      dataset: { id }, subtitle,
      classList: {
        contains: name => classes.has(name),
        toggle(name, active) { counts.classToggleCalls++; active ? classes.add(name) : classes.delete(name); }
      },
      querySelector(selector) { if (selector !== '.unit-sub') throw Error('Unexpected selector'); counts.queries++; return subtitle; },
      getAttribute: name => attributes[name] ?? null,
      setAttribute(name, value) { counts.attributeWrites++; attributes[name] = String(value); }
    };
  }
  const rows = items.map(item => makeRow(item.id));
  return {
    rows, items, counts, makeRow,
    resetCounts() { for (const key of Object.keys(counts)) counts[key] = 0; },
    snapshot() { return rows.map(row => ({ id: row.dataset.id, text: row.subtitle.textContent, active: row.classList.contains('active'), pressed: row.getAttribute('aria-pressed') })); }
  };
}
const textForItem = item => item.state + ' · ' + Math.round(item.speed * 3.6) + ' km/h';
// Unmodified roster-update operations from app.js at 86d40b5 (renamed inputs).
function baselineUpdate(rows, items, selectedId) {
  for (const b of rows) {
    const v = items.find(v => v.id === b.dataset.id);
    b.classList.toggle('active', v.id === selectedId);
    b.querySelector('.unit-sub').textContent = textForItem(v);
    b.setAttribute('aria-pressed', v.id === selectedId);
  }
}
module.exports = { createFixture, textForItem, baselineUpdate };
