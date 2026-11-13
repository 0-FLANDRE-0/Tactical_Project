const test=require('node:test'),assert=require('node:assert/strict');
const {TacticalRenderer,TacticalTerrainStyle:S}=require('../src/map-renderer.js');

test('fixed elevation palette is monotonic and independent of viewport',()=>{
  const luminance=rgb=>rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  const values=S.stops.map(h=>S.baseColour(h));
  for(let i=1;i<values.length;i++)assert(luminance(values[i])>luminance(values[i-1]));
  assert.deepEqual(S.baseColour(390),S.baseColour(390));
  assert.notDeepEqual(S.baseColour(320),S.baseColour(470));
});

test('north-west lighting preserves polarity and caps dark slopes',()=>{
  assert(S.hillshade(.2,.2,true)>0,'surface rising south-east must face north-west light');
  assert(S.hillshade(-.2,-.2,true)<0,'opposite face must be darker');
  assert(Math.abs(S.hillshade(100,100,true))<=.21);
  assert.notEqual(S.hillshade(.2,-.1,true),0,'secondary light must retain cross-direction relief');
});

test('terrain emphasis increases colour and shade separation without changing height',()=>{
  const ordinary=S.colour(400,.15,.15,false,false),emphasis=S.colour(400,.15,.15,true,false),held=S.colour(400,.15,.15,true,true);
  assert.notDeepEqual(ordinary,emphasis);
  const base=S.baseColour(400,true),distance=rgb=>rgb.reduce((sum,v,i)=>sum+Math.abs(v-base[i]),0);
  assert(distance(emphasis)>distance(held));
});

test('missing interpretation is optional but mismatched derived data is rejected',()=>{
  global.document={createElement:()=>({})};global.Path2D=class{moveTo(){}lineTo(){}closePath(){}arc(){}ellipse(){}};
  const mapSpec={version:1,width:64,height:64,heightColumns:32,heightRows:32,heightSpacing:2,surfaceColumns:16,surfaceRows:16,surfaceSpacing:4,navigationColumns:4,navigationRows:4,navigationSpacing:16},core={SPEC:{hash:'map',width:64,height:64,heightmap:{columns:32,rows:32,spacing:2},terrain:{columns:16,rows:16,spacing:4},navigation:{columns:4,rows:4,spacing:16}},fields:[],forests:[],water:[],buildings:[],roads:[],waterways:[],trees:[],hash:()=>0};
  const contours={sourceMapHash:'map',mapSpec,lines:[]};
  try{const renderer=new TacticalRenderer(core,contours,null);assert.equal(renderer.terrainValid,false);assert.deepEqual(renderer.terrainLines,[]);assert.throws(()=>new TacticalRenderer(core,contours,{schemaVersion:1,sourceMapHash:'wrong',mapSpec,lines:[]}),/source hash/);}
  finally{delete global.document;delete global.Path2D;}
});
