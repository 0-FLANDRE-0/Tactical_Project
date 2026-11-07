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
