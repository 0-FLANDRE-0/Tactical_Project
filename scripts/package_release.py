#!/usr/bin/env python3
"""Package the current built HTML; preserve earlier version files. No deployment."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib, json, re, sys
root = Path(__file__).resolve().parents[1]
version = sys.argv[1] if len(sys.argv) == 2 else ''
if not re.fullmatch(r'WIP[0-9]+[A-Z]?', version):
    raise SystemExit('Usage: python3 scripts/package_release.py WIP07A')
raw = (root / 'dist/index.html').read_bytes()
if f'v0.4 {version}</title>'.encode() not in raw:
    raise SystemExit('Built HTML version does not match requested package')
html = root / f'Tactical_v0.4_{version}.html'
archive = html.with_suffix('.zip')
html.write_bytes(raw)
# Stable timestamp and permissions make repeat packaging reproducible.
info = ZipInfo(html.name, date_time=(2026, 11, 9 if version == 'WIP12' else 8, 0, 0, 0))
info.compress_type = ZIP_DEFLATED
info.external_attr = 0o100644 << 16
with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as out:
    out.writestr(info, raw, compresslevel=9)
with ZipFile(archive) as zipped:
    assert zipped.namelist() == [html.name]
    assert zipped.testzip() is None
    assert zipped.read(html.name) == raw
sha = lambda data: hashlib.sha256(data).hexdigest()
checks = root / f'SHA256SUMS_{version}.txt'
checks.write_text(f'{sha(raw)}  {html.name}\n{sha(raw)}  dist/index.html\n{sha(archive.read_bytes())}  {archive.name}\n')
print(json.dumps({'html': html.name, 'htmlBytes': len(raw), 'htmlSHA256': sha(raw), 'zip': archive.name,
                  'zipBytes': archive.stat().st_size, 'zipSHA256': sha(archive.read_bytes()), 'extractedMatchesDist': True}, indent=2))
