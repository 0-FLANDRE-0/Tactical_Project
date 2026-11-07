// Frozen independent WIP07A core from e9f037c. Never shipped in the game bundle.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const source=fs.readFileSync(path.resolve(__dirname,'../fixtures/sim-core-WIP07A.js'),'utf8');
const sha256=crypto.createHash('sha256').update(source).digest('hex');
if(sha256!=='ab70525f12138b068daf00198bd49611d883c940cd8ac8c6fcfeac5a55f2e49c')throw Error('Frozen LOS oracle changed');
function load(map){return new Function('BATTLEFIELD_DATA','VEHICLE_PROFILES','TacticalObservation','module',source+'\nreturn module.exports;')(map,require('../../src/vehicle-profiles.js'),require('../../src/observation.js'),{exports:{}});}
module.exports={load,sha256};
