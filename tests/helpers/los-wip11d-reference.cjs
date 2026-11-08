// Frozen integrated WIP11D core from a668f9b. Never shipped in the game bundle.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const source=fs.readFileSync(path.resolve(__dirname,'../fixtures/sim-core-WIP11D.js'),'utf8');
const sha256=crypto.createHash('sha256').update(source).digest('hex');
if(sha256!=='8ee5cc9f4374db0afcffaf9ae49df9e6c818a089fd72a7f1319f29c994788ee8')throw Error('Frozen WIP11D LOS reference changed');
function load(map){
 const profiles=require('../../src/vehicle-profiles.js'),O=require('../../src/observation.js');
 return new Function('BATTLEFIELD_DATA','VEHICLE_PROFILES','TacticalObservation','TacticalCombatState','TacticalFireControl','TacticalVehicleGeometry','module',source+'\nreturn module.exports;')(
  map,profiles,O,require('../../src/combat-state.js'),require('../../src/fire-control.js'),require('../../src/vehicle-geometry.js'),{exports:{}});
}
module.exports={load,sha256};
