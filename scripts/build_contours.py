#!/usr/bin/python3
"""Bake vector contours from the same decoded 2 m gameplay heights (not the DEM)."""
from pathlib import Path
import argparse, base64, json
import numpy as np
from osgeo import gdal, ogr
from map_spec import validate_map, signature

root = Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--input',default='data/rasdorf_4km.json')
parser.add_argument('--output')
parser.add_argument('--script-output')
args=parser.parse_args()
custom=args.input!='data/rasdorf_4km.json'
if custom and not args.output: parser.error('--output is required with a custom --input')
output_path=root/(args.output or 'data/contours.json')
script_path=root/args.script_output if args.script_output else (None if custom else root/'src/contour-data.js')
data = json.loads((root/args.input).read_text());spec=validate_map(data)
h = data['heightmap']
raw = base64.b64decode(h['data'])
heights = np.empty((h['rows'], h['columns']), dtype=np.float32)
offset = 0
for row in heights:
    value = 0
    for col in range(len(row)):
        z = shift = 0
        while True:
            b = raw[offset]; offset += 1
            z |= (b & 127) << shift
            if b < 128: break
            shift += 7
        value += (z >> 1) ^ -(z & 1)
        row[col] = value * h['scale']
assert offset == len(raw)
raster = gdal.GetDriverByName('MEM').Create('', h['columns'], h['rows'], 1, gdal.GDT_Float32)
raster.SetGeoTransform([0, h['spacing'], 0, 0, 0, h['spacing']])
raster.GetRasterBand(1).WriteArray(heights)
vectors = ogr.GetDriverByName('Memory').CreateDataSource('')
layer = vectors.CreateLayer('contours', geom_type=ogr.wkbLineString)
layer.CreateField(ogr.FieldDefn('level', ogr.OFTReal))
gdal.ContourGenerate(raster.GetRasterBand(1), 10, 0, [], 0, 0, layer, -1, 0)
lines = []
for feature in layer:
    geom = feature.GetGeometryRef().Simplify(0.25)
    if geom.Length() < 4: continue
    points = [[round(p[0], 3), round(p[1], 3)] for p in geom.GetPoints()]
    xs, ys = zip(*points)
    lines.append({'level': round(feature.GetField('level')), 'points': points,
                  'bounds': [min(xs), min(ys), max(xs), max(ys)]})
output = {'sourceMapHash': data['meta']['mapHash'], 'interval': 10,
          'mapSpec':signature(spec),'sampleSpacing': h['spacing'], 'simplifyTolerance': 0.25, 'lines': lines}
encoded = json.dumps(output, separators=(',', ':'))
output_path.parent.mkdir(parents=True,exist_ok=True);output_path.write_text(encoded)
if script_path: script_path.parent.mkdir(parents=True,exist_ok=True);script_path.write_text('const CONTOUR_DATA='+encoded+';\n')
print(f'Baked {len(lines)} vector contours, {sum(len(v["points"]) for v in lines)} vertices')
