#!/usr/bin/env python3
"""Compare the baked map with the downloaded measured/vector source files."""
import base64,json,pathlib,hashlib
import numpy as np
from osgeo import gdal,ogr,osr
gdal.UseExceptions();ogr.UseExceptions();osr.UseExceptions()
ROOT=pathlib.Path(__file__).resolve().parents[1]
m=json.loads((ROOT/'data/rasdorf_4km.json').read_text());raw=ROOT/'data/raw';results=[]
def check(name,ok,**details):
 if not ok:raise AssertionError(name+': '+str(details))
 results.append({'name':name,'status':'PASS',**details});print('PASS '+name,flush=True)
d=gdal.Open(str(raw/'rasdorf_dgm1.tif'));sr=osr.SpatialReference(wkt=d.GetProjection())
check('source DEM projection and metre crop',sr.GetAuthorityCode(None)=='25832' and d.RasterXSize==4000 and d.RasterYSize==4000 and d.GetGeoTransform()==(560500.,1.,0.,5620500.,0.,-1.))
truth=gdal.Warp('',d,format='MEM',outputBounds=[560500,5616500,564500,5620500],width=2000,height=2000,resampleAlg='bilinear').ReadAsArray()
encoded=np.frombuffer(base64.b64decode(m['heightmap']['data']),dtype=np.uint8).reshape(2000,2001)
check('height encoding has complete cell-centre rows',np.all(encoded[:,0]>=128) and np.all(encoded[:,1:]<128))
zig=np.column_stack(((encoded[:,0].astype(np.int32)&127)|(encoded[:,1].astype(np.int32)<<7),encoded[:,2:].astype(np.int32)))
delta=(zig>>1)^-(zig&1);decoded=np.cumsum(delta,axis=1,dtype=np.int32)*.1
error=float(np.max(np.abs(decoded-truth)))
check('game height smoothing remains within 0.5m plus quantisation',error<.5501,maxErrorMetres=error)
weights=[1/16,4/16,6/16,4/16,1/16]
padded=np.pad(truth,((0,0),(2,2)),mode='edge')
horizontal=sum(w*padded[:,i:i+2000] for i,w in enumerate(weights))
padded=np.pad(horizontal,((2,2),(0,0)),mode='edge')
smoothed=sum(w*padded[i:i+2000,:] for i,w in enumerate(weights))
expected=truth+np.clip(smoothed-truth,-.5,.5)
quant_error=float(np.max(np.abs(decoded-expected)))
check('all four million stored heights match the fixed game-height preparation',quant_error<.0501,maxQuantisationErrorMetres=quant_error)
s=osr.SpatialReference();s.ImportFromEPSG(4326);s.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
t=osr.SpatialReference();t.ImportFromEPSG(25832);tx=osr.CoordinateTransformation(s,t)
clip=ogr.CreateGeometryFromWkt('POLYGON((560500 5616500,564500 5616500,564500 5620500,560500 5620500,560500 5616500))')
elements={str(e['id']):e for e in json.loads((raw/'rasdorf_osm.json').read_text())['elements'] if e['type']=='way'}
max_difference=0
for b in m['features']['buildings']:
 ident=b['id'][1:].split('_')[0];e=elements[ident]
 ring=ogr.Geometry(ogr.wkbLinearRing)
 for p in e['geometry']:ring.AddPoint_2D(p['lon'],p['lat'])
 ring.CloseRings();source=ogr.Geometry(ogr.wkbPolygon);source.AddGeometry(ring);source.Transform(tx)
 if not source.IsValid():source=source.MakeValid()
 source=source.Intersection(clip)
 rings=b['geometry']['coordinates'];target=ogr.Geometry(ogr.wkbPolygon)
 for points in rings:
  r=ogr.Geometry(ogr.wkbLinearRing)
  for x,y in points:r.AddPoint_2D(560500+x,5620500-y)
  r.CloseRings();target.AddGeometry(r)
 difference=source.SymDifference(target).Area();max_difference=max(max_difference,difference)
 if difference>max(1,source.Boundary().Length()*.02):raise AssertionError('Footprint moved: '+b['id'])
check('all selected buildings preserve source positions and footprints',True,buildingsChecked=len(m['features']['buildings']),maxSymmetricDifferenceSquareMetres=max_difference)
manifest=json.loads((ROOT/'data/map_manifest.json').read_text())
check('raw source checksums match provenance manifest',all(hashlib.sha256((raw/name).read_bytes()).hexdigest()==digest for name,digest in manifest['raw_files'].items()))
check('navigation is attached to this exact baked terrain revision',m['navigation']['sourceHash']==m['meta']['mapHash'])
(ROOT/'tests/source-results.json').write_text(json.dumps({'passed':len(results),'failed':0,'results':results},indent=2))
print(json.dumps({'passed':len(results),'failed':0}))
