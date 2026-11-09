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
      surfaceSpeed:{forest:6.5,scrub:8,stream:6/3.6},
      // X1100 range ratios are an adopted public-reference profile. Force,
      // shift schedule, steering and interlock values are lightweight game
      // approximations calibrated only to the published 0-20 mph endpoint.
      powertrain:{referenceMassKg:69.54*907.18474,referenceEngineHp:1500,efficiency:.90,
        forwardRatios:[5.877,3.021,1.891,1.278],reverseRatios:[8.305,2.354],
        forwardUpshiftMps:[4.2,8.1,13.2],forwardDownshiftMps:[3.4,7.1,11.8],
        reverseUpshiftMps:[5.2],reverseDownshiftMps:[4.2],
        shiftSeconds:.42,shiftDwellSeconds:1.20,minimumGearHoldSeconds:.65,rangeEngageSeconds:.28,
        directionStopSpeed:.25,directionSettleSeconds:.18,holdSpeed:.08,zeroSpeedEpsilon:.015,targetSpeedTolerance:.015,
        launchAcceleration:1.645,launchPowerExponent:.35,gearForceExponent:.22,powerFloorSpeed:4,
        rollingDeceleration:.035,shiftDriveFraction:.12,lateralAcceleration:1.8,pivotMaxSpeed:1.2,
        arrivalRadius:.8,arrivalSpeed:.18}},
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
      maxRange:2000,fireHeight:2.2,testRounds:42,
      dispersionMrad:.25,layStartMrad:1.5,layMinMrad:.10,layTauSeconds:.6,
      rangeErrorM:5,muzzleVelocity:1650,velocityRetention:.94,leadResidual:.10,
      stabMradPerMps:.03,impact:{rejectionAttempts:64,marchStepM:2,maxBeyondM:3000},
      movement:{fireOnMove:true,stationarySpeedMps:.10,stationaryHoldSeconds:.35},
      // WIP15 game trial values. They model an abstract loader and temporary
      // crew/equipment response; they are not measured vehicle specifications.
      readiness:{reloadSeconds:5.98,reloadMaxSeconds:14,
        fatigue:{maxSeconds:5,startsAtShot:4,perShotSeconds:.35,recoveryPerSecond:.25,burstResetSeconds:6},
        shock:{maxSeconds:5,recoveryPerSecond:.25,normalSeconds:.25,nearSeconds:1,penetrationSeconds:2.5},
        nearNonPenetration:{maxDeficit:15,chance:.30,damagePoints:[[0,120],[5,80],[10,35],[15,0]]},
        temporaryFault:{baseChance:.02,damageScaleChance:.18,damageReference:405,durationSeconds:[3,8],
          observationAimRateMultiplier:.70,observationSigmaMultiplier:1.25,
          kinds:{fireControl:.50,commander:.25,gunner:.25}}},
      presented:{hullBottom:inch(19),hullTop:1.65,turretTop:inch(93.5)}},
    exposure:{hullAlong:[-2.8,0,2.8],hullHeights:[.80,1.40],turretAlong:[-1,0,1],turretHeight:2.20},
    navigation:{clearanceMargin:.25,contract:'nav16-M1A2-r4.62-long0.60-side0.40-v2'}
  };
  M1A2.navigation.radius=Math.ceil((Math.hypot(M1A2.model.hullLength/2,M1A2.model.width/2)+M1A2.navigation.clearanceMargin)*100)/100;
  function clone(o){if(Array.isArray(o))return o.map(clone);if(o&&typeof o==='object')return Object.fromEntries(Object.entries(o).map(([k,v])=>[k,clone(v)]));return o;}
  // Active symmetric WIP11A trial configuration. Unchanged dimensions,
  // mobility, sensors and artwork are explicit inherited game settings.
  const M1A2_1998=clone(M1A2);
  Object.assign(M1A2_1998,{id:'M1A2_1998',name:'M1A2 Abrams (1998)',variant:'M1A2 (1998) 시험 구성'});
  Object.assign(M1A2_1998.weapons.mainGun,{ammunitionId:'M829A2',ammunitionName:'M829A2'});
  M1A2_1998.fireControl.muzzleVelocity=1680;
  M1A2_1998.combat={maxHp:1450,armor:{
    hullFront:{ke:390,ce:720},hullSide:{ke:120,ce:280},hullRear:{ke:40,ce:40},
    turretFront:{ke:720,ce:1150},turretSide:{ke:340,ce:630},turretRear:{ke:55,ce:55},upper:{ke:40,ce:40}
  }};
  function freeze(o){for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);return Object.freeze(o);}
  function createRegistry(entries){
    const profiles=Object.create(null);
    for(const input of entries){
      const p=clone(input),id=p?.id;
      if(typeof id!=='string'||!/^[A-Z][A-Z0-9_]*$/.test(id))throw Error('잘못된 차량 프로파일 ID');
      if(Object.hasOwn(profiles,id))throw Error('중복 차량 프로파일: '+id);
      if(p.artId!=='M1A2')throw Error('지원하지 않는 차량 도안: '+p.artId);
      for(const section of ['model','mobility','sensors','navigation','exposure','fireControl','weapons'])if(!p[section])throw Error('차량 프로파일 필드 누락: '+id+'.'+section);
      const pt=p.mobility.powertrain;
      if(!pt||!['forwardRatios','reverseRatios','forwardUpshiftMps','forwardDownshiftMps','reverseUpshiftMps','reverseDownshiftMps'].every(k=>Array.isArray(pt[k])))throw Error('구동 프로파일 누락: '+id);
      if(pt.forwardRatios.length!==4||pt.reverseRatios.length!==2||pt.forwardUpshiftMps.length!==3||pt.forwardDownshiftMps.length!==3||pt.reverseUpshiftMps.length!==1||pt.reverseDownshiftMps.length!==1)throw Error('변속 표 길이 오류: '+id);
      if(![...pt.forwardRatios,...pt.reverseRatios,...pt.forwardUpshiftMps,...pt.forwardDownshiftMps,...pt.reverseUpshiftMps,...pt.reverseDownshiftMps].every(v=>Number.isFinite(v)&&v>0))throw Error('변속 표 값 오류: '+id);
      if(!pt.forwardUpshiftMps.every((v,i)=>v>pt.forwardDownshiftMps[i])||!pt.reverseUpshiftMps.every((v,i)=>v>pt.reverseDownshiftMps[i]))throw Error('변속 히스테리시스 오류: '+id);
      for(const k of ['referenceMassKg','referenceEngineHp','efficiency','shiftSeconds','shiftDwellSeconds','minimumGearHoldSeconds','rangeEngageSeconds','directionStopSpeed','directionSettleSeconds','holdSpeed','zeroSpeedEpsilon','targetSpeedTolerance','launchAcceleration','launchPowerExponent','gearForceExponent','powerFloorSpeed','rollingDeceleration','shiftDriveFraction','lateralAcceleration','pivotMaxSpeed','arrivalRadius','arrivalSpeed'])if(!Number.isFinite(pt[k])||pt[k]<0||(['referenceMassKg','referenceEngineHp','efficiency','shiftSeconds','shiftDwellSeconds','minimumGearHoldSeconds','rangeEngageSeconds','directionStopSpeed','directionSettleSeconds','launchAcceleration','powerFloorSpeed','lateralAcceleration','arrivalRadius','arrivalSpeed'].includes(k)&&pt[k]===0))throw Error('구동 값 오류: '+id+'.'+k);
      for(const field of ['turretPivot','muzzleLocal'])if(!Array.isArray(p.model[field])||p.model[field].length!==2||!p.model[field].every(Number.isFinite))throw Error('차량 좌표 값 오류: '+id+'.'+field);
      if(!Number.isFinite(p.model.turretOrigin)||!Number.isFinite(p.model.turretRingDiameter)||!(p.model.turretRingDiameter>0))throw Error('포탑 기준 값 오류: '+id);
      const f=p.fireControl;
      for(const field of ['accuracyNear','accuracyFar','selfMotionPenalty','targetMotionPenalty','motionReference','zoneWeights','maneuverAccel','maneuverReferenceSpeed','flightSeconds','effectSeconds'])if(Object.hasOwn(f,field))throw Error('폐기된 사격 필드: '+id+'.'+field);
      if(Object.hasOwn(f,'shotIntervalSeconds'))throw Error('폐기된 사격 필드: '+id+'.shotIntervalSeconds');
      for(const field of ['aimSeconds','alignmentTolerance','maxRange','fireHeight','testRounds','dispersionMrad','layStartMrad','layMinMrad','layTauSeconds','rangeErrorM','muzzleVelocity','velocityRetention'])if(!Number.isFinite(f[field])||f[field]<=0)throw Error('사격 프로파일 값 오류: '+id+'.'+field);
      for(const field of ['leadResidual','stabMradPerMps'])if(!Number.isFinite(f[field])||f[field]<0)throw Error('사격 오차 값 오류: '+id+'.'+field);
      if(!f.movement||typeof f.movement.fireOnMove!=='boolean'||!Number.isFinite(f.movement.stationarySpeedMps)||f.movement.stationarySpeedMps<0||!Number.isFinite(f.movement.stationaryHoldSeconds)||f.movement.stationaryHoldSeconds<0)throw Error('이동 사격 프로파일 값 오류: '+id+'.movement');
      const ready=f.readiness,fatigue=ready?.fatigue,shock=ready?.shock,near=ready?.nearNonPenetration,fault=ready?.temporaryFault;
      if(!ready||!fatigue||!shock||!near||!fault)throw Error('장전/피격 반응 프로파일 누락: '+id);
      if(![ready.reloadSeconds,ready.reloadMaxSeconds,fatigue.maxSeconds,fatigue.perShotSeconds,fatigue.recoveryPerSecond,fatigue.burstResetSeconds,shock.maxSeconds,shock.recoveryPerSecond,shock.normalSeconds,shock.nearSeconds,shock.penetrationSeconds,near.maxDeficit,near.chance,fault.baseChance,fault.damageScaleChance,fault.damageReference,fault.observationAimRateMultiplier,fault.observationSigmaMultiplier].every(Number.isFinite)||ready.reloadSeconds<=0||ready.reloadMaxSeconds<ready.reloadSeconds||ready.reloadMaxSeconds>14||fatigue.maxSeconds<0||shock.maxSeconds<0||!Number.isInteger(fatigue.startsAtShot)||fatigue.startsAtShot<1||fatigue.perShotSeconds<0||fatigue.recoveryPerSecond<0||fatigue.burstResetSeconds<=0||shock.recoveryPerSecond<0||shock.normalSeconds<0||shock.nearSeconds<shock.normalSeconds||shock.penetrationSeconds<shock.nearSeconds||near.maxDeficit<=0||near.chance<0||near.chance>1||fault.baseChance<0||fault.damageScaleChance<0||fault.baseChance+fault.damageScaleChance>1||fault.damageReference<=0||fault.observationAimRateMultiplier<=0||fault.observationAimRateMultiplier>1||fault.observationSigmaMultiplier<1)throw Error('장전/피격 반응 프로파일 값 오류: '+id);
      if(!Array.isArray(near.damagePoints)||near.damagePoints.length<2||near.damagePoints[0][0]!==0||near.damagePoints.at(-1)[0]!==near.maxDeficit||near.damagePoints.some((v,i)=>!Array.isArray(v)||v.length!==2||!v.every(Number.isFinite)||v[1]<0||(i&&v[0]<=near.damagePoints[i-1][0])))throw Error('근접 비관통 피해 표 오류: '+id);
      const faultKindNames=['fireControl','commander','gunner'];
      if(!Array.isArray(fault.durationSeconds)||fault.durationSeconds.length!==2||!fault.durationSeconds.every(Number.isFinite)||fault.durationSeconds[0]<3||fault.durationSeconds[1]>8||fault.durationSeconds[1]<fault.durationSeconds[0]||!fault.kinds||Object.keys(fault.kinds).length!==faultKindNames.length||!faultKindNames.every(k=>Object.hasOwn(fault.kinds,k))||Math.abs(Object.values(fault.kinds).reduce((a,b)=>a+b,0)-1)>1e-9||Object.values(fault.kinds).some(v=>!Number.isFinite(v)||v<0))throw Error('일시 이상 프로파일 값 오류: '+id);
      if(!f.impact||!Number.isInteger(f.impact.rejectionAttempts)||!['rejectionAttempts','marchStepM','maxBeyondM'].every(field=>Number.isFinite(f.impact[field])&&f.impact[field]>0))throw Error('탄착 프로파일 값 오류: '+id+'.impact');
      const band=f.presented;
      if(!Number.isInteger(f.testRounds)||f.layStartMrad<f.layMinMrad||!band||!['hullBottom','hullTop','turretTop'].every(k=>Number.isFinite(band[k]))||!(band.hullBottom<band.hullTop&&band.hullTop<band.turretTop))throw Error('시험탄/조준/제시 높이 오류: '+id);
      if(p.combat){
        if(!Number.isFinite(p.combat.maxHp)||p.combat.maxHp<=0)throw Error('전투 HP 값 오류: '+id);
        if(typeof p.weapons.mainGun.ammunitionId!=='string'||!p.weapons.mainGun.ammunitionId)throw Error('탄약 ID 누락: '+id);
        for(const zone of ['hullFront','hullSide','hullRear','turretFront','turretSide','turretRear','upper'])for(const kind of ['ke','ce'])if(!Number.isFinite(p.combat.armor?.[zone]?.[kind])||p.combat.armor[zone][kind]<0)throw Error('장갑 값 오류: '+id+'.'+zone+'.'+kind);
      }
      profiles[id]=freeze(p);
    }
    const ids=Object.freeze(Object.keys(profiles));
    const registry=Object.freeze({ids:()=>ids,list:()=>ids.map(id=>profiles[id]),has:id=>Object.hasOwn(profiles,id),
      get(id){if(!Object.hasOwn(profiles,id))throw Error('등록되지 않은 차량: '+id);return profiles[id];},create:createRegistry});
    // Preserve the legacy M1A2 lookup for old tools/oracle; runtime uses registry.
    Object.defineProperty(profiles,'registry',{value:registry,enumerable:false});
    return Object.freeze(profiles);
  }
  return createRegistry([M1A2,M1A2_1998]);
})();
if(typeof module!=='undefined')module.exports=VEHICLE_PROFILES;
