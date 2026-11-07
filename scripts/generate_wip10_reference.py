#!/usr/bin/env python3
"""Run the checksum-pinned user WIP10 game oracle in a temporary directory."""
from pathlib import Path
import hashlib, json, subprocess, sys, tempfile

root = Path(__file__).resolve().parents[1]
source = root / 'tests/fixtures/wip10_hit_reference.py'
expected = '142e5001ee9bd4042a88e6011a1342a2b96cc94eb093f9b0faec069c6aaf6dc6'
if hashlib.sha256(source.read_bytes()).hexdigest() != expected:
    raise SystemExit('User WIP10 reference changed; review and version the oracle first')
with tempfile.TemporaryDirectory(prefix='tactical-wip10-reference-') as temporary:
    subprocess.run([sys.executable, str(source)], cwd=temporary, check=True, capture_output=True)
    result = Path(temporary, 'reference10.json').read_bytes()
    parsed = json.loads(result)
    assert {key: len(parsed[key]) for key in parsed} == {'preview': 24, 'impact': 6, 'zones': 11, 'drop': 5}
(root / 'tests/releases/WIP10-reference.json').write_bytes(result)
print('Generated 46 WIP10 game reference rows from the unchanged Python fixture')
