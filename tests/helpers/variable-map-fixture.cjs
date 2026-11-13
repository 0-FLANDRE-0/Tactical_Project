const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const MapSpec=require('../../src/map-spec.js');
const EMPTY=()=>({roads:[],forests:[],fields:[],water:[],waterways:[],trees:[],labels:[],buildings:[]});
function encodeHeights(width,height,pattern=true){
 const columns=width/2,rows=height/2,raw=Buffer.alloc(columns*rows);let at=0;
 for(let y=0;y<rows;y++){let previous=0;for(let x=0;x<columns;x++){const value=pattern?+((y%17)>=8)+((x%19)>=9):0,delta=value-previous;previous=value;raw[at++]=(delta<<1)^(delta>>31);}}
 return raw.toString('base64');
}
function navigation(width,height,hash){
 const cols=width/16,rows=height/16,costs=new Float32Array(cols*rows);costs.fill(1);const edges=new Uint8Array(cols*rows);
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){let value=0;for(let i=0;i<dirs.length;i++){const [dx,dy]=dirs[i];if(x+dx>=0&&x+dx<cols&&y+dy>=0&&y+dy<rows)value|=1<<i;}edges[y*cols+x]=value;}
 return{contract:'nav16-M1A2-r4.62-long0.60-side0.40-v2',sourceHash:hash,cols,rows,costs:Buffer.from(costs.buffer).toString('base64'),edges:Buffer.from(edges).toString('base64')};
}
function makeMap({width=8000,height=8000,id=`synthetic-${width}x${height}`,pattern=true,building=false}={}){
 const hash=crypto.createHash('sha256').update(`${id}:${width}:${height}:${pattern}:${building}`).digest('hex'),surface=Buffer.alloc(width/4*(height/4));
 surface[(height/4-2)*(width/4)+(width/4-3)]=2;
 const features=EMPTY();if(building)features.buildings.push({id:'rect-south-building',z:12,geometry:{type:'Polygon',coordinates:[[[20,height-55],[50,height-55],[50,height-15],[20,height-15],[20,height-55]]]}});
 const map={meta:{id,version:1,name:'SYNTHETIC',subtitle:`합성 ${width}×${height}m`,width,height,mapHash:hash},heightmap:{columns:width/2,rows:height/2,spacing:2,sampleOrigin:1,encoding:'row-delta-zigzag-varint-base64',scale:.1,data:encodeHeights(width,height,pattern)},terrain:{columns:width/4,rows:height/4,spacing:4,codes:{grass:0,field:1,forest:2,settlement:3,scrub:4,water:5,stream:6,road:7,bridge:8,obstacle:9},data:surface.toString('base64')},features};
 map.navigation=navigation(width,height,hash);return map;
}
function derived(map){const spec=MapSpec.validate(map);return{contours:{sourceMapHash:spec.hash,mapSpec:MapSpec.signature(spec),interval:10,sampleSpacing:2,simplifyTolerance:.25,lines:[]},terrain:{sourceMapHash:spec.hash,mapSpec:MapSpec.signature(spec),schemaVersion:1,algorithmVersion:'synthetic',lines:[]}};}
function loadCore(map){
 const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'src/sim-core.js'),'utf8'),holder={exports:{}};
 return new Function('BATTLEFIELD_DATA','TacticalMapSpec','VEHICLE_PROFILES','TacticalMobility','TacticalAI','TacticalObservation','TacticalCombatState','TacticalFireControl','TacticalVehicleGeometry','module',source+'\nreturn module.exports;')(map,MapSpec,require('../../src/vehicle-profiles.js'),require('../../src/mobility.js'),require('../../src/tactical-ai.js'),require('../../src/observation.js'),require('../../src/combat-state.js'),require('../../src/fire-control.js'),require('../../src/vehicle-geometry.js'),holder);
}
module.exports={makeMap,derived,loadCore};
