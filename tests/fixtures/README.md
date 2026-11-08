# LOS comparison oracle

`sim-core-WIP07A.js` is an exact frozen copy of `src/sim-core.js` at
`e9f037cc6edca994e3f19297d3e0aa6c491be164`.

SHA-256: `ab70525f12138b068daf00198bd49611d883c940cd8ac8c6fcfeac5a55f2e49c`.

It is test-only and is never included by `build.py` or in the HTML/Worker.
`helpers/los-reference.cjs` checks its hash before evaluating it against the same
map, vehicle profiles and observation rules as the optimized core. Keeping the
old full core permits independent LOS/exposure and complete scenario comparisons
without checking out old commits, requiring network access, or duplicating the
new skip implementation in its own tests. Do not edit this oracle to match a
changed result; investigate the discrepancy or add a separately versioned oracle.

## WIP09 reference fixtures

- `wip09_hit_reference.py`: unchanged user-provided game-table oracle. SHA-256 `ec338593640ad406dc529c5759e308ffee57ba55721ddeda61a56ecdc9d483f6`. Run `python3 scripts/generate_hit_reference.py`; it uses a temporary output directory and writes the 35-row release JSON. No real FCS/weapon calibration is claimed.
- `observation-WIP08A.js`: exact source from `68a549bbb4c379174902268e10278dec9ddc9f0d:src/observation.js`, SHA-256 `5790c3db92e62a6b9bd75e3c960156509dab5228f454c519a311c6b412b49cb9`. Test-only independent observation decisions/events/timing oracle; exclude only additive WIP09 sample/model metadata when comparing.
- `helpers/los-reference.cjs` may attach row/column metadata at the **observation callback boundary** for fair current-gameplay performance comparisons. Its public original LOS/exposure functions and the pinned WIP07A file remain unchanged.
