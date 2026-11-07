'use strict';
/* Public M1A2 baseline. Metres / seconds / kg. No SEP v2/v3 armour assumptions.
 * Values labelled estimate or tuning in data/vehicles/M1A2.json are deliberate
 * modelling choices, not measured or manufacturer-certified specifications. */
const VEHICLE_PROFILES=(()=>{
  const mph=v=>v*.44704,inch=v=>v*.0254;
  const M1A2={
    id:'M1A2',name:'M1A2 Abrams',variant:'M1A2 기본형',crew:4,
    artId:'M1A2',massKg:69.54*907.18474,engineHp:1500,
    model:{hullLength:inch(312),width:inch(144),overallLength:inch(387),roofHeight:inch(93.5),groundClearance:inch(19),barrelTip:inch(387)-inch(312)/2,turretLength:4.75,turretWidth:3.28,turretOrigin:.15,turretPivot:[.66,0],turretRingDiameter:2.159,muzzleLocal:[5.717,0]},
    mobility:{roadSpeed:mph(42),crossCountrySpeed:mph(30),reverseSpeed:mph(25),accelerationReferenceSpeed:mph(20),accelerationReferenceSeconds:7.2,brakeDeceleration:3,maxLongitudinalGrade:.60,maxSideGrade:.40,pivotRate:Math.PI/6,turretRate:40*Math.PI/180,
      gradeSpeedPoints:[[0,mph(42)],[.10,mph(17)],[.60,mph(4.1)]],
      surfaceSpeed:{forest:6.5,scrub:8,stream:6/3.6}},
    sensors:{name:'CITV',eyeHeight:2.65,observationLimit:4000,targetReferenceHeight:1.5,
      hunterKiller:true,
      ambient:{enabled:true,range:200,fov:Math.PI*2,eyeHeight:2.65},
      commander:{enabled:true,independent:true,range:2500,fov:Math.PI/2,rate:50*Math.PI/180,eyeHeight:2.65,scan:{amplitude:Math.PI/4,period:20,rate:15*Math.PI/180}},
      gunner:{enabled:true,range:2000,fov:Math.PI/6,rate:40*Math.PI/180,eyeHeight:2.65,scan:{amplitude:Math.PI/12,period:12,rate:8*Math.PI/180}},
      tuning:{queryPeriod:.1,geometryMaxAge:.5,detectThreshold:[.35,1.1],identifyThreshold:[1.4,3],
        evidenceHalfLife:8,memorySeconds:30,knowledgeSeconds:120,lossGrace:1.2,
        focusSeconds:2,focusLimit:8,revisitSeconds:12,designationSeconds:18,designationStale:6,acquireSeconds:.4}},
    weapons:{mainGun:{name:'M256',calibreMm:120,ammunitionCapacity:42,referenceEngagementRange:3000,enabled:true},coax:{name:'M240',calibreMm:7.62},commander:{name:'M2',calibreMm:12.7}},
    // Fictional game tuning, not measured real fire-control/ballistic data.
    fireControl:{enabled:true,aimSeconds:1.2,alignmentTolerance:1.5*Math.PI/180,
      maxRange:2000,fireHeight:2.2,shotIntervalSeconds:1,testRounds:42,
      dispersionMrad:.25,layStartMrad:1.5,layMinMrad:.10,layTauSeconds:.6,
      rangeErrorM:5,muzzleVelocity:1650,velocityRetention:.94,leadResidual:.10,
      stabMradPerMps:.03,impact:{rejectionAttempts:64,marchStepM:2,maxBeyondM:3000},
      presented:{hullBottom:inch(19),hullTop:1.65,turretTop:inch(93.5)}},
    exposure:{hullAlong:[-2.8,0,2.8],hullHeights:[.80,1.40],turretAlong:[-1,0,1],turretHeight:2.20},
    navigation:{clearanceMargin:.25,contract:'nav16-M1A2-r4.62-long0.60-side0.40-v2'}
  };
  M1A2.navigation.radius=Math.ceil((Math.hypot(M1A2.model.hullLength/2,M1A2.model.width/2)+M1A2.navigation.clearanceMargin)*100)/100;
  function clone(o){if(Array.isArray(o))return o.map(clone);if(o&&typeof o==='object')return Object.fromEntries(Object.entries(o).map(([k,v])=>[k,clone(v)]));return o;}
  function freeze(o){for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);return Object.freeze(o);}
  function createRegistry(entries){
    const profiles=Object.create(null);
    for(const input of entries){
      const p=clone(input),id=p?.id;
      if(typeof id!=='string'||!/^[A-Z][A-Z0-9_]*$/.test(id))throw Error('잘못된 차량 프로파일 ID');
      if(Object.hasOwn(profiles,id))throw Error('중복 차량 프로파일: '+id);
      if(p.artId!=='M1A2')throw Error('지원하지 않는 차량 도안: '+p.artId);
      for(const section of ['model','mobility','sensors','navigation','exposure','fireControl','weapons'])if(!p[section])throw Error('차량 프로파일 필드 누락: '+id+'.'+section);
      for(const field of ['turretPivot','muzzleLocal'])if(!Array.isArray(p.model[field])||p.model[field].length!==2||!p.model[field].every(Number.isFinite))throw Error('차량 좌표 값 오류: '+id+'.'+field);
      if(!Number.isFinite(p.model.turretOrigin)||!Number.isFinite(p.model.turretRingDiameter)||!(p.model.turretRingDiameter>0))throw Error('포탑 기준 값 오류: '+id);
      const f=p.fireControl;
      for(const field of ['accuracyNear','accuracyFar','selfMotionPenalty','targetMotionPenalty','motionReference','zoneWeights','maneuverAccel','maneuverReferenceSpeed','flightSeconds','effectSeconds'])if(Object.hasOwn(f,field))throw Error('폐기된 사격 필드: '+id+'.'+field);
      for(const field of ['aimSeconds','alignmentTolerance','maxRange','fireHeight','shotIntervalSeconds','testRounds','dispersionMrad','layStartMrad','layMinMrad','layTauSeconds','rangeErrorM','muzzleVelocity','velocityRetention'])if(!Number.isFinite(f[field])||f[field]<=0)throw Error('사격 프로파일 값 오류: '+id+'.'+field);
      for(const field of ['leadResidual','stabMradPerMps'])if(!Number.isFinite(f[field])||f[field]<0)throw Error('사격 오차 값 오류: '+id+'.'+field);
      if(!f.impact||!Number.isInteger(f.impact.rejectionAttempts)||!['rejectionAttempts','marchStepM','maxBeyondM'].every(field=>Number.isFinite(f.impact[field])&&f.impact[field]>0))throw Error('탄착 프로파일 값 오류: '+id+'.impact');
      const band=f.presented;
      if(!Number.isInteger(f.testRounds)||f.layStartMrad<f.layMinMrad||!band||!['hullBottom','hullTop','turretTop'].every(k=>Number.isFinite(band[k]))||!(band.hullBottom<band.hullTop&&band.hullTop<band.turretTop))throw Error('시험탄/조준/제시 높이 오류: '+id);
      profiles[id]=freeze(p);
    }
    const ids=Object.freeze(Object.keys(profiles));
    const registry=Object.freeze({ids:()=>ids,list:()=>ids.map(id=>profiles[id]),has:id=>Object.hasOwn(profiles,id),
      get(id){if(!Object.hasOwn(profiles,id))throw Error('등록되지 않은 차량: '+id);return profiles[id];},create:createRegistry});
    // Preserve the legacy M1A2 lookup for old tools/oracle; runtime uses registry.
    Object.defineProperty(profiles,'registry',{value:registry,enumerable:false});
    return Object.freeze(profiles);
  }
  return createRegistry([M1A2]);
})();
if(typeof module!=='undefined')module.exports=VEHICLE_PROFILES;
