#!/usr/bin/env python3
"""Fetch public Hessen DGM1 and OpenStreetMap geometry for one fixed 4 km crop."""
import concurrent.futures, datetime, json, pathlib, urllib.parse, urllib.request
from osgeo import osr
osr.UseExceptions()
ROOT=pathlib.Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw'; RAW.mkdir(parents=True,exist_ok=True)
BOUNDS=[560500,5616500,564500,5620500] # EPSG:25832; exactly 4000 x 4000 metres
a=osr.SpatialReference();a.ImportFromEPSG(25832)
b=osr.SpatialReference();b.ImportFromEPSG(4326);b.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
t=osr.CoordinateTransformation(a,b)
corners=[t.TransformPoint(x,y)[:2] for x in BOUNDS[::2] for y in BOUNDS[1::2]]
west=min(p[0] for p in corners)-.002;east=max(p[0] for p in corners)+.002
south=min(p[1] for p in corners)-.002;north=max(p[1] for p in corners)+.002
params={'service':'WCS','version':'2.0.1','request':'GetCoverage','coverageid':'he_dgm1','format':'GTIFF'}
dem_url='https://inspire-hessen.de/raster/dgm1/ows?'+urllib.parse.urlencode(params)+'&SUBSET=e(560500,564500)&SUBSET=n(5616500,5620500)'
query=f'''[out:json][timeout:90];(
way["highway"]({south},{west},{north},{east});
way["building"]({south},{west},{north},{east});
way["landuse"]({south},{west},{north},{east});
way["natural"]({south},{west},{north},{east});
way["waterway"]({south},{west},{north},{east});
relation["landuse"]({south},{west},{north},{east});
relation["natural"]({south},{west},{north},{east});
node["place"]({south},{west},{north},{east});
);out tags geom;'''
(RAW/'overpass_query.txt').write_text(query)
(RAW/'bounds.json').write_text(json.dumps({'epsg':25832,'bounds':BOUNDS,'geographic_bbox':[south,west,north,east],'corners_lonlat':corners,'dem_url':dem_url},indent=2))
def download_dem():
 p=RAW/'rasdorf_dgm1.tif'
 if p.exists() and p.stat().st_size>100000:return 'DEM cached '+str(p.stat().st_size)
 with urllib.request.urlopen(urllib.request.Request(dem_url,headers={'User-Agent':'TacticalTerrainPrototype/0.4'}),timeout=100) as r:
  content=r.read()
 if content[:2] not in (b'II',b'MM'):raise RuntimeError('DEM response is not TIFF: '+repr(content[:300]))
 p.write_bytes(content)
 return 'DEM downloaded '+str(len(content))+' bytes'
def download_osm():
 p=RAW/'rasdorf_osm.json'
 if p.exists() and p.stat().st_size>1000:return 'OSM cached '+str(p.stat().st_size)
 errors=[]
 for endpoint in ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']:
  try:
   req=urllib.request.Request(endpoint,data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'TacticalTerrainPrototype/0.4','Content-Type':'application/x-www-form-urlencoded'})
   with urllib.request.urlopen(req,timeout=100) as r:content=r.read()
   data=json.loads(content)
   if data.get('remark'):raise RuntimeError(data['remark'])
   if not data.get('elements'):raise RuntimeError('No OSM elements')
   p.write_bytes(content)
   (RAW/'osm_source.json').write_text(json.dumps({'endpoint':endpoint,'downloaded_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'copyright':'© OpenStreetMap contributors','license':'ODbL 1.0','url':'https://www.openstreetmap.org/copyright'},indent=2))
   return 'OSM downloaded '+str(len(data['elements']))+' elements / '+str(len(content))+' bytes'
  except Exception as e:errors.append(endpoint+': '+str(e))
 raise RuntimeError('; '.join(errors))
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 jobs=[pool.submit(download_dem),pool.submit(download_osm)]
 for job in concurrent.futures.as_completed(jobs):print(job.result(),flush=True)
