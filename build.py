#!/usr/bin/env python3
"""Build an offline, single-file HTML from one validated map bundle."""
from pathlib import Path
import argparse, base64, json, sys
root=Path(__file__).resolve().parent
sys.path.insert(0,str(root/'scripts'))
from map_spec import validate_map, validate_derived

parser=argparse.ArgumentParser()
parser.add_argument('--map',default='data/rasdorf_4km.json')
parser.add_argument('--contours',default='data/contours.json')
parser.add_argument('--terrain',default='data/terrain-readability.json')
parser.add_argument('--output',default='dist/index.html')
args=parser.parse_args()
def load(path): return json.loads((root/path).read_text(encoding='utf-8'))
map_data,contours,terrain=load(args.map),load(args.contours),load(args.terrain)
spec=validate_map(map_data,require_navigation=True);validate_derived(spec,contours,'contour');validate_derived(spec,terrain,'terrain readability')
page=(root/'src/page.html').read_text(encoding='utf-8')
payloads={
 'BATTLEFIELD_DATA':'const BATTLEFIELD_DATA = '+json.dumps(map_data,ensure_ascii=False,separators=(',',':'))+';\n',
 'CONTOUR_DATA':'const CONTOUR_DATA = '+json.dumps(contours,ensure_ascii=False,separators=(',',':'))+';\n',
 'TERRAIN_DATA':'const TERRAIN_DATA = '+json.dumps(terrain,ensure_ascii=False,separators=(',',':'))+';\n'}
for token,name in [('MAP_SPEC','map-spec.js'),('STYLES','styles.css'),('VEHICLE_PROFILES','vehicle-profiles.js'),('MOBILITY','mobility.js'),('TACTICAL_AI','tactical-ai.js'),('VEHICLE_GEOMETRY','vehicle-geometry.js'),('OBSERVATION','observation.js'),('COMBAT_STATE','combat-state.js'),('FIRE_CONTROL','fire-control.js'),('SIM_CORE','sim-core.js'),('MAP_RENDERER','map-renderer.js'),('VISIBILITY_CODE','visibility.js'),('VISIBILITY_CLIENT','visibility-client.js'),('M1A2_ART','m1a2-art.js'),('M1A2_THUMBNAIL','../data/vehicles/M1A2_top_view.svg'),('UI_CACHE','ui-cache.js'),('LOOK_ANIMATION','look-animation.js'),('EFFECTS','effects.js'),('APP_CODE','app.js')]:
    marker='{{'+token+'}}'
    if page.count(marker)!=1:
        raise ValueError('Expected exactly one '+marker)
    page=page.replace(marker,(root/'src'/name).read_text(encoding='utf-8'))
for token,value in payloads.items():
    marker='{{'+token+'}}'
    if page.count(marker)!=1: raise ValueError('Expected exactly one '+marker)
    page=page.replace(marker,value)
size=f"{spec['width']/1000:g}×{spec['height']/1000:g}km"
name=map_data['meta'].get('name',map_data['meta']['id'])
description=map_data['meta'].get('subtitle',name);heading=description.split(' · ')[0];title=heading.removesuffix(' 서부')
labels={'MAP_TITLE':title+' '+size,'MAP_SUBTITLE':heading+' · '+size,'MAP_EYEBROW':name.upper(),'MAP_HEADING':heading,'MAP_DIMENSIONS':size,'MAP_FOOTER_SIZE':f"{spec['width']} × {spec['height']} m"}
for token,value in labels.items(): page=page.replace('{{'+token+'}}',value)
atlas='data:image/png;base64,'+base64.b64encode((root/'assets/effects/wip12-effects-atlas.png').read_bytes()).decode('ascii')
if page.count('{{EFFECT_ATLAS}}')!=1:
    raise ValueError('Expected exactly one {{EFFECT_ATLAS}}')
page=page.replace('{{EFFECT_ATLAS}}',atlas)
output=root/args.output;output.parent.mkdir(parents=True,exist_ok=True);output.write_text(page,encoding='utf-8')
print('Built',output.relative_to(root) if output.is_relative_to(root) else output)
