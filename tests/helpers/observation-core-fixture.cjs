// Real core + real nine-sample LOS on explicitly synthetic terrain. No navigation
// queries are performed; baked navigation buffers are retained only for loading.
const fs=require('fs'),path=require('path'),O=require('../../src/observation.js'),profiles=require('../../src/vehicle-profiles.js');
const original=require('../load.cjs')(),source=fs.readFileSync(path.resolve(__dirname,'../../src/sim-core.js'),'utf8'),cache=new Map();
function heightsForRidge(){
 const row=[];let previous=0;for(let x=0;x<2000;x++){const metres=x*2+1,z=Math.round(Math.max(0,40-Math.abs(metres-1000)*.4)*10),d=z-previous;previous=z;let n=(d<<1)^(d>>31);do{const b=n&127;n>>>=7;row.push(b|(n?128:0));}while(n);}
 const encoded=Buffer.from(row);return Buffer.concat(Array.from({length:2000},()=>encoded)).toString('base64');
}
function mapFor(kind='flat'){
 const map=structuredClone(original.MAP);map.meta.mapHash='observation-test-'+kind+'-v1';map.navigation.sourceHash=map.meta.mapHash;
 map.heightmap.data=kind==='ridge'?heightsForRidge():Buffer.alloc(4000000).toString('base64');
 const surface=Buffer.alloc(1000000);if(kind==='forest')for(let y=0;y<1000;y++)for(let x=200;x<225;x++)surface[y*1000+x]=2;
 map.terrain.data=surface.toString('base64');map.features={roads:[],forests:[],fields:[],water:[],waterways:[],trees:[],labels:[],buildings:['building','low-wall'].includes(kind)?[{id:'test-wall',z:kind==='low-wall'?2.3:20,geometry:{type:'Polygon',coordinates:[[[980,900],[1020,900],[1020,1100],[980,1100],[980,900]]]}}]:[]};
 return map;
}
function core(kind='flat'){
 if(cache.has(kind))return cache.get(kind);const map=mapFor(kind);
 const C=new Function('BATTLEFIELD_DATA','VEHICLE_PROFILES','TacticalObservation','TacticalFireControl','TacticalVehicleGeometry','module',source+'\nreturn module.exports;')(map,profiles,O,require('../../src/fire-control.js'),require('../../src/vehicle-geometry.js'),{exports:{}});cache.set(kind,C);return C;
}
function fixture(kind='flat',{target={x:1500,y:1300},observer={x:500,y:1000},seed=17}={}){
 const C=core(kind),u=C.makeTank('A','OBSERVER',observer.x,observer.y,0),t=C.makeTank('T','MOVING TARGET',target.x,target.y,Math.PI,'red');
 const s={time:0,seed,units:[u,t],recordObservationEvents:true};C.guard(s,u,'commander',target);C.guard(s,u,'gunner',target);
 const step=(n=1,move=null)=>{for(let i=0;i<n;i++){if(move)move(s.time+.05,u,t);C.step(s,.05);}};
 return{C,s,u,t,step,contact:()=>C.contacts(s)[0],local:()=>u.observation.contacts.T,events:()=>s.observationEvents||[]};
}
module.exports={core,fixture,original,mapFor};
