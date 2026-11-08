#!/usr/bin/env python3
"""Run the checksum-pinned, user-supplied game-table oracle in a temporary dir."""
from pathlib import Path
import hashlib, json, subprocess, sys, tempfile
root = Path(__file__).resolve().parents[1]
source = root / 'tests/fixtures/wip09_hit_reference.py'
if hashlib.sha256(source.read_bytes()).hexdigest() != 'ec338593640ad406dc529c5759e308ffee57ba55721ddeda61a56ecdc9d483f6':
    raise SystemExit('User reference changed; review and version the oracle first')
with tempfile.TemporaryDirectory(prefix='tactical-hit-reference-') as temporary:
    subprocess.run([sys.executable, str(source)], cwd=temporary, check=True, capture_output=True)
    result = Path(temporary, 'reference.json').read_bytes()
    assert len(json.loads(result)['rows']) == 35
(root / 'tests/releases/WIP09-hit-table.json').write_bytes(result)
print('Generated 35 WIP09 game reference rows from the unchanged Python fixture')
