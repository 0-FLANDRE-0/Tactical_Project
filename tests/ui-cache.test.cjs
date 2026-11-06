const test = require('node:test');
const assert = require('node:assert/strict');
const { setText, setHTML, createListUpdater } = require('../src/ui-cache.js');
const { createFixture, textForItem, baselineUpdate } = require('./helpers/ui-fixture.cjs');
const makeUpdater = () => createListUpdater(textForItem, '.unit-sub');
function compare(fixture, selectedId, update) {
  const expected = createFixture(0);
  expected.items = fixture.items;
  for (const row of fixture.rows) expected.rows.push(expected.makeRow(row.dataset.id));
  baselineUpdate(expected.rows, expected.items, selectedId);
  update(fixture.rows, fixture.items, selectedId);
  assert.deepEqual(fixture.snapshot(), expected.snapshot());
}
test('text writes are deduplicated after DOM string conversion', () => {
  const f = createFixture(1), el = f.rows[0].subtitle;
  setText(el, 42); setText(el, '42');
  assert.equal(el.textContent, '42'); assert.equal(f.counts.textWrites, 1);
  setText(el, null); setText(el, undefined);
  assert.equal(el.textContent, ''); assert.equal(f.counts.textWrites, 2);
});
test('external text changes do not leave a stale value cache', () => {
  const f = createFixture(1), el = f.rows[0].subtitle;
  setText(el, 'expected'); el.textContent = 'other'; setText(el, 'expected');
  assert.equal(el.textContent, 'expected'); assert.equal(f.counts.textWrites, 3);
});
test('trusted HTML is only reassigned when markup changes', () => {
  const f = createFixture(1), el = f.rows[0].subtitle;
  setHTML(el, '<strong>hello</strong>'); setHTML(el, '<strong>hello</strong>');
  assert.equal(f.counts.htmlWrites, 1);
  el.innerHTML = 'changed'; setHTML(el, '<strong>hello</strong>');
  assert.equal(el.innerHTML, '<strong>hello</strong>');
});
for (const count of [50, 100]) {
  test(`${count} synthetic items match baseline and skip unchanged updates`, () => {
    const f = createFixture(count), update = makeUpdater();
    compare(f, f.items[0].id, update);
    f.resetCounts();
    for (let i = 0; i < 20; i++) compare(f, f.items[0].id, update);
    assert.deepEqual(f.counts, { textWrites: 0, htmlWrites: 0, attributeWrites: 0, classToggleCalls: 0, queries: 0 });
  });
}
test('selection only changes the previous and new active rows', () => {
  const f = createFixture(50), update = makeUpdater();
  compare(f, f.items[0].id, update); f.resetCounts();
  compare(f, f.items[49].id, update);
  assert.deepEqual(f.counts, { textWrites: 0, htmlWrites: 0, attributeWrites: 2, classToggleCalls: 2, queries: 0 });
});
test('in-place item changes update only changed display strings', () => {
  const f = createFixture(50), update = makeUpdater();
  compare(f, f.items[0].id, update); f.resetCounts();
  f.items[3].speed = .01; compare(f, f.items[0].id, update);
  assert.equal(f.counts.textWrites, 0);
  f.items[3].speed = 2; f.items[4].state = 'busy';
  compare(f, f.items[0].id, update); assert.equal(f.counts.textWrites, 2);
});
test('reset replaces records with the same IDs without stale state', () => {
  const f = createFixture(100), update = makeUpdater();
  compare(f, f.items[99].id, update);
  f.items = f.items.map(item => ({ ...item, state: 'replaced', speed: 3 }));
  compare(f, f.items[0].id, update);
  f.items[0] = { ...f.items[0], state: 'replaced again' };
  compare(f, f.items[0].id, update);
});
test('reordering and duplicate IDs retain Array.find first-match behavior', () => {
  const f = createFixture(50), update = makeUpdater();
  compare(f, f.items[0].id, update);
  f.items.reverse(); f.rows.reverse();
  f.items.unshift({ ...f.items[0], state: 'first match' });
  compare(f, f.items[0].id, update);
  assert.equal(f.rows[0].subtitle.textContent, 'first match · 0 km/h');
});
test('new rows and removed rows do not reuse another row cache', () => {
  const f = createFixture(2), update = makeUpdater();
  compare(f, f.items[0].id, update); f.resetCounts();
  f.rows[0] = f.makeRow(f.items[0].id); f.rows.pop();
  compare(f, f.items[0].id, update);
  assert.equal(f.counts.queries, 1);
});
test('external selection and label changes are repaired on the next update', () => {
  const f = createFixture(2), update = makeUpdater();
  compare(f, f.items[0].id, update);
  f.rows[0].classList.toggle('active', false);
  f.rows[0].setAttribute('aria-pressed', false);
  f.rows[0].subtitle.textContent = 'changed elsewhere';
  compare(f, f.items[0].id, update);
});
test('list updates leave all item values unchanged', () => {
  const f = createFixture(100), before = structuredClone(f.items);
  for (const item of f.items) Object.freeze(item);
  Object.freeze(f.items);
  compare(f, f.items[1].id, makeUpdater()); assert.deepEqual(f.items, before);
});
