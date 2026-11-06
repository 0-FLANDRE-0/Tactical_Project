const fs=require('fs'),path=require('path'),profile=require('../src/vehicle-profiles.js').M1A2;
const sourceDir=path.join(__dirname,'../data/vehicles');fs.mkdirSync(sourceDir,{recursive:true});
const record={profile,baseline:'M1A2 basic; not M1A2 SEP v2/v3',reviewed:'2026-11-06',
 sources:[
  {id:'GDLS',title:'Abrams M1A2 — Features & Specifications',url:'https://international.gdls.com/english/products/ABRAMS/M1A2.pdf',page:2,scope:'M1A2 dimensions, nominal weight, propulsion, forward performance, acceleration, ammunition'},
  {id:'DOD1993',title:'DoD IG Report 93-130, Appendix A — M1A2 characteristics',url:'https://media.defense.gov/1993/Jun/25/2001714749/-1/-1/1/93-130.pdf',scope:'Contemporaneous M1A2 cross-check; indexed extract available, PDF fetch returned 403'},
  {id:'USMC',title:'MCWP 3-12 Marine Corps Tank Employment (2005)',url:'https://www.marines.mil/Portals/1/Publications/MCWP%203-12%20Marine%20Corps%20Tank%20Employment.pdf',pages:['A-1','A-2','A-3'],scope:'M1A1 shared-family hull dimensions and reverse-speed reference, explicitly inherited rather than M1A2-specific measurement'},
  {id:'USArmyTC',title:'TC 21-306 Tracked Combat Vehicle Driver Training (June 2019)',url:'https://www.scribd.com/document/509307797/ARN17893-TC-21-306-FINAL-Web-3',pages:['A-4','A-5'],scope:'Army-authored public manual mirror: M1A2 SEP reverse 25mph, longitudinal 60% and side slope 40%; used as family-level assumptions'},
  {id:'USArmyATP',title:'ATP 3-20.15 Tank Platoon',url:'https://rdl.train.army.mil/catalog-ws/view/100.ATSC/2F4F8430-78F6-459A-A9A5-DFC8E73007E0-1356018579249/atp3_20x15.pdf',scope:'CITV independent commander observation role; no exact optical-axis height specified'}
 ],
 fieldEvidence:{
  'model.overallLength':{status:'published',source:'GDLS',original:'387 in, gun forward'},
  'model.width':{status:'published',source:'GDLS',original:'144 in'},
  'model.roofHeight':{status:'published',source:'GDLS',original:'93.5 in turret height; excludes viewer/weapon overall height'},
  'model.hullLength':{status:'shared-family approximation',source:'USMC',original:'312 in M1A1 side-view hull drawing; inherited chassis envelope'},
  'model.barrelTip':{status:'derived geometry',formula:'overallLength - hullLength/2; hull-centred coordinate origin'},
  'model.turretLength,model.turretWidth,model.turretCenter':{status:'visual approximation',note:'Top-view silhouette only, not a measured armour layout'},
  'massKg':{status:'published nominal, converted',source:'GDLS',original:'69.54 US short tons (manufacturer labels curb weight)'},
  'mobility.roadSpeed,mobility.crossCountrySpeed':{status:'published',source:'GDLS',original:'42 mph governed / 30 mph cross-country'},
  'mobility.reverseSpeed':{status:'shared-family assumption',sources:['USMC','USArmyTC'],original:'25 mph paved level surface; family and SEP manual reference'},
  'mobility.accelerationReferenceSpeed,mobility.accelerationReferenceSeconds':{status:'published average acceleration target',source:'GDLS',original:'0–20 mph in 7.2 s; simplified integrator calibrated to this endpoint'},
  'mobility.gradeSpeedPoints':{status:'published anchors plus game interpolation',source:'GDLS',original:'10% grade 17 mph, 60% grade 4.1 mph; downhill symmetry is tuning'},
  'mobility.maxLongitudinalGrade,mobility.maxSideGrade':{status:'family/SEP assumption',sources:['GDLS','USArmyTC'],original:'60% longitudinal, 40% side grade; combined inclines handled conservatively'},
  'mobility.pivotRate,mobility.turretRate,mobility.brakeDeceleration,mobility.surfaceSpeed':{status:'game tuning',note:'No measured timing/traction/braking curves claimed'},
  'sensors.eyeHeight':{status:'geometry estimate',value:2.65,note:'User-selected CITV-level viewpoint above ground; NOT turret-roof height and NOT an exact published optical-axis measurement'},
  'sensors.ambient,sensors.commander,sensors.gunner,sensors.hunterKiller,sensors.tuning':{status:'fictional game tuning',note:'WIP07 direction/time/seed rules; 200m silhouette-only, commander 2500m 90deg 50deg/s, gunner 2000m 60deg 40deg/s. Equipment flags independent of hunter-killer. See docs/OBSERVATION_WIP07.md for evidence, memory and designation defaults.'},
  'sensors.observationLimit':{status:'game tuning',value:4000,note:'Observation computation cap; not an actual guaranteed detection or identification distance'},
  'weapons.mainGun.referenceEngagementRange':{status:'game tuning',value:3000,note:'Future engagement reference only; not a ballistic maximum and does not limit LOS'},
  'weapons.mainGun.ammunitionCapacity':{status:'published capacity only',source:'GDLS',value:42,note:'No ammo split, reload, damage, penetration or firing implemented'},
  'exposure':{status:'game geometry samples',note:'Hull/turret sample locations follow model heights; not a hit probability model'},
  'navigation':{status:'derived conservative clearance',formula:'ceil((hypot(hullLength/2,width/2)+0.25)*100)/100 = 4.62m',note:'Cannon tube does not collide; 16m navigation nodes and conservative circle are retained'}
 },limits:['Mass and engine rating are profile metadata, not a full powertrain simulation','Observation channels use fictional RTS timing and seeded thresholds, terrain/building/forest geometry; no weather, night or real thermal-sensor performance model','No SEP armour values or specific ammunition performance are inferred']};
fs.writeFileSync(path.join(sourceDir,'M1A2.json'),JSON.stringify(record,null,2)+'\n');console.log('Exported M1A2 values and per-field provenance');

const art=require('../src/m1a2-art.js'),svg=art.toSVG();
fs.writeFileSync(path.join(sourceDir,'M1A2_top_view.svg'),svg);
const qa=path.join(__dirname,'../dist/qa');fs.mkdirSync(qa,{recursive:true});
fs.writeFileSync(path.join(qa,'M1A2_top_view.svg'),svg);
fs.writeFileSync(path.join(qa,'M1A2_rotated_turret.svg'),art.toSVG({turretHeading:Math.PI/4}));
