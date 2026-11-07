// Frozen independent WIP07A core from e9f037c. Never shipped in the game bundle.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const source=fs.readFileSync(path.resolve(__dirname,'../fixtures/sim-core-WIP07A.js'),'utf8');
const sha256=crypto.createHash('sha256').update(source).digest('hex');
if(sha256!=='ab70525f12138b068daf00198bd49611d883c940cd8ac8c6fcfeac5a55f2e49c')throw Error('Frozen LOS oracle changed');
function load(map,{observationMetadata=false}={}){
 const profiles=require('../../src/vehicle-profiles.js'),O=require('../../src/observation.js');
 const observation=observationMetadata?{...O,create(options){const raw=options.exposure;return O.create({...options,exposure:(u,t,...rest)=>{const result=raw(u,t,...rest),e=options.profileOf(t).exposure;return{...result,samples:result.samples.map((v,i)=>({x:v.x,y:v.y,part:v.part,along:i<6?e.hullAlong[Math.floor(i/2)]:e.turretAlong[i-6],z:i<6?e.hullHeights[i%2]:e.turretHeight,col:i<6?Math.floor(i/2):i-6,row:i<6?i%2:0,visible:v.visible,forestDepth:v.forestDepth}))};}});}}:O;
 return new Function('BATTLEFIELD_DATA','VEHICLE_PROFILES','TacticalObservation','module',source+'\nreturn module.exports;')(map,profiles,observation,{exports:{}});
}
module.exports={load,sha256};
