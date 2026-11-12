const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2),value=(flag,fallback)=>{const i=args.indexOf(flag);return i>=0?args[i+1]:fallback;},inputValue=value('--input',null),scriptValue=value('--script-output',null);
const mapPath=path.resolve(root,inputValue||'data/rasdorf_4km.json'),output=path.resolve(root,value('--output',path.relative(root,mapPath))),scriptOutput=scriptValue?path.resolve(root,scriptValue):inputValue?null:path.join(root,'src/battlefield-data.js');
const map=JSON.parse(fs.readFileSync(mapPath,'utf8'));delete map.navigation;
const moduleHolder={exports:{}},start=performance.now(),profiles=require('../src/vehicle-profiles.js'),MapSpec=require('../src/map-spec.js');
MapSpec.validate(map);
const C=new Function('BATTLEFIELD_DATA','TacticalMapSpec','VEHICLE_PROFILES','TacticalMobility','TacticalAI','TacticalObservation','TacticalCombatState','TacticalFireControl','TacticalVehicleGeometry','module',fs.readFileSync(path.join(root,'src/sim-core.js'),'utf8')+'\nreturn module.exports;')(map,MapSpec,profiles,require('../src/mobility.js'),require('../src/tactical-ai.js'),require('../src/observation.js'),require('../src/combat-state.js'),require('../src/fire-control.js'),require('../src/vehicle-geometry.js'),moduleHolder);
const n=C.bakeNavigation();
map.navigation={contract:n.contract,sourceHash:map.meta.mapHash,cols:n.cols,rows:n.rows,costs:Buffer.from(n.costs.buffer).toString('base64'),edges:Buffer.from(n.edges.buffer).toString('base64')};
const json=JSON.stringify(map);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,json);if(scriptOutput){fs.mkdirSync(path.dirname(scriptOutput),{recursive:true});fs.writeFileSync(scriptOutput,'const BATTLEFIELD_DATA = '+json+';\n');}
console.log(JSON.stringify({input:mapPath,output,scriptOutput,bakeMs:Math.round(performance.now()-start),nodes:n.costs.length,passable:Array.from(n.costs).filter(Number.isFinite).length,mapBytes:Buffer.byteLength(json),sourceHash:map.meta.mapHash}));
