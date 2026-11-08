#!/usr/bin/env python3
"""Build an offline, single-file HTML. Python standard library only."""
from pathlib import Path
root=Path(__file__).resolve().parent
page=(root/'src/page.html').read_text(encoding='utf-8')
for token,name in [('BATTLEFIELD_DATA','battlefield-data.js'),('STYLES','styles.css'),('VEHICLE_PROFILES','vehicle-profiles.js'),('VEHICLE_GEOMETRY','vehicle-geometry.js'),('OBSERVATION','observation.js'),('COMBAT_STATE','combat-state.js'),('FIRE_CONTROL','fire-control.js'),('SIM_CORE','sim-core.js'),('CONTOUR_DATA','contour-data.js'),('MAP_RENDERER','map-renderer.js'),('VISIBILITY_CODE','visibility.js'),('VISIBILITY_CLIENT','visibility-client.js'),('M1A2_ART','m1a2-art.js'),('M1A2_THUMBNAIL','../data/vehicles/M1A2_top_view.svg'),('UI_CACHE','ui-cache.js'),('LOOK_ANIMATION','look-animation.js'),('APP_CODE','app.js')]:
    marker='{{'+token+'}}'
    if page.count(marker)!=1:
        raise ValueError('Expected exactly one '+marker)
    page=page.replace(marker,(root/'src'/name).read_text(encoding='utf-8'))
(root/'dist').mkdir(exist_ok=True)
(root/'dist/index.html').write_text(page,encoding='utf-8')
print('Built dist/index.html')
