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
  // WIP19 game-trial ammunition layout. It belongs only to the 1998 trial
  // profile and does not alter the baseline M1A2 or the archived 1989 presets.
  M1A2_1998.ammunition={enabled:true,supported:['M829A2','M829A1','M830'],autoPriority:['M829A2','M829A1','M830'],sourcePriority:['ready','semiReady','reserve'],
    initial:{loaded:'M829A2',preference:'auto',sections:{ready:{M829A2:7,M829A1:4,M830:6},semiReady:{M829A2:8,M829A1:6,M830:4},reserve:{M829A2:2,M829A1:2,M830:2}}},
    sections:{ready:{capacity:17,prepareSeconds:0},semiReady:{capacity:18,prepareSeconds:3},reserve:{capacity:6,prepareSeconds:10}},
    replenish:{idleSeconds:10,stationarySpeedMps:.10,targets:{M829A2:7,M829A1:4,M830:6},seconds:{semiReady:4,reserve:8},sourcePriority:['semiReady','reserve']}};
  // WIP20 game-trial ammunition incident table. These probabilities and
  // compartment mappings are fictional tuning and belong only to M1A2_1998.
  M1A2_1998.ammoIncidents={enabled:true,victimProfileId:'M1A2_1998',partialLossFraction:.25,safetySeconds:8,
    policies:{
      'tank-ammo-incident/M829A2':{ammoId:'M829A2',baseChance:.30},
      'tank-ammo-incident/M829A1':{ammoId:'M829A1',baseChance:.30},
      'tank-ammo-incident/M830':{ammoId:'M830',baseChance:.40}},
    storedAmmoResponse:{M829A2:1,M829A1:1,M830:1},
    compartments:{
      ready:{capacity:17,transferFactor:.50,outcomes:{ammoLoss:.70,isolatedFire:.28,fatal:.02}},
      semiReady:{capacity:18,transferFactor:.65,outcomes:{ammoLoss:.65,isolatedFire:.32,fatal:.03}},
      reserve:{capacity:6,transferFactor:.80,outcomes:{ammoLoss:.60,isolatedFire:.35,fatal:.05}}},
    rows:{
      hullFront:{ready:0,semiReady:.10,reserve:.15,none:.75},
      hullSide:{ready:.05,semiReady:.15,reserve:.30,none:.50},
      hullRear:{ready:0,semiReady:.10,reserve:.20,none:.70},
      turretFront:{ready:.10,semiReady:.10,reserve:0,none:.80},
      turretSide:{ready:.30,semiReady:.20,reserve:0,none:.50},
      turretRear:{ready:.40,semiReady:.25,reserve:0,none:.35},
      upper:{ready:.15,semiReady:.15,reserve:.10,none:.60}}};
  M1A2_1998.combat={maxHp:1450,armor:{
    hullFront:{ke:390,ce:720},hullSide:{ke:120,ce:280},hullRear:{ke:40,ce:40},
    turretFront:{ke:720,ce:1150},turretSide:{ke:340,ce:630},turretRear:{ke:55,ce:55},upper:{ke:40,ce:40}
  }};
  // WIP18 game-trial values. This block is deliberately attached only to the
  // 1998 trial profile; the M1A2 baseline and future vehicles stay disabled
  // until they receive their own explicit susceptibility and policy data.
  const zones=['hullFront','hullSide','hullRear','turretFront','turretSide','turretRear','upper'];
  const allowedCrewRoles=['driver','commander','gunner','loader'];
  const reactionCategories=['temporaryFault','crewLight','crewSerious'];
  const probabilities=(temporaryFault,crewLight,crewSerious)=>({temporaryFault,crewLight,crewSerious});
  const zero=()=>Object.fromEntries(zones.map(zone=>[zone,probabilities(0,0,0)]));
  M1A2_1998.hitReactions={enabled:true,victimProfileId:'M1A2_1998',roles:['driver','commander','gunner','loader'],susceptibility:{temporaryFault:1,crewLight:1,crewSerious:1},
    policies:{'tank-ke/M829A2':{ammoId:'M829A2',rows:{
      ricochet:zero(),nonPenetration:zero(),
      nearNonPenetration:Object.fromEntries(zones.map((zone,i)=>[zone,probabilities([.015,.025,.035,.015,.025,.03,.025][i],0,0)])),
      penetration:Object.fromEntries(zones.map((zone,i)=>[zone,probabilities([.05,.07,.10,.04,.06,.08,.06][i],[.03,.05,.03,.04,.07,.05,.05][i],[.005,.01,.005,.005,.01,.01,.01][i])]))},
      faultWeights:{
        hullFront:{mobility:1,turretDrive:0},hullSide:{mobility:1,turretDrive:0},hullRear:{mobility:1,turretDrive:0},
        turretFront:{mobility:0,turretDrive:1},turretSide:{mobility:0,turretDrive:1},turretRear:{mobility:0,turretDrive:1},upper:{mobility:.5,turretDrive:.5}},
      crewWeights:{light:{
        hullFront:{driver:.70,commander:.10,gunner:.10,loader:.10},hullSide:{driver:.40,commander:.20,gunner:.20,loader:.20},hullRear:{driver:.55,commander:.15,gunner:.15,loader:.15},
        turretFront:{driver:.05,commander:.20,gunner:.50,loader:.25},turretSide:{driver:.05,commander:.30,gunner:.30,loader:.35},turretRear:{driver:.05,commander:.20,gunner:.25,loader:.50},upper:{driver:.25,commander:.25,gunner:.25,loader:.25}},
        serious:{
        hullFront:{driver:.70,commander:.10,gunner:.10,loader:.10},hullSide:{driver:.40,commander:.20,gunner:.20,loader:.20},hullRear:{driver:.55,commander:.15,gunner:.15,loader:.15},
        turretFront:{driver:.05,commander:.20,gunner:.50,loader:.25},turretSide:{driver:.05,commander:.30,gunner:.30,loader:.35},turretRear:{driver:.05,commander:.20,gunner:.25,loader:.50},upper:{driver:.25,commander:.25,gunner:.25,loader:.25}}}}},
    faults:{mobility:{factor:.65,durationSeconds:[6,10]},turretDrive:{factor:.60,durationSeconds:[6,10]}},
    crewEffects:{driver:{light:{drivePower:.85,hullTurn:.90},serious:{drivePower:.65,hullTurn:.75}},commander:{light:{commanderTurn:.85},serious:{commanderTurn:.65}},gunner:{light:{aimRate:.85,sigma:1.10},serious:{aimRate:.65,sigma:1.30}},loader:{light:{reloadEfficiency:.85},serious:{reloadEfficiency:.65}}}};
  const a2Reaction=M1A2_1998.hitReactions.policies['tank-ke/M829A2'];
  M1A2_1998.hitReactions.policies['tank-ke/M829A1']=clone(a2Reaction);
  M1A2_1998.hitReactions.policies['tank-ke/M829A1'].ammoId='M829A1';
  M1A2_1998.hitReactions.policies['tank-heat/M830']=clone(a2Reaction);
  M1A2_1998.hitReactions.policies['tank-heat/M830'].ammoId='M830';
  M1A2_1998.hitReactions.policies['tank-heat/M830'].rows.ricochet=zero();
  M1A2_1998.hitReactions.policies['tank-heat/M830'].rows.nonPenetration=zero();
  M1A2_1998.hitReactions.policies['tank-heat/M830'].rows.nearNonPenetration=zero();
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
      if(p.ammunition){
        const a=p.ammunition,ids=a.supported,sections=['ready','semiReady','reserve'];
        if(a.enabled!==true||!Array.isArray(ids)||!ids.length||ids.length!==new Set(ids).size||!ids.every(v=>typeof v==='string'&&v))throw Error('탄약 운용 설정 오류: '+id);
        if(!Array.isArray(a.autoPriority)||a.autoPriority.length!==ids.length||new Set(a.autoPriority).size!==ids.length||!a.autoPriority.every(v=>ids.includes(v)))throw Error('탄약 자동 우선순위 오류: '+id);
        if(!Array.isArray(a.sourcePriority)||a.sourcePriority.length!==sections.length||!sections.every(v=>a.sourcePriority.includes(v)))throw Error('탄약 구획 우선순위 오류: '+id);
        if(!ids.includes(a.initial?.loaded)||!['auto',...ids].includes(a.initial?.preference))throw Error('초기 장전탄/선택 오류: '+id);
        let total=1;
        for(const section of sections){const rule=a.sections?.[section],stock=a.initial?.sections?.[section];if(!rule||!Number.isInteger(rule.capacity)||rule.capacity<0||!Number.isFinite(rule.prepareSeconds)||rule.prepareSeconds<0||!stock||Object.keys(stock).length!==ids.length||!ids.every(ammoId=>Object.hasOwn(stock,ammoId)&&Number.isInteger(stock[ammoId])&&stock[ammoId]>=0))throw Error('탄약 구획 설정 오류: '+id+'.'+section);const count=ids.reduce((sum,ammoId)=>sum+stock[ammoId],0);if(count!==rule.capacity)throw Error('탄약 구획 용량 불일치: '+id+'.'+section);total+=count;}
        if(total!==p.weapons.mainGun.ammunitionCapacity)throw Error('탄약 총량 불일치: '+id);
        const rep=a.replenish;if(!rep||!Number.isFinite(rep.idleSeconds)||rep.idleSeconds<0||!Number.isFinite(rep.stationarySpeedMps)||rep.stationarySpeedMps<0||!Array.isArray(rep.sourcePriority)||!rep.sourcePriority.every(v=>['semiReady','reserve'].includes(v))||Object.keys(rep.targets||{}).length!==ids.length||!ids.every(ammoId=>Number.isInteger(rep.targets[ammoId])&&rep.targets[ammoId]>=0)||ids.reduce((sum,ammoId)=>sum+rep.targets[ammoId],0)>a.sections.ready.capacity||!['semiReady','reserve'].every(section=>Number.isFinite(rep.seconds?.[section])&&rep.seconds[section]>0))throw Error('탄약 보충 설정 오류: '+id);
      }
      if(p.ammoIncidents){
        const a=p.ammoIncidents;
        if(a.enabled===false){if(Object.keys(a).length!==1)throw Error('비활성 탄약고 사고 설정 오류: '+id);}
        else{
          const ammo=p.ammunition,sections=['ready','semiReady','reserve'],outcomes=['ammoLoss','isolatedFire','fatal'];
          if(a.enabled!==true||a.victimProfileId!==id||!ammo?.enabled)throw Error('탄약고 사고 활성 연결 오류: '+id);
          if(!Number.isFinite(a.partialLossFraction)||a.partialLossFraction<=0||a.partialLossFraction>1||!Number.isFinite(a.safetySeconds)||a.safetySeconds<=0)throw Error('탄약고 사고 시간/손실 값 오류: '+id);
          const ids=ammo.supported,policies=Object.entries(a.policies||{});
          if(policies.length!==ids.length||!ids.every(ammoId=>policies.some(([policyId,policy])=>policyId==='tank-ammo-incident/'+ammoId&&policy?.ammoId===ammoId&&Number.isFinite(policy.baseChance)&&policy.baseChance>=0&&policy.baseChance<=1)))throw Error('탄약고 사고 탄약 정책 오류: '+id);
          if(Object.keys(a.storedAmmoResponse||{}).length!==ids.length||!ids.every(ammoId=>Object.hasOwn(a.storedAmmoResponse,ammoId)&&Number.isFinite(a.storedAmmoResponse[ammoId])&&a.storedAmmoResponse[ammoId]>=0))throw Error('탄약고 사고 저장탄 반응값 오류: '+id);
          if(Object.keys(a.compartments||{}).length!==sections.length)throw Error('탄약고 사고 구획 설정 오류: '+id);
          for(const section of sections){const rule=a.compartments[section],values=outcomes.map(name=>rule?.outcomes?.[name]);if(!rule||rule.capacity!==ammo.sections[section].capacity||!Number.isFinite(rule.transferFactor)||rule.transferFactor<0||rule.transferFactor>1||Object.keys(rule.outcomes||{}).length!==outcomes.length||values.some(v=>!Number.isFinite(v)||v<0||v>1)||Math.abs(values.reduce((sum,v)=>sum+v,0)-1)>1e-9)throw Error('탄약고 사고 구획 설정 오류: '+id+'.'+section);}
          if(Object.keys(a.rows||{}).length!==zones.length)throw Error('탄약고 사고 피격 구역표 오류: '+id);
          for(const zone of zones){const row=a.rows[zone],names=[...sections,'none'],values=names.map(name=>row?.[name]);if(!row||Object.keys(row).length!==names.length||values.some(v=>!Number.isFinite(v)||v<0||v>1)||Math.abs(values.reduce((sum,v)=>sum+v,0)-1)>1e-9)throw Error('탄약고 사고 피격 구역표 오류: '+id+'.'+zone);}
        }
      }
      if(p.hitReactions){
        const h=p.hitReactions;
        if(h.enabled===false){if(Object.keys(h).length!==1)throw Error('비활성 피격 반응 설정 오류: '+id);}
        else{
        if(h.enabled!==true)throw Error('피격 반응 활성 상태 오류: '+id);
        const roles=h.roles;
        if(h.victimProfileId!==id)throw Error('피격 반응 대상 프로파일 오류: '+id);
        if(!Array.isArray(roles)||!roles.length||roles.length!==new Set(roles).size||roles.length!==p.crew||!roles.every(role=>allowedCrewRoles.includes(role)))throw Error('피격 반응 승무원 역할 오류: '+id);
        if(!h.susceptibility||Object.keys(h.susceptibility).length!==reactionCategories.length||!reactionCategories.every(k=>Object.hasOwn(h.susceptibility,k)&&Number.isFinite(h.susceptibility[k])&&h.susceptibility[k]>=0))throw Error('피격 반응 감수성 오류: '+id);
        if(!h.policies||!Object.keys(h.policies).length)throw Error('피격 반응 정책 누락: '+id);
        for(const[policyId,policy]of Object.entries(h.policies)){
          if(!/^[-a-z0-9]+\/[A-Za-z0-9_-]+$/.test(policyId)||typeof policy.ammoId!=='string'||!policy.ammoId||policyId.split('/')[1]!==policy.ammoId)throw Error('피격 반응 정책 ID 오류: '+id);
          for(const classification of ['ricochet','nonPenetration','nearNonPenetration','penetration'])for(const zone of zones){
            const row=policy.rows?.[classification]?.[zone],final=reactionCategories.map(k=>row?.[k]*h.susceptibility[k]);if(!row||Object.keys(row).length!==reactionCategories.length||!reactionCategories.every(k=>Object.hasOwn(row,k)&&Number.isFinite(row[k])&&row[k]>=0&&row[k]<=1)||final.some(v=>!Number.isFinite(v)||v<0||v>1)||final.reduce((sum,v)=>sum+v,0)>1+1e-12)throw Error('피격 반응 확률표 오류: '+id+'.'+policyId+'.'+classification+'.'+zone);
          }
          const validateWeights=(weights,names,label)=>{for(const zone of zones){const row=weights?.[zone];if(!row||Object.keys(row).length!==names.length||!names.every(k=>Object.hasOwn(row,k)&&Number.isFinite(row[k])&&row[k]>=0)||Math.abs(names.reduce((sum,k)=>sum+row[k],0)-1)>1e-9)throw Error('피격 반응 '+label+' 가중치 오류: '+id+'.'+zone);}};
          validateWeights(policy.faultWeights,['mobility','turretDrive'],'장비');validateWeights(policy.crewWeights?.light,roles,'경상');validateWeights(policy.crewWeights?.serious,roles,'중상');
        }
        for(const kind of ['mobility','turretDrive']){const f=h.faults?.[kind];if(!f||!Number.isFinite(f.factor)||f.factor<=0||f.factor>1||!Array.isArray(f.durationSeconds)||f.durationSeconds.length!==2||!f.durationSeconds.every(Number.isFinite)||f.durationSeconds[0]<0||f.durationSeconds[1]<f.durationSeconds[0])throw Error('피격 반응 일시 이상 값 오류: '+id+'.'+kind);}
        const effectKeys={driver:['drivePower','hullTurn'],commander:['commanderTurn'],gunner:['aimRate','sigma'],loader:['reloadEfficiency']};
        if(!h.crewEffects||Object.keys(h.crewEffects).length!==roles.length||!roles.every(role=>Object.hasOwn(h.crewEffects,role)))throw Error('피격 반응 승무원 효과 역할 오류: '+id);
        for(const role of roles)for(const severity of ['light','serious']){const effect=h.crewEffects?.[role]?.[severity],keys=effectKeys[role];if(!effect||Object.keys(effect).length!==keys.length||!keys.every(k=>Object.hasOwn(effect,k)&&Number.isFinite(effect[k])&&effect[k]>0&&(k==='sigma'?effect[k]>=1:effect[k]<=1)))throw Error('피격 반응 승무원 효과 오류: '+id+'.'+role);}
        for(const role of roles)for(const key of effectKeys[role]){const light=h.crewEffects[role].light[key],serious=h.crewEffects[role].serious[key];if(key==='sigma'?serious<light:serious>light)throw Error('피격 반응 승무원 중상 효과 오류: '+id+'.'+role);}
        }
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
