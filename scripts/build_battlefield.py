#!/usr/bin/env python3
"""Bake a reproducible public-data battlefield. Run with /usr/bin/python3."""
import base64, hashlib, json, math, pathlib, re
import numpy as np
from osgeo import gdal, ogr, osr
from PIL import Image, ImageDraw
gdal.UseExceptions();ogr.UseExceptions();osr.UseExceptions()
ROOT=pathlib.Path(__file__).resolve().parents[1]; RAW=ROOT/'data/raw'
E0,N0,E1,N1=560500,5616500,564500,5620500
SIZE=4000
srs=osr.SpatialReference();srs.ImportFromEPSG(4326);srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
utm=osr.SpatialReference();utm.ImportFromEPSG(25832)
tx=osr.CoordinateTransformation(srs,utm)
clip=ogr.CreateGeometryFromWkt(f'POLYGON(({E0} {N0},{E1} {N0},{E1} {N1},{E0} {N1},{E0} {N0}))')
source=json.loads((RAW/'rasdorf_osm.json').read_text())
def way_line(points):
 g=ogr.Geometry(ogr.wkbLineString)
 for p in points:g.AddPoint_2D(p['lon'],p['lat'])
 return g
def ring_poly(points):
 r=ogr.Geometry(ogr.wkbLinearRing)
 for p in points:r.AddPoint_2D(p['lon'],p['lat'])
 r.CloseRings();g=ogr.Geometry(ogr.wkbPolygon);g.AddGeometry(r);return g
def joined_rings(parts):
 chains=[[tuple((p['lon'],p['lat'])) for p in points] for points in parts if len(points)>1];rings=[]
 while chains:
  ring=chains.pop(0)
  while ring[0]!=ring[-1]:
   matched=False
   for i,q in enumerate(chains):
    if q[0]==ring[-1]:ring+=q[1:]
    elif q[-1]==ring[-1]:ring+=q[-2::-1]
    elif q[-1]==ring[0]:ring=q[:-1]+ring
    elif q[0]==ring[0]:ring=q[:0:-1]+ring
    else:continue
    chains.pop(i);matched=True;break
   if not matched:break
  if ring[0]==ring[-1] and len(ring)>=4:rings.append(ring)
 return rings
def element_geom(e,polygon=False):
 if e['type']=='way':
  pts=e.get('geometry',[])
  if len(pts)<2:return None
  g=ring_poly(pts) if polygon and len(pts)>3 and pts[0]==pts[-1] else way_line(pts)
 elif e['type']=='relation' and polygon:
  members=e.get('members',[])
  outer=joined_rings([m['geometry'] for m in members if m.get('geometry') and m.get('role','') in ('outer','')])
  inner=joined_rings([m['geometry'] for m in members if m.get('geometry') and m.get('role')=='inner'])
  g=ogr.Geometry(ogr.wkbMultiPolygon)
  for r in outer:
   p=ring_poly([{'lon':x,'lat':y} for x,y in r])
   for hole in inner:
    hp=ring_poly([{'lon':x,'lat':y} for x,y in hole])
    if p.Contains(hp.PointOnSurface()):p.AddGeometry(hp.GetGeometryRef(0))
   g.AddGeometry(p)
 else:return None
 g.Transform(tx)
 if not g.IsValid():g=g.MakeValid()
 if not g.Intersects(clip):return None
 return g.Intersection(clip)
def local_geometry(g):
 j=json.loads(g.ExportToJson())
 def convert(v):
  if v and isinstance(v[0],(float,int)):return [round(v[0]-E0,2),round(N1-v[1],2)]
  return [convert(x) for x in v]
 j['coordinates']=convert(j['coordinates']);return j
def polygons(g):
 if g.GetGeometryName()=='POLYGON':return [g]
 return [g.GetGeometryRef(i).Clone() for i in range(g.GetGeometryCount()) if g.GetGeometryRef(i).GetGeometryName()=='POLYGON']
def lines(g):
 if g.GetGeometryName()=='LINESTRING':return [g]
 return [g.GetGeometryRef(i).Clone() for i in range(g.GetGeometryCount()) if g.GetGeometryRef(i).GetGeometryName()=='LINESTRING']
def stable(id):return int(hashlib.sha256(str(id).encode()).hexdigest()[:8],16)/0xffffffff
def number(v,default):
 try:return float(re.search(r'[-+]?\d+(?:\.\d+)?',str(v)).group())
 except:return default
features={'roads':[],'buildings':[],'forests':[],'fields':[],'water':[],'waterways':[],'labels':[]}; geographic=[];original_buildings=0
road_types={'primary':(9,True),'secondary':(8,True),'tertiary':(7,True),'unclassified':(6,True),'residential':(6,True),'service':(4.5,True),'living_street':(5,True),'track':(4,True),'footway':(1.8,False),'path':(1.5,False),'cycleway':(2,False),'steps':(1.2,False)}
for e in source['elements']:
 tags=e.get('tags',{});ident=str(e['type'][0])+str(e['id'])
 if e['type']=='node':
  if tags.get('name') and 'place' in tags:
   x,y,_=tx.TransformPoint(e['lon'],e['lat'])
   if E0<x<E1 and N0<y<N1:features['labels'].append({'name':tags['name'],'x':round(x-E0,1),'y':round(N1-y,1)})
  continue
 if tags.get('building') and tags['building']!='no':
  g=element_geom(e,True)
  if not g or g.GetDimension()!=2:continue
  for idx,p in enumerate(polygons(g)):
   area=p.Area()
   if area<15:continue
   original_buildings+=1;kind=tags['building'];important=kind in ('church','chapel','school','civic','public','fire_station')
   keep=important or area>700 or (kind not in ('garage','garages','shed','carport','roof') and area>=65 and stable(ident)<(.7 if area>180 else .48))
   if not keep:continue
   z=max(3,min(28,number(tags.get('height'),number(tags.get('building:levels'),2)*3+1.5)))
   f={'id':ident+'_'+str(idx),'geometry':local_geometry(p),'z':round(z,1),'kind':kind,'area':round(area,1),'heightEstimated':'height' not in tags}
   features['buildings'].append(f);geographic.append(('building',p,z))
  continue
 if tags.get('highway') in road_types:
  g=element_geom(e)
  if g is None:continue
  typ=tags['highway'];width,drive=road_types[typ];width=max(1,min(16,number(tags.get('width'),width)))
  for idx,line in enumerate(lines(g)):
   if line.Length()<3:continue
   points=local_geometry(line)['coordinates'];f={'id':ident+'_'+str(idx),'points':points,'width':width,'kind':typ,'driveable':drive,'bridge':tags.get('bridge') not in (None,'no'),'name':tags.get('name','')}
   features['roads'].append(f)
   if drive:geographic.append(('bridge' if f['bridge'] else 'road',line.Buffer(width/2),0))
  continue
 if tags.get('waterway') in ('stream','river','ditch','drain'):
  g=element_geom(e)
  if g is None:continue
  for idx,line in enumerate(lines(g)):
   width=max(1,min(20,number(tags.get('width'),2 if tags['waterway']=='stream' else 1)))
   features['waterways'].append({'id':ident+'_'+str(idx),'points':local_geometry(line)['coordinates'],'width':width,'kind':tags['waterway'],'culvert':tags.get('tunnel') in ('yes','culvert')})
   geographic.append(('stream',line.Buffer(width/2),0))
  continue
 land=tags.get('landuse');natural=tags.get('natural');kind=None
 if land=='forest' or natural=='wood':kind='forest'
 elif natural=='water' or land in ('reservoir','basin'):kind='water'
 elif land=='farmland':kind='field'
 elif land in ('meadow','grass','village_green','recreation_ground') or natural=='grassland':kind='grass'
 elif land=='orchard' or natural in ('scrub','heath'):kind='scrub'
 elif land in ('residential','industrial','commercial','retail','farmyard'):kind='settlement'
 if kind:
  g=element_geom(e,True)
  if g is None or g.GetDimension()!=2:continue
  for idx,p in enumerate(polygons(g)):
   if p.Area()<20:continue
   geom=local_geometry(p.SimplifyPreserveTopology(1.2))
   f={'id':ident+'_'+str(idx),'geometry':geom,'kind':kind}
   if kind=='forest':features['forests'].append(f)
   elif kind=='water':features['water'].append(f)
   else:features['fields'].append(f)
   geographic.append((kind,p,0))
# Reproject/resample source DGM1 to a shared 2 m grid of cell-centre heights.
d=gdal.Open(str(RAW/'rasdorf_dgm1.tif'));res=gdal.Warp('',d,format='MEM',outputBounds=[E0,N0,E1,N1],width=2000,height=2000,resampleAlg='bilinear')
source_height=res.ReadAsArray().astype(np.float32)
# Light, bounded gameplay smoothing: keep real ridges/valleys and metre scale.
# Separable five-tap binomial filter (sigma approximately 2 m), change <= 0.5 m.
weights=[1/16,4/16,6/16,4/16,1/16]
padded=np.pad(source_height,((0,0),(2,2)),mode='edge')
horizontal=sum(w*padded[:,i:i+2000] for i,w in enumerate(weights))
padded=np.pad(horizontal,((2,2),(0,0)),mode='edge')
smoothed=sum(w*padded[i:i+2000,:] for i,w in enumerate(weights))
height=(source_height+np.clip(smoothed-source_height,-.5,.5)).astype(np.float32)
if np.any(~np.isfinite(height)) or np.any(height<-100):raise RuntimeError('DEM has NoData in selected crop')
# Flat row delta coding at 0.1 m. Decode is synchronous and needs no browser APIs.
quant=np.rint(height*10).astype(np.int32);delta=np.diff(quant,axis=1,prepend=np.zeros((2000,1),dtype=np.int32));zig=((delta<<1)^(delta>>31)).ravel();encoded=bytearray()
for v in zig:
 v=int(v)
 while v>=128:encoded.append((v&127)|128);v>>=7
 encoded.append(v)
# One fixed 4 m surface atlas; all gameplay and drawing read the same selection.
atlas_size=1000;driver=ogr.GetDriverByName('Memory');mem=driver.CreateDataSource('');layer=mem.CreateLayer('areas',utm,ogr.wkbUnknown);layer.CreateField(ogr.FieldDefn('value',ogr.OFTInteger))
codes={'grass':0,'field':1,'forest':2,'settlement':3,'scrub':4,'water':5,'stream':6,'road':7,'bridge':8,'building':9}
for kind in ['grass','field','settlement','scrub','forest','water','stream','road','bridge','building']:
 for typ,g,z in geographic:
  if typ!=kind:continue
  f=ogr.Feature(layer.GetLayerDefn());f.SetGeometry(g);f.SetField('value',codes[kind]);layer.CreateFeature(f)
atlas_ds=gdal.GetDriverByName('MEM').Create('',atlas_size,atlas_size,1,gdal.GDT_Byte);atlas_ds.SetGeoTransform([E0,4,0,N1,0,-4]);atlas_ds.SetProjection(utm.ExportToWkt());gdal.RasterizeLayer(atlas_ds,[1],layer,options=['ATTRIBUTE=value']);atlas=atlas_ds.ReadAsArray()
water_and_forest={'water_mask':np.isin(atlas,[5]).sum(),'forest_mask':np.isin(atlas,[2]).sum()}
# Canopy placement is synthetic, fixed and clearly separate from measured DTM.
trees=[]
for y in range(12,4000,19):
 for x in range(12,4000,19):
  n=stable('tree_'+str(x)+'_'+str(y));xx=x+(n-.5)*13;yy=y+(stable('tree_y'+str(x)+'_'+str(y))-.5)*13
  if atlas[min(999,int(yy/4)),min(999,int(xx/4))]!=2 or n>.88:continue
  trees.append([round(xx,1),round(yy,1),round(5+n*3,1)])
features['trees']=trees
meta={'id':'rasdorf-west-4km-v1','version':1,'name':'RASDORF','subtitle':'라스도르프 서부 · 독일 헤센','width':4000,'height':4000,'epsg':25832,'originE':E0,'originN':N1,'northUp':True,'originalDemSpacing':1,'gameHeightSpacing':2,'surfaceSpacing':4,'heightProcessing':{'filter':'separable-binomial-5','sigmaApproxMetres':2,'maxAdjustmentMetres':.5,'meanAbsoluteAdjustmentMetres':round(float(np.mean(np.abs(height-source_height))),4)},'contourInterval':10,'majorContourInterval':50,'heightRange':[round(float(height.min()),2),round(float(height.max()),2)],'sourceBuildingCount':original_buildings,'selectedBuildingCount':len(features['buildings']),'roads':len(features['roads']),'forestAreas':len(features['forests']),'waterways':len(features['waterways']),'syntheticTreeCount':len(trees),'attribution':'고도: HVBG DGM1 · 도로/건물/숲: © OpenStreetMap contributors · ODbL','osmLicense':'https://opendatacommons.org/licenses/odbl/1-0/','demSource':'https://hvbg.hessen.de/landesvermessung/geotopographie/3d-daten/digitale-gelaendemodelle','osmSource':'https://www.openstreetmap.org/copyright','edits':['건물은 원래 좌표·외곽선을 유지하고 작은 부속시설과 일부 주거 건물을 선별 생략','도로 폭은 OSM width 태그가 없을 때 종류별 게임용 추정값 사용','건물 높이는 height 태그가 없을 때 게임용 추정값 사용','숲 경계는 OSM, 개별 나무 배치는 고정 합성값','작은 실개천은 감속 통과, 면 수역은 통행 차단; 실제 수심 자료 미사용','게임용 고도는 미세 요철만 완만하게 정리하며 표본별 변화는 최대 ±0.5m로 제한','큰 능선·계곡과 실제 높이 단위를 유지하고 고도 과장이나 인공 노이즈는 추가하지 않음']}
payload={'meta':meta,'heightmap':{'columns':2000,'rows':2000,'spacing':2,'sampleOrigin':1,'encoding':'row-delta-zigzag-varint-base64','scale':.1,'data':base64.b64encode(encoded).decode()},'terrain':{'columns':1000,'rows':1000,'spacing':4,'codes':codes,'data':base64.b64encode(atlas.tobytes()).decode()},'features':features}
packed=json.dumps(payload,separators=(',',':'),ensure_ascii=False);payload['meta']['mapHash']=hashlib.sha256(packed.encode()).hexdigest();packed=json.dumps(payload,separators=(',',':'),ensure_ascii=False)
(ROOT/'data/rasdorf_4km.json').write_text(packed);(ROOT/'src/battlefield-data.js').write_text('const BATTLEFIELD_DATA = '+packed+';\n')
(ROOT/'data/map_manifest.json').write_text(json.dumps({'meta':meta,'raw_files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in RAW.iterdir() if p.is_file()},'encodedHeightBytes':len(encoded),'surfaceCounts':{k:int((atlas==v).sum()) for k,v in codes.items()}},indent=2,ensure_ascii=False))
# A precise, disposable overview for choosing starting positions and QA.
z=height[::2,::2];dy,dx=np.gradient(z,4);shade=np.clip(-dx*.45-dy*.7,-.3,.3);norm=(z-float(z.min()))/(float(z.max())-float(z.min()));rgb=np.zeros((1000,1000,3),dtype=np.uint8)
base=np.array([151,162,117]);rgb[:]=np.clip(base+shade[:,:,None]*100+norm[:,:,None]*12,0,255)
rgb[atlas==1]=np.clip(rgb[atlas==1]+[12,5,-8],0,255);rgb[atlas==2]=[74,109,66];rgb[np.isin(atlas,[5,6])]=[100,151,156];rgb[np.isin(atlas,[7,8])]=[218,210,180];rgb[atlas==9]=[102,95,82]
im=Image.fromarray(rgb);draw=ImageDraw.Draw(im)
for name,x,y in [('WEST',450,2800),('EAST',3450,2850),('RIDGE',1750,950)]:draw.text((x/4,y/4),name,fill=(20,35,25))
im.save(ROOT/'data/overview.png')
print(json.dumps(meta,ensure_ascii=False,indent=2));print('Payload bytes',len(packed.encode()),'height bytes',len(encoded))
