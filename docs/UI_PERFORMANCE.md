# UI update cleanup and reproducible benchmark

## Scope

This change only updates presentation plumbing. It does not change simulation state,
movement, observation calculations, Worker scheduling, input behavior, or rendering
cadence. The existing scenario still contains the same objects.

- Build a first-match ID index once per roster refresh instead of a linear search
  for each row. Rebuild the index every refresh so reset, item replacement, and
  in-place array changes cannot leave stale item records.
- Cache each roster row's text node in a WeakMap. Rows must keep their internal
  markup for their lifetime; replace the row if its markup changes. Removed rows
  are not retained by the cache.
- Compare current DOM values before writing unchanged HUD text, route markup,
  roster text, selection classes, or ARIA pressed state. Calculated results are
  not cached.

## Reproduce

No additional packages are required. From the repository root:

```sh
node scripts/export_vehicle_profile.cjs
python3 build.py
node --test tests/ui-cache.test.cjs
node tests/map.test.cjs
node tests/input.test.cjs
node tests/visibility.test.cjs
node tests/vehicle.test.cjs
node scripts/benchmark_ui.cjs > tests/ui-benchmark-results.json
```

The benchmark uses synthetic list records with `id`, `state`, and `speed` values,
not map data or a running simulation. Its baseline reproduces the roster-update
operations from commit `86d40b5c350753de8dbb3c78f31729630f7a7f55`.

For both 50 and 100 records, it runs an idle workload and a changing-label /
changing-selection workload. It compares every displayed value against the
baseline across 2,000 updates in each case. Timing then uses 200 warmup updates
and nine samples of 2,000 updates per implementation, alternating execution order.
The JSON includes all samples, median/min/max timings, and exact setter/method-call counts. These are not measured browser DOM mutations.
Assertions run outside timed sections. There is no machine-dependent timing
pass/fail threshold.

## Recorded results

Node v24.22.1, Linux x64. Values below are medians per list update in the synthetic
DOM adapter. Consult `tests/ui-benchmark-results.json` for the exact environment
and raw samples.

| Records | Workload | Baseline ms | After ms | Ratio |
|---|---|---:|---:|---:|
| 50 | Idle | 0.0124 | 0.0086 | 1.43× |
| 50 | Changing | 0.0132 | 0.0105 | 1.25× |
| 100 | Idle | 0.0402 | 0.0174 | 2.31× |
| 100 | Changing | 0.0435 | 0.0211 | 2.06× |

Across 2,000 idle updates with 100 rows, text and ARIA assignments each fall from
200,000 to 100, class-toggle calls from 200,000 to 1, and text-node queries from
200,000 to 100. Subsequent unchanged updates perform no assignments or queries.
For the changing workload, changed text and selection values still update.

## Verification and limits

- The four existing JavaScript suites passed before this change: 53 checks.
- After the change, all 53 existing checks and 12 new UI-cache tests passed.
- All available source, script, and test JavaScript files pass `node --check`.
- The offline HTML was rebuilt from the sources and the new helper is embedded
  before the application script. Existing input tests execute that built bundle.
- New tests cover unchanged writes, numeric/null text conversion, external text
  changes, selection changes, reset with identical IDs, in-place changes,
  reordering, duplicate IDs, new/removed rows, and immutable input records.
- The GDAL/raw-source data-quality suite was not rerun. Its source data and
  processing scripts are unchanged.
- These figures are **not FPS measurements**. The adapter has no browser layout,
  painting, GPU work, real DOM cost, Worker overhead, or device thermal behavior.
  No full-game 50/100-entity benchmark, mobile test, or browser visual QA is claimed.
  Browser and target-device performance still need separate measurement.
