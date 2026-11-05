#!/usr/bin/env node
// Synthetic presentation microbenchmark. This does not measure game FPS or LOS.
const assert = require('node:assert/strict');
const os = require('node:os');
const { performance } = require('node:perf_hooks');
const { createListUpdater } = require('../src/ui-cache.js');
const { createFixture, textForItem, baselineUpdate } = require('../tests/helpers/ui-fixture.cjs');
const warmup = 200, iterations = 2000, samples = 9;
const makeUpdater = () => createListUpdater(textForItem, '.unit-sub');
function advance(fixture, tick, mode) {
  if (mode === 'changing') {
    const item = fixture.items[tick % fixture.items.length];
    item.state = tick % 2 ? 'busy' : 'idle';
    item.speed = (tick % 13) / 2;
  }
  return fixture.items[mode === 'changing' ? Math.floor(tick / 17) % fixture.items.length : 0].id;
}
function verify(count, mode) {
  const before = createFixture(count), after = createFixture(count), update = makeUpdater();
  for (let tick = 0; tick < iterations; tick++) {
    baselineUpdate(before.rows, before.items, advance(before, tick, mode));
    update(after.rows, after.items, advance(after, tick, mode));
    assert.deepEqual(after.snapshot(), before.snapshot());
  }
  return { before: before.counts, after: after.counts };
}
function measure(count, mode, optimized) {
  const fixture = createFixture(count), update = optimized ? makeUpdater() : baselineUpdate;
  for (let tick = 0; tick < warmup; tick++) update(fixture.rows, fixture.items, advance(fixture, tick, mode));
  const start = performance.now();
  for (let tick = 0; tick < iterations; tick++) update(fixture.rows, fixture.items, advance(fixture, tick, mode));
  return (performance.now() - start) / iterations;
}
function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { medianMsPerUpdate: sorted[Math.floor(sorted.length / 2)], minMsPerUpdate: sorted[0], maxMsPerUpdate: sorted.at(-1), samplesMsPerUpdate: values };
}
const results = [];
for (const count of [50, 100]) for (const mode of ['idle', 'changing']) {
  const operations = verify(count, mode), before = [], after = [];
  for (let sample = 0; sample < samples; sample++) {
    // Alternate order to reduce one-sided warmup/order effects.
    if (sample % 2) { after.push(measure(count, mode, true)); before.push(measure(count, mode, false)); }
    else { before.push(measure(count, mode, false)); after.push(measure(count, mode, true)); }
  }
  const baseline = summarize(before), optimized = summarize(after);
  results.push({ count, mode, equivalentEveryUpdate: true, operations, baseline, optimized, medianSpeedup: baseline.medianMsPerUpdate / optimized.medianMsPerUpdate });
}
console.log(JSON.stringify({ scope: 'Synthetic roster DOM-adapter microbenchmark only; not browser frame time, simulation, or observation performance.', baselineCommit: '86d40b5c350753de8dbb3c78f31729630f7a7f55', runtime: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, warmup, iterations, samples, results }, null, 2));
