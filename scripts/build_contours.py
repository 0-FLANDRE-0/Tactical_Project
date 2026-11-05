#!/usr/bin/python3
"""Bake vector contours from the same decoded 2 m gameplay heights (not the DEM)."""
from pathlib import Path
import base64, json
import numpy as np
from osgeo import gdal, ogr

root = Path(__file__).resolve().parents[1]
data = json.loads((root/'data/rasdorf_4km.json').read_text())
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
          'sampleSpacing': 2, 'simplifyTolerance': 0.25, 'lines': lines}
encoded = json.dumps(output, separators=(',', ':'))
(root/'data/contours.json').write_text(encoded)
(root/'src/contour-data.js').write_text('const CONTOUR_DATA='+encoded+';\n')
print(f'Baked {len(lines)} vector contours, {sum(len(v["points"]) for v in lines)} vertices')
