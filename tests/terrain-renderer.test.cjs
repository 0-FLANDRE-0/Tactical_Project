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

test('missing or mismatched interpretation data disables only derived lines',()=>{
  global.document={createElement:()=>({})};global.Path2D=class{moveTo(){}lineTo(){}closePath(){}arc(){}ellipse(){}};
  const core={MAP:{meta:{mapHash:'map'}},fields:[],forests:[],water:[],buildings:[],roads:[],waterways:[],trees:[],hash:()=>0};
  const contours={sourceMapHash:'map',lines:[]};
  const previous=console.error;console.error=()=>{};
  try{const renderer=new TacticalRenderer(core,contours,{schemaVersion:1,sourceMapHash:'wrong',lines:[]});assert.equal(renderer.terrainValid,false);assert.deepEqual(renderer.terrainLines,[]);}
  finally{console.error=previous;delete global.document;delete global.Path2D;}
});
