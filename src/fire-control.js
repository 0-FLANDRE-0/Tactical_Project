'use strict';
/* Fictional RTS firing/flight states. All coefficients are game tuning; the
 * generated impact point is a post-result display artifact, never damage or
 * a claim about measured real weapon performance. */
const TacticalFireControl=(()=>{
  const G=typeof TacticalVehicleGeometry!=='undefined'?TacticalVehicleGeometry:require('./vehicle-geometry.js');
  const Combat=typeof TacticalCombatState!=='undefined'?TacticalCombatState:require('./combat-state.js');
  const zones=['hullFront','hullSide','hullRear','turretFront','turretSide','turretRear','upper'];
  const turretZones=new Set(['turretFront','turretSide','turretRear']),faultKinds=['fireControl','commander','gunner'];
  const GRAVITY=9.81,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),diff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  function random(text,seed){let n=(2166136261^seed^0x51f15e)>>>0;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);n^=n>>>16;n=Math.imul(n,0x7feb352d);return((n^(n>>>15))>>>0)/4294967296;}
  const visualSeed=(shot,phase,seed)=>Math.floor(random(shot.id+':visual:'+phase,seed^0x6d2b79f5)*4294967296)>>>0;
  const active=s=>['designated','waiting','acquiring','acquired'].includes(s?.status);
  function mission(u){const o=u.observation;return active(o?.designation)?o.designation:active(o?.tracking)?o.tracking:null;}
  const managed=p=>p.ammunition?.enabled===true;
  const cloneCounts=value=>Object.fromEntries(Object.entries(value).map(([id,count])=>[id,count]));
  function initAmmunition(s,p){
    if(!managed(p))return null;
    if(!s.ammunition){const a=p.ammunition;s.ammunition={preference:a.initial.preference,loadedAmmoId:a.initial.loaded,sections:Object.fromEntries(Object.entries(a.initial.sections).map(([section,counts])=>[section,cloneCounts(counts)])),task:null,lastShotAt:-Infinity,lastHitAt:-Infinity,incident:{safetyUntil:0,last:null,history:[],lostTotals:Object.fromEntries(a.supported.map(id=>[id,0]))}};}
    const incident=s.ammunition.incident??={safetyUntil:0,last:null,history:[],lostTotals:Object.fromEntries(p.ammunition.supported.map(id=>[id,0]))};
    incident.safetyUntil??=0;incident.last??=null;incident.history??=[];incident.lostTotals??=Object.fromEntries(p.ammunition.supported.map(id=>[id,0]));for(const id of p.ammunition.supported)incident.lostTotals[id]??=0;
    return s.ammunition;
  }
  function taskRound(task){return task&&task.reserved?1:0;}
  function ammunitionTotal(s,ammoId=null){const a=s.ammunition;if(!a)return s.ammo;let total=ammoId?(a.loadedAmmoId===ammoId?1:0):(a.loadedAmmoId?1:0);for(const counts of Object.values(a.sections))for(const[id,count]of Object.entries(counts))if(!ammoId||id===ammoId)total+=count;if(a.task&&(!ammoId||a.task.ammoId===ammoId))total+=taskRound(a.task);return total;}
  function sectionTotal(a,section){return Object.values(a.sections[section]).reduce((sum,count)=>sum+count,0);}
  function incidentSnapshot(p,s){
    if(!managed(p))return null;const a=s.ammunition,sections=Object.fromEntries(Object.entries(a.sections).map(([section,counts])=>[section,{counts:cloneCounts(counts)}]));
    const task=a.task;if(task?.reserved&&sections[task.source])sections[task.source].counts[task.ammoId]++;
    return{loadedAmmoId:a.loadedAmmoId,sections,task:task?.reserved?{purpose:task.purpose,ammoId:task.ammoId,source:task.source,stage:task.stage,progress:task.progress,reserved:true}:null,total:ammunitionTotal(s)};
  }
  function proportionalLoss(counts,loss,order){
    const total=order.reduce((sum,id)=>sum+(counts[id]||0),0),take=Math.min(total,Math.max(0,Math.trunc(loss)));if(!total||!take)return Object.fromEntries(order.map(id=>[id,0]));
    const rows=order.map((id,index)=>{const exact=(counts[id]||0)*take/total,floor=Math.floor(exact);return{id,index,exact,floor,fraction:exact-floor};}),allocated=rows.reduce((sum,row)=>sum+row.floor,0);
    rows.sort((a,b)=>b.fraction-a.fraction||a.index-b.index);for(let i=0;i<take-allocated;i++)rows[i].floor++;rows.sort((a,b)=>a.index-b.index);return Object.fromEntries(rows.map(row=>[row.id,row.floor]));
  }
  function loadChoice(p,s){const a=s.ammunition,ids=a.preference==='auto'?p.ammunition.autoPriority:[a.preference];for(const ammoId of ids)for(const source of p.ammunition.sourcePriority)if(a.sections[source][ammoId]>0)return{ammoId,source};return null;}
  function validLoadTask(p,s){const task=s.ammunition?.task;return!!task&&task.purpose==='load'&&task.reserved===true&&p.ammunition.supported.includes(task.ammoId)&&p.ammunition.sourcePriority.includes(task.source)&&['prepare','reload'].includes(task.stage);}
  function engageableAmmo(p,s){return managed(p)?!!s.ammunition.loadedAmmoId||validLoadTask(p,s)||!!loadChoice(p,s):s.ammo>0;}
  function syncAmmo(p,s){if(!managed(p))return s.ammo;s.loaded=!!s.ammunition.loadedAmmoId;s.loadedAmmoId=s.ammunition.loadedAmmoId;s.ammo=ammunitionTotal(s);s.engageableAmmo=engageableAmmo(p,s);return s.ammo;}
  function init(u,p,mode='auto'){
    if(!u.fireControl)u.fireControl={status:'no-target',reason:'no-target',targetKey:null,aimProgress:0,aimElapsed:0,layTime:0,ammo:p.fireControl.testRounds,
      shotCount:0,pending:null,lastShot:null,hitChance:null,zoneProbabilities:null,previousSample:null,targetMotion:0,targetVelocity:{x:0,y:0},breakdown:null,fireMode:mode,lineProbeTarget:null,lineProbePose:null,lineProbeBlocked:false,lineProbeResult:null,lineProbeRequest:null,lineProbeCandidateRevision:null,lineProbeQueries:0,stationaryElapsed:0,autoSuppressed:false,lastRejection:null,
      loaded:true,reloadProgress:1,reloadStartedAt:null,reloadCompletedAt:0,readyIdleSeconds:0,burstShots:0,fatigueSeconds:0,shockSeconds:0,faultUntil:{fireControl:0,commander:0,gunner:0},lastReaction:null};
    const s=u.fireControl;s.fireMode??=mode;s.lineProbeTarget??=null;s.lineProbePose??=null;s.lineProbeBlocked??=false;s.lineProbeResult??=null;s.lineProbeRequest??=null;s.lineProbeCandidateRevision??=null;s.lineProbeQueries??=0;s.stationaryElapsed??=0;s.autoSuppressed??=false;s.lastRejection??=null;
    s.loaded??=s.ammo>0;s.reloadProgress??=s.loaded?1:0;s.reloadStartedAt??=null;s.reloadCompletedAt??=0;s.readyIdleSeconds??=0;s.burstShots??=0;s.fatigueSeconds??=0;s.shockSeconds??=0;s.faultUntil??={fireControl:0,commander:0,gunner:0};for(const kind of faultKinds)s.faultUntil[kind]??=0;s.lastReaction??=null;initAmmunition(s,p);syncAmmo(p,s);return s;
  }
  const readiness=p=>p.fireControl.readiness;
  function reloadSeconds(p,s,u=null){const r=readiness(p),efficiency=u?.hitReactionModifiers?.loaderEfficiency??1;return Math.min(r.reloadMaxSeconds,clamp(r.reloadSeconds+s.fatigueSeconds+s.shockSeconds,r.reloadSeconds,r.reloadMaxSeconds)/Math.max(Number.MIN_VALUE,efficiency));}
  function faultActive(s,kind,now){return Number.isFinite(s?.faultUntil?.[kind])&&s.faultUntil[kind]>now+1e-9;}
  function observationPenalty(p,s,now,u=null){
    const f=readiness(p).temporaryFault,active=faultActive(s,'commander',now)||faultActive(s,'gunner',now);
    const crewRate=u?.hitReactionModifiers?.gunnerAimRate??1,crewSigma=u?.hitReactionModifiers?.gunnerSigma??1;
    return{active:active||crewRate<1||crewSigma>1,aimRateMultiplier:Math.min(active?f.observationAimRateMultiplier:1,crewRate),errorSigmaMultiplier:Math.max(active?f.observationSigmaMultiplier:1,crewSigma)};
  }
  function faultChance(p,damage){const f=readiness(p).temporaryFault;return clamp(f.baseChance+f.damageScaleChance*clamp((Number(damage)||0)/f.damageReference,0,1),f.baseChance,f.baseChance+f.damageScaleChance);}
  function faultDuration(p,roll){const [lo,hi]=readiness(p).temporaryFault.durationSeconds;return lo+(hi-lo)*clamp(roll,0,1);}
  function faultKind(p,roll){let cumulative=0;for(const kind of faultKinds){cumulative+=readiness(p).temporaryFault.kinds[kind];if(roll<cumulative)return kind;}return faultKinds.at(-1);}
  function cancelAmmoTask(p,s,purpose=null){const a=s.ammunition,task=a?.task;if(!task||purpose&&task.purpose!==purpose)return false;if(task.reserved)a.sections[task.source][task.ammoId]++;a.task=null;s.reloadProgress=a.loadedAmmoId?1:0;s.reloadStartedAt=null;syncAmmo(p,s);return true;}
  function beginLoad(p,s,now){const a=s.ammunition,choice=loadChoice(p,s);if(!choice)return null;a.sections[choice.source][choice.ammoId]--;const prep=p.ammunition.sections[choice.source].prepareSeconds;a.task={purpose:'load',ammoId:choice.ammoId,source:choice.source,reserved:true,stage:prep>0?'prepare':'reload',progress:0,startedAt:now,paused:false};s.reloadStartedAt=now;s.reloadProgress=0;syncAmmo(p,s);return a.task;}
  function currentThreat(u){return Object.values(u.observation?.contacts||{}).some(c=>c?.enemyConfirmed&&!c.wreckConfirmed&&Object.values(c.sources||{}).some(source=>source?.current));}
  function replenishChoice(p,s){
    const a=s.ammunition,rule=p.ammunition.replenish;if(sectionTotal(a,'ready')>=p.ammunition.sections.ready.capacity)return null;
    const ids=a.preference==='auto'?p.ammunition.autoPriority:[a.preference,...p.ammunition.autoPriority.filter(id=>id!==a.preference)];
    for(const ammoId of ids){if(a.sections.ready[ammoId]>=rule.targets[ammoId])continue;for(const source of rule.sourcePriority)if(a.sections[source][ammoId]>0)return{ammoId,source};}return null;
  }
  function canReplenish(u,p,s,now){const a=s.ammunition,rule=p.ammunition.replenish;return!!a.loadedAmmoId&&Math.abs(u.drive?.velocity??u.speed??0)<=rule.stationarySpeedMps+1e-9&&now-Math.max(a.lastShotAt,a.lastHitAt)>=rule.idleSeconds-1e-9&&!currentThreat(u)&&!!replenishChoice(p,s);}
  function beginReplenish(p,s,now){const a=s.ammunition,choice=replenishChoice(p,s);if(!choice)return null;a.sections[choice.source][choice.ammoId]--;a.task={purpose:'replenish',ammoId:choice.ammoId,source:choice.source,reserved:true,stage:'replenish',progress:0,startedAt:now,paused:false};syncAmmo(p,s);return a.task;}
  function advanceManagedReadiness(u,p,s,dt,now){
    const a=s.ammunition,r=readiness(p),efficiency=Math.max(Number.MIN_VALUE,u?.hitReactionModifiers?.loaderEfficiency??1);
    s.shockSeconds=Math.max(0,s.shockSeconds-r.shock.recoveryPerSecond*dt);
    if(u.combat?.status==='destroyed'){cancelAmmoTask(p,s);syncAmmo(p,s);return;}
    if(a.incident.safetyUntil>now+1e-9){if(a.task){a.task.paused=true;a.task.pauseReason='ammo-safety';}if(a.loadedAmmoId){s.readyIdleSeconds+=dt;s.fatigueSeconds=Math.max(0,s.fatigueSeconds-r.fatigue.recoveryPerSecond*dt);if(s.readyIdleSeconds+1e-9>=r.fatigue.burstResetSeconds)s.burstShots=0;}syncAmmo(p,s);return;}
    if(a.task?.pauseReason==='ammo-safety'){a.task.paused=false;delete a.task.pauseReason;}
    if(!a.loadedAmmoId){
      if(a.task?.purpose==='replenish')cancelAmmoTask(p,s,'replenish');
      const task=a.task||beginLoad(p,s,now);s.readyIdleSeconds=0;
      if(!task){s.reloadProgress=0;s.reloadStartedAt=null;syncAmmo(p,s);return;}
      if(task.stage==='prepare'){
        const duration=p.ammunition.sections[task.source].prepareSeconds/efficiency;task.progress=clamp(task.progress+dt/Math.max(Number.MIN_VALUE,duration),0,1);
        if(task.progress>=1-1e-12){task.stage='reload';task.progress=0;}
      }
      if(task.stage==='reload'){
        task.progress=clamp(task.progress+dt/reloadSeconds(p,s,u),0,1);s.reloadProgress=task.progress;
        if(task.progress>=1-1e-12){a.loadedAmmoId=task.ammoId;task.reserved=false;a.task=null;s.loaded=true;s.reloadProgress=1;s.reloadCompletedAt=now;s.reloadStartedAt=null;}
      }
      syncAmmo(p,s);return;
    }
    s.readyIdleSeconds+=dt;s.fatigueSeconds=Math.max(0,s.fatigueSeconds-r.fatigue.recoveryPerSecond*dt);if(s.readyIdleSeconds+1e-9>=r.fatigue.burstResetSeconds)s.burstShots=0;
    if(a.task?.purpose==='replenish'){
      const allowed=Math.abs(u.drive?.velocity??u.speed??0)<=p.ammunition.replenish.stationarySpeedMps+1e-9&&now-Math.max(a.lastShotAt,a.lastHitAt)>=p.ammunition.replenish.idleSeconds-1e-9&&!currentThreat(u);
      a.task.paused=!allowed;
      if(allowed){const duration=p.ammunition.replenish.seconds[a.task.source]/efficiency;a.task.progress=clamp(a.task.progress+dt/duration,0,1);if(a.task.progress>=1-1e-12){a.sections.ready[a.task.ammoId]++;a.task.reserved=false;a.task=null;}}
    }else if(!a.task&&canReplenish(u,p,s,now))beginReplenish(p,s,now);
    syncAmmo(p,s);
  }
  function advanceReadiness(u,p,s,dt,now){
    if(managed(p))return advanceManagedReadiness(u,p,s,dt,now);
    const r=readiness(p);s.shockSeconds=Math.max(0,s.shockSeconds-r.shock.recoveryPerSecond*dt);
    if(!s.loaded&&s.ammo>0){s.readyIdleSeconds=0;s.reloadStartedAt??=now-dt;s.reloadProgress=clamp(s.reloadProgress+dt/reloadSeconds(p,s,u),0,1);if(s.reloadProgress>=1-1e-12){s.loaded=true;s.reloadProgress=1;s.reloadCompletedAt=now;s.reloadStartedAt=null;}}
    else if(s.loaded){s.readyIdleSeconds+=dt;s.fatigueSeconds=Math.max(0,s.fatigueSeconds-r.fatigue.recoveryPerSecond*dt);if(s.readyIdleSeconds+1e-9>=r.fatigue.burstResetSeconds)s.burstShots=0;}
    else{s.reloadProgress=0;s.reloadStartedAt=null;s.readyIdleSeconds=0;}
  }
  function consumeLoaded(u,p,s,now){
    if(!s.loaded||s.ammo<=0)return false;const r=readiness(p);if(managed(p)){const a=s.ammunition;if(!a.loadedAmmoId)return false;a.loadedAmmoId=null;a.lastShotAt=now;}s.loaded=false;s.reloadProgress=0;s.reloadStartedAt=s.ammo>1?now:null;s.reloadCompletedAt=null;s.readyIdleSeconds=0;s.burstShots++;
    if(s.burstShots>=r.fatigue.startsAtShot)s.fatigueSeconds=Math.min(r.fatigue.maxSeconds,s.fatigueSeconds+r.fatigue.perShotSeconds);return true;
  }
  function motionReady(u,p,s=init(u,p)){const m=p.fireControl.movement;return m.fireOnMove||Math.abs(u.drive?.velocity??u.speed??0)<=m.stationarySpeedMps+1e-9&&s.stationaryElapsed+1e-9>=m.stationaryHoldSeconds;}
  function currentAmmoId(p,s){return managed(p)?s.ammunition.loadedAmmoId||s.ammunition.task?.ammoId||null:p.weapons.mainGun.ammunitionId??null;}
  function fireSettings(p,s,ammoId=currentAmmoId(p,s)){const ammo=ammoId&&Combat.ammunitionRegistry.has(ammoId)?Combat.ammunitionRegistry.get(ammoId):null;return ammo?{...p.fireControl,muzzleVelocity:ammo.muzzleVelocity}:p.fireControl;}
  // Fictional RTS error budget. Target manoeuvre is represented only by the
  // difference between predicted and actual pose at impact, never twice here.
  function normalCdf(x){
    if(x===0)return .5;
    const v=Math.abs(x)/Math.SQRT2,t=1/(1+.3275911*v);
    const erf=1-(((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t)*Math.exp(-v*v);
    return clamp(.5*(1+(x<0?-erf:erf)),0,1);
  }
  function errorBudget(observer,pose,f,targetVelocity={x:0,y:0},layTime=0,errorSigmaMultiplier=1){
    const dx=pose.x-observer.x,dy=pose.y-observer.y,range=Math.hypot(dx,dy),safeRange=Math.max(1e-9,range),beta=Math.atan2(dy,dx);
    const vx=targetVelocity.x||0,vy=targetVelocity.y||0,cross=Math.abs(-Math.sin(beta)*vx+Math.cos(beta)*vy),tof=range/(f.muzzleVelocity*f.velocityRetention);
    const disp=f.dispersionMrad,lay=f.layMinMrad+(f.layStartMrad-f.layMinMrad)*Math.exp(-Math.max(0,layTime)/f.layTauSeconds);
    const rng=1000*GRAVITY*f.rangeErrorM/(2*f.muzzleVelocity**2),lead=1000*f.leadResidual*cross*tof/safeRange,own=f.stabMradPerMps*Math.abs(observer.speed||0);
    const multiplier=Number.isFinite(errorSigmaMultiplier)&&errorSigmaMultiplier>0?errorSigmaMultiplier:1;
    return{range,tof,sigma:{disp,lay,rng,lead,own,multiplier,x:Math.hypot(disp,lay,lead,own)*multiplier,z:Math.hypot(disp,lay,rng,own)*multiplier}};
  }
  function presentedRects(observer,pose,exposure,f){
    const m=pose.model,band=exposure.presented||f.presented,samples=exposure.samples||[],rects=[];
    if(!m)return rects;
    const beta=Math.atan2(pose.y-observer.y,pose.x-observer.x),h=pose.heading-beta,t=pose.turret-beta;
    const hull=samples.filter(v=>v.part==='hull'),visibleHull=hull.filter(v=>v.visible),visibleTurret=samples.filter(v=>v.part==='turret'&&v.visible);
    function rect(part,c,width,z1,z2){if(width>0&&z2>z1)rects.push({part,x1:c-width/2,x2:c+width/2,z1,z2});}
    if(visibleHull.length){
      const cols=new Map(visibleHull.map(v=>[v.col,v.along])),rows=[...new Set(visibleHull.map(v=>v.row))],levels=[...new Map(hull.map(v=>[v.row,v.z]))].sort((a,b)=>a[0]-b[0]);
      const bands=new Map(levels.map(([row,z],i)=>[row,[i?(levels[i-1][1]+z)/2:band.hullBottom,i+1<levels.length?(z+levels[i+1][1])/2:band.hullTop]]));
      const c=[...cols.values()].reduce((sum,along)=>sum+along*Math.sin(h),0)/cols.size,width=(m.hullLength*Math.abs(Math.sin(h))+m.width*Math.abs(Math.cos(h)))*cols.size/3;
      rect('hull',c,width,Math.min(...rows.map(r=>bands.get(r)[0])),Math.max(...rows.map(r=>bands.get(r)[1])));
    }
    if(visibleTurret.length){
      const [px,py]=m.turretPivot,offset=px*Math.sin(h)+py*Math.cos(h),c=offset+visibleTurret.reduce((sum,v)=>sum+v.along*Math.sin(t),0)/visibleTurret.length;
      const width=(m.turretLength*Math.abs(Math.sin(t))+m.turretWidth*Math.abs(Math.cos(t)))*visibleTurret.length/3;
      rect('turret',c,width,band.hullTop,band.turretTop);
    }
    return rects;
  }
  function rectProbability(rect,aim,sx,sz){
    const x=Math.max(1e-9,sx),z=Math.max(1e-9,sz);
    return clamp((normalCdf((rect.x2-aim.x)/x)-normalCdf((rect.x1-aim.x)/x))*(normalCdf((rect.z2-aim.z)/z)-normalCdf((rect.z1-aim.z)/z)),0,1);
  }
  function distribution(observer,pose,{pHull=0,pTurret=0}){
    const result=Object.fromEntries(zones.map(z=>[z,0])),total=pHull+pTurret;
    if(!(total>0)||!pose.model)return result;
    const incoming=Math.atan2(observer.y-pose.y,observer.x-pose.x);
    function group(prefix,heading,amount){
      const a=diff(incoming,heading),cos=Math.abs(Math.cos(a))<1e-12?0:Math.cos(a),sin=Math.abs(Math.sin(a))<1e-12?0:Math.sin(a),m=pose.model,length=prefix==='hull'?m.hullLength:m.turretLength,width=prefix==='hull'?m.width:m.turretWidth,front=width*Math.max(0,cos),side=length*Math.abs(sin),rear=width*Math.max(0,-cos),sum=front+side+rear;
      result[prefix+'Front']=amount/total*front/sum;result[prefix+'Side']=amount/total*side/sum;result[prefix+'Rear']=amount/total*rear/sum;
    }
    group('hull',pose.heading,pHull);group('turret',pose.turret,pTurret);
    return result;
  }
  function estimate(observer,pose,exposure,f,targetVelocity={x:0,y:0},layTime=0,errorSigmaMultiplier=1){
    const budget=errorBudget(observer,pose,f,targetVelocity,layTime,errorSigmaMultiplier),rects=presentedRects(observer,pose,exposure,f);
    const area=r=>(r.x2-r.x1)*(r.z2-r.z1),total=rects.reduce((sum,r)=>sum+area(r),0);
    const aim=total?{x:rects.reduce((sum,r)=>sum+(r.x1+r.x2)/2*area(r),0)/total,z:rects.reduce((sum,r)=>sum+(r.z1+r.z2)/2*area(r),0)/total}:{x:0,z:0};
    let pHull=0,pTurret=0;
    if(budget.range<=f.maxRange)for(const r of rects){const p=rectProbability(r,aim,budget.sigma.x/1000*budget.range,budget.sigma.z/1000*budget.range);if(r.part==='hull')pHull=p;else pTurret=p;}
    const hitChance=clamp(pHull+pTurret,0,1),breakdown={...budget,rects,aim,pHull,pTurret};
    return{hitChance,zoneProbabilities:distribution(observer,pose,breakdown),breakdown};
  }
  function resolve(hitChance,probabilities,hitRoll,zoneRoll){
    if(!(hitRoll<hitChance))return{hit:false,zone:null};
    let cumulative=0,last=null;for(const z of zones){if(probabilities[z]>0)last=z;cumulative+=probabilities[z];if(zoneRoll<cumulative)return{hit:true,zone:z};}
    return last?{hit:true,zone:last}:{hit:false,zone:null};
  }
  function sideFor(observer,pose,zone){
    if(!zone?.endsWith('Side'))return null;
    const incoming=Math.atan2(observer.y-pose.y,observer.x-pose.x),s=Math.sin(diff(incoming,zone.startsWith('hull')?pose.heading:pose.turret));
    return s>1e-12?'right':s< -1e-12?'left':null;
  }
  function faceHeading(pose,zone,side){
    const heading=zone?.startsWith('turret')?pose.turret:pose.heading;
    if(zone?.endsWith('Front'))return heading;
    if(zone?.endsWith('Rear'))return heading+Math.PI;
    if(zone?.endsWith('Side'))return heading+(side==='right'?Math.PI/2:-Math.PI/2);
    return null;
  }
  function reflectedHeading(beta,pose,zone,side){
    const normal=faceHeading(pose,zone,side);if(normal===null)return beta+Math.PI;
    const dx=Math.cos(beta),dy=Math.sin(beta),nx=Math.cos(normal),ny=Math.sin(normal),dot=dx*nx+dy*ny;
    return Math.atan2(dy-2*dot*ny,dx-2*dot*nx);
  }
  function impactEvaluation(shot,sight){
    const pose=sight?.gone?{...shot.pose,x:shot.predicted.x,y:shot.predicted.y}:sight?.pose||{...shot.pose,x:shot.predicted.x,y:shot.predicted.y};
    const rects=sight?.gone?[]:presentedRects(shot.origin,pose,sight||shot.fireExposure,shot.fireControl);
    const ex=Math.cos(shot.beta),ey=Math.sin(shot.beta),px=-ey,py=ex,dx=pose.x-shot.predicted.x,dy=pose.y-shot.predicted.y;
    const lateral=dx*px+dy*py,radial=dx*ex+dy*ey,range=Math.hypot(pose.x-shot.origin.x,pose.y-shot.origin.y),vavg=shot.fireControl.muzzleVelocity*shot.fireControl.velocityRetention;
    const dz=-GRAVITY*range*radial/(2*vavg*vavg),mu={x:shot.aim.x-lateral,z:shot.aim.z+dz},sx=shot.sigma.x/1000*range,sz=shot.sigma.z/1000*range;
    let pHull=0,pTurret=0;
    for(const rect of rects){const p=rectProbability(rect,mu,sx,sz);if(rect.part==='hull')pHull=p;else pTurret=p;}
    const finalHitChance=clamp(pHull+pTurret,0,1),probabilities=distribution(shot.origin,pose,{pHull,pTurret});
    return{pose,rects,bias:{lateral,radial,dz},mu,sx,sz,pHull,pTurret,finalHitChance,probabilities};
  }
  function boxMuller(a,b){const radius=Math.sqrt(-2*Math.log(Math.max(Number.MIN_VALUE,a))),angle=2*Math.PI*b;return{x:radius*Math.cos(angle),z:radius*Math.sin(angle)};}
  function sampleImpactPlane(shot,evaluation,result,seed){
    const part=result.zone?.startsWith('hull')?'hull':result.zone?.startsWith('turret')?'turret':null,selected=evaluation.rects.find(r=>r.part===part),inside=(p,r)=>p.x>=r.x1&&p.x<=r.x2&&p.z>=r.z1&&p.z<=r.z2;
    for(let k=0;k<shot.fireControl.impact.rejectionAttempts;k++){
      const n=boxMuller(random(shot.shooterId+':'+shot.number+':impact:'+k+':a',seed),random(shot.shooterId+':'+shot.number+':impact:'+k+':b',seed));
      const point={x:evaluation.mu.x+evaluation.sx*n.x,z:evaluation.mu.z+evaluation.sz*n.z};
      if(result.hit?(selected&&inside(point,selected)):evaluation.rects.every(r=>!inside(point,r)))return{...point,fallback:false,attempt:k+1};
    }
    if(result.hit&&selected)return{x:clamp(evaluation.mu.x,selected.x1,selected.x2),z:clamp(evaluation.mu.z,selected.z1,selected.z2),fallback:true,attempt:shot.fireControl.impact.rejectionAttempts};
    const top=evaluation.rects.length?Math.max(...evaluation.rects.map(r=>r.z2)):evaluation.mu.z;
    return{x:evaluation.mu.x,z:top+.25*evaluation.sz,fallback:true,attempt:shot.fireControl.impact.rejectionAttempts};
  }
  const pathHeight=(h0,hq,s,total,vavg)=>h0+(hq-h0)*s/Math.max(1e-9,total)+GRAVITY*s*(total-s)/(2*vavg*vavg);
  function marchImpact(shot,pose,point,environment){
    const heightAt=environment?.heightAt||(()=>0),buildingAt=environment?.buildingAt||(()=>null),world=environment?.world||{w:Infinity,h:Infinity};
    const px=-Math.sin(shot.beta),py=Math.cos(shot.beta),qx=pose.x+point.x*px,qy=pose.y+point.x*py,dx=qx-shot.origin.x,dy=qy-shot.origin.y,total=Math.hypot(dx,dy),ux=total?dx/total:Math.cos(shot.beta),uy=total?dy/total:Math.sin(shot.beta);
    const h0=heightAt(shot.origin.x,shot.origin.y)+shot.fireEye,hq=heightAt(pose.x,pose.y)+point.z,vavg=shot.fireControl.muzzleVelocity*shot.fireControl.velocityRetention;
    const boundary=Math.min(ux>0?(world.w-shot.origin.x)/ux:ux<0?-shot.origin.x/ux:Infinity,uy>0?(world.h-shot.origin.y)/uy:uy<0?-shot.origin.y/uy:Infinity);
    const requested=total+shot.fireControl.impact.maxBeyondM,limit=Math.max(0,Math.min(requested,boundary));
    const state=s=>{const x=shot.origin.x+ux*s,y=shot.origin.y+uy*s,z=pathHeight(h0,hq,s,total,vavg),building=buildingAt(x,y);if(building&&building.roof>=z)return{kind:'building',x,y,z};if(z<=heightAt(x,y))return{kind:'ground',x,y,z};return null;};
    let previous=0,distance=Math.min(10,limit),hit=state(distance);
    while(!hit&&distance<limit-1e-9){previous=distance;distance=Math.min(limit,distance+shot.fireControl.impact.marchStepM);hit=state(distance);}
    if(hit){let lo=previous,hi=distance;for(let i=0;i<4;i++){const mid=(lo+hi)/2;if(state(mid))hi=mid;else lo=mid;}const refined=state(hi)||hit;return{...refined,beyond:hi-total};}
    const x=shot.origin.x+ux*limit,y=shot.origin.y+uy*limit,z=pathHeight(h0,hq,limit,total,vavg),kind=boundary<=requested+1e-9?'out-of-map':'max-distance';
    return{kind,x,y,z,beyond:limit-total};
  }
  function impactLocation(shot,evaluation,result,point,environment){
    const px=-Math.sin(shot.beta),py=Math.cos(shot.beta),pose=evaluation.pose;
    if(result.hit)return{kind:'hit',x:pose.x+point.x*px,y:pose.y+point.x*py,z:(environment?.heightAt?.(pose.x,pose.y)||0)+point.z,beyond:0};
    return marchImpact(shot,pose,point,environment);
  }
  function create({profileOf,freshSight,impactSight=null,impactEnvironment=null,isObserved=()=>true,onImpactResolved=null,onTemporaryFault=null,onFireBlocked=null,seed=7,debug=false,onDecisionRoll=null}){
    const events=[],effects=[],flights=[],records=[];let currentTime=0,effectNumber=0;
    const clone=v=>JSON.parse(JSON.stringify(v));
    const emit=e=>{events.push(e);if(events.length>200)events.shift();};
    const emitEffect=e=>{const effect=Object.freeze({id:'fx-'+(++effectNumber),...e});effects.push(effect);if(effects.length>256)effects.shift();return effect;};
    const pruneEffects=now=>{for(let i=effects.length-1;i>=0;i--)if(effects[i].expiresAt<now)effects.splice(i,1);};
    function resetAim(s){s.aimElapsed=0;s.aimProgress=0;s.layTime=0;}
    function resetMotion(s){s.previousSample=null;s.targetMotion=0;s.targetVelocity={x:0,y:0};}
    function clearPreview(s){s.hitChance=null;s.zoneProbabilities=null;s.breakdown=null;}
    function preview(s,value){s.hitChance=value.hitChance;s.zoneProbabilities=value.zoneProbabilities;s.breakdown=value.breakdown;}
    function roll(shot,kind){onDecisionRoll?.(kind,shot.id);return random(shot.shooterId+':'+shot.number+':'+kind,seed);}
    const reactionRoll=(shot,kind)=>random(shot.shooterId+':'+shot.number+':reaction:'+kind,seed^0x243f6a88);
    function react(target,record,now,forced=null){
      if(!target||!record?.applied||!record.hit)return null;const p=profileOf(target),s=init(target,p),r=readiness(p),classification=record.penetrated?'penetration':record.nearNonPenetration?'near':'normal';
      if(managed(p))s.ammunition.lastHitAt=now;
      s.shockSeconds=Math.min(r.shock.maxSeconds,s.shockSeconds+r.shock[classification+'Seconds']);
      let fault=null;
      if(!record.destroyed&&target.combat?.status!=='destroyed'&&turretZones.has(record.zone)){
        const chance=faultChance(p,record.computedDamage),occurrence=forced?.occurrence??random(record.id+':reaction:fault',seed^0x7f4a7c15);
        if(occurrence<chance){const kindRoll=forced?.kind??random(record.id+':reaction:kind',seed^0x94d049bb),durationRoll=forced?.duration??random(record.id+':reaction:duration',seed^0x369dea0f),kind=faultKind(p,kindRoll),duration=faultDuration(p,durationRoll),until=Math.max(s.faultUntil[kind],now+duration);s.faultUntil[kind]=until;fault={kind,duration,until,chance,occurrence};onTemporaryFault?.(target,kind,now,until);}
      }
      s.lastReaction={time:now,classification,shockSeconds:s.shockSeconds,fault:fault?{...fault}:null};return{...s.lastReaction,fault:fault?{...fault}:null};
    }
    function finishDue(units,now){
      flights.sort((a,b)=>a.impactAt-b.impactAt||(a.id<b.id?-1:a.id>b.id?1:0));
      while(flights.length&&flights[0].impactAt<=now+1e-9){
        const shot=flights.shift(),sight=impactSight?impactSight(shot):{...clone(shot.fireExposure),pose:{...shot.pose,x:shot.predicted.x,y:shot.predicted.y}},evaluation=impactEvaluation(shot,sight);
        const result=resolve(evaluation.finalHitChance,evaluation.probabilities,roll(shot,'hit'),roll(shot,'zone')),side=sideFor(shot.origin,evaluation.pose,result.zone),ricochetRoll=result.hit?roll(shot,'ricochet'):null,nearDamageRoll=result.hit?reactionRoll(shot,'near-damage'):null,point=sampleImpactPlane(shot,evaluation,result,seed),impact=impactLocation(shot,evaluation,result,point,impactEnvironment);
        const observation=isObserved(shot.team,shot.targetKey),observed=!sight?.gone&&!!observation;
        // Damage consumes the private resolved result exactly here, before any
        // public redaction. It must not infer a hit from the display point.
        const combat=onImpactResolved?.({id:shot.id,time:now,team:shot.team,shooterId:shot.shooterId,targetId:shot.targetId,targetKey:shot.targetKey,ammoId:shot.ammoId,hit:result.hit,zone:result.zone,side,ricochetRoll,nearDamageRoll,origin:clone(shot.origin),pose:clone(evaluation.pose),rangeM:Math.hypot(evaluation.pose.x-shot.origin.x,evaluation.pose.y-shot.origin.y),impact:clone(impact),observed,observation:observation?clone(observation):null})??null;
        const effectClass=result.hit?(combat?.ricochet?'ricochet':combat?.penetrated?'penetration':'non-penetration'):'miss-'+impact.kind;
        emitEffect({kind:'impact',time:now,expiresAt:now+3.2,position:{x:impact.x,y:impact.y,z:impact.z},effectClass,flightEffectId:shot.flightEffectId,outgoingHeading:combat?.ricochet?reflectedHeading(shot.beta,evaluation.pose,result.zone,side):null,visualSeed:visualSeed(shot,'impact',seed)});
        const publicImpact=observed?clone(impact):result.hit?null:{...clone(impact),beyond:null};
        const publicResult={type:'impact',id:shot.id,time:now,impactAt:shot.impactAt,team:shot.team,shooterId:shot.shooterId,targetKey:shot.targetKey,
          result:observed?(result.hit?'hit':'miss'):'unobserved',zone:observed?result.zone:null,side:observed?side:null,
          finalHitChance:observed?evaluation.finalHitChance:null,hitChanceAtFire:shot.hitChanceAtFire,bias:observed?clone(evaluation.bias):null,
          impact:publicImpact,ammoId:shot.ammoId,ammoRemaining:shot.ammoRemaining,combat:observed&&combat?Combat.publicRecord(combat):null};
        emit(publicResult);shot.shooter.fireControl.lastShot=clone(publicResult);
        if(debug){records.push({id:shot.id,time:now,impactAt:shot.impactAt,shooterId:shot.shooterId,targetKey:shot.targetKey,ammoId:shot.ammoId,result:result.hit?'hit':'miss',zone:result.zone,side,finalHitChance:evaluation.finalHitChance,hitChanceAtFire:shot.hitChanceAtFire,aimPenaltyAtFire:clone(shot.aimPenaltyAtFire),sigmaAtFire:clone(shot.sigma),bias:clone(evaluation.bias),impact:clone(impact),point:clone(point),combat:combat?clone(combat):null,reason:sight?.gone?'target-gone':!evaluation.rects.length?'occluded':null,origin:{...shot.origin},predicted:{...shot.predicted}});if(records.length>200)records.shift();}
      }
    }
    function inspect(u,now){
      const p=profileOf(u),f=p.fireControl,s=init(u,p),d=mission(u),c=d?u.observation.contacts[d.target]:null;
      if(u.combat?.status==='destroyed')return{reason:'destroyed'};
      if(!f.enabled||!p.weapons.mainGun.enabled||!p.sensors.gunner.enabled)return{reason:'disabled'};
      if(!d)return{reason:'no-target'};
      if(d.status!=='acquired')return{reason:'not-acquired',d,c};
      if(!c?.identified||!c.enemyConfirmed)return{reason:'unidentified',d,c};
      if(!c.sources.gunner.current||now-c.sources.gunner.lastSeen>p.sensors.tuning.queryPeriod+1e-6||!c.pose)return{reason:'own-sight-lost',d,c};
      const distance=Math.hypot(c.pose.x-u.x,c.pose.y-u.y);
      if(distance>f.maxRange||distance>p.sensors.gunner.range)return{reason:'range',d,c};
      const error=Math.abs(diff(Math.atan2(c.pose.y-u.y,c.pose.x-u.x),u.turret));
      if(error>f.alignmentTolerance)return{reason:'aligning',d,c};
      if(faultActive(s,'fireControl',now))return{reason:'fcs-fault',d,c};
      if(managed(p)&&s.ammunition.incident.safetyUntil>now+1e-9)return{reason:'ammo-safety',d,c};
      if(s.ammo<=0)return{reason:'out-of-ammo',d,c};
      if(!s.loaded)return{reason:managed(p)&&!validLoadTask(p,s)&&s.ammunition.preference!=='auto'&&!loadChoice(p,s)?'selected-ammo-unavailable':'reloading',d,c};
      return{reason:null,d,c};
    }
    function step(units,dt,now){
      currentTime=now;
      pruneEffects(now);
      // Resolve arrivals before readiness/observation consumers attempt a new
      // shot at this timestamp. Core also calls resolveImpacts before sensing;
      // this second idempotent call keeps the standalone runtime contract.
      finishDue(units,now);
      for(const u of units){
        const p=profileOf(u),f=p.fireControl,s=init(u,p);advanceReadiness(u,p,s,dt,now);const check=inspect(u,now),{d,c}=check;
        if(Math.abs(u.drive?.velocity??u.speed??0)<=f.movement.stationarySpeedMps+1e-9)s.stationaryElapsed+=dt;else s.stationaryElapsed=0;
        if(s.targetKey!==d?.key){const requested=s.lineProbeRequest;s.targetKey=d?.key??null;s.lineProbeTarget=null;s.lineProbePose=null;s.lineProbeBlocked=false;s.lineProbeResult=null;s.lineProbeRequest=requested===s.targetKey?requested:null;s.lineProbeCandidateRevision=null;resetAim(s);resetMotion(s);if(s.pending?.key!==s.targetKey)s.pending=null;}
        if(s.previousSample&&now-s.previousSample.time>p.sensors.tuning.queryPeriod*5+1e-9)resetMotion(s);
        if(c?.sources.gunner.current&&c.pose&&s.previousSample?.time!==c.sources.gunner.lastSeen){
          const previous=s.previousSample;
          const elapsed=previous?c.sources.gunner.lastSeen-previous.time:0;
          s.targetVelocity=elapsed>0&&elapsed<=p.sensors.tuning.queryPeriod*5+1e-9?{x:(c.pose.x-previous.x)/elapsed,y:(c.pose.y-previous.y)/elapsed}:{x:0,y:0};
          s.targetMotion=Math.hypot(s.targetVelocity.x,s.targetVelocity.y);
          s.previousSample={x:c.pose.x,y:c.pose.y,time:c.sources.gunner.lastSeen};
        }
        const aimPenalty=observationPenalty(p,s,now,u);
        if(!check.reason||check.reason==='reloading'||check.reason==='ammo-safety'){
          s.layTime+=dt*aimPenalty.aimRateMultiplier;s.aimElapsed=Math.min(f.aimSeconds,s.aimElapsed+dt*aimPenalty.aimRateMultiplier);s.aimProgress=clamp(s.aimElapsed/f.aimSeconds,0,1);
          s.status=check.reason==='reloading'?'reloading':check.reason==='ammo-safety'?'blocked':s.aimProgress>=1-1e-9?'ready':'aiming';s.reason=check.reason;
          const ex=c.gunnerExposure||{samples:[]};preview(s,estimate(u,c.pose,ex,fireSettings(p,s),s.targetVelocity,s.layTime,aimPenalty.errorSigmaMultiplier));
        }
        else if(check.reason==='fcs-fault'){s.status='blocked';s.reason=check.reason;clearPreview(s);}
        else{s.status=check.reason==='aligning'?'aligning':'blocked';if(check.reason==='no-target')s.status='no-target';s.reason=check.reason;resetAim(s);clearPreview(s);}
        // Normal units default to auto. Both modes retain a blocked weapon-line
        // result until the geometry changes; a new commander candidate can use
        // that result for retargeting without running the same LOS again.
        const linePose=c?.pose?[u.x,u.y,u.heading,u.turret,c.pose.x,c.pose.y,c.pose.heading,c.pose.turret]:null;
        const changedLine=!linePose||!s.lineProbePose||linePose.some((v,i)=>v!==s.lineProbePose[i]);
        const candidateRevision=u.observation?.candidateRevision??0,candidatesChanged=s.lineProbeCandidateRevision!==candidateRevision;
        // AI may request the same authoritative firing-line query without
        // authorising a shot. This path stops before ammunition, shot number,
        // decision RNG, flight and effect creation regardless of the result.
        if(s.status==='ready'&&!s.pending&&s.lineProbeRequest===s.targetKey){
          s.lineProbeRequest=null;s.lineProbeQueries++;const probe=freshSight(u,d.target),blocked=!probe?.visible&&(probe?.reason||'fresh-sight-failed');s.lineProbeTarget=s.targetKey;s.lineProbePose=linePose;s.lineProbeBlocked=blocked==='fire-line-blocked';s.lineProbeResult=probe?.visible?'clear':blocked;s.lineProbeCandidateRevision=candidateRevision;
          if(!probe?.visible){const switched=s.lineProbeBlocked&&onFireBlocked?.(u,d.target,'fire-line-blocked',now);s.status='blocked';s.reason=switched?'retargeted':blocked;resetAim(s);s.lastRejection=s.reason;clearPreview(s);}else{s.status='ready';s.reason=null;}
          continue;
        }
        if(s.status==='ready'&&!s.pending&&s.fireMode==='auto'&&s.lineProbeBlocked&&s.lineProbeTarget===s.targetKey&&!changedLine){
          s.lineProbeCandidateRevision=candidateRevision;
          if(candidatesChanged&&onFireBlocked?.(u,d.target,'fire-line-blocked',now)){
            s.status='blocked';s.reason='retargeted';resetAim(s);clearPreview(s);continue;
          }
          s.lineProbeResult='fire-line-blocked';s.status='blocked';s.reason='fire-line-blocked';clearPreview(s);continue;
        }
        // Auto creates the same queued request consumed below and never
        // overwrites a manual request already present for this step.
        if(s.status==='ready'&&!s.pending&&s.fireMode==='auto'&&!s.autoSuppressed&&motionReady(u,p,s))s.pending={key:s.targetKey,source:'auto'};
        // Hold still probes the real line and participates in hunter-killer
        // switching, while never creating an automatic firing request.
        if(s.status==='ready'&&!s.pending&&s.fireMode==='hold'&&(s.lineProbeTarget!==s.targetKey||changedLine||candidatesChanged)){
          if(s.lineProbeTarget!==s.targetKey||changedLine){s.lineProbeQueries++;const probe=freshSight(u,d.target);s.lineProbeBlocked=!probe?.visible&&probe?.reason==='fire-line-blocked';s.lineProbeResult=probe?.visible?'clear':probe?.reason||'fresh-sight-failed';}
          s.lineProbeTarget=s.targetKey;s.lineProbePose=linePose;s.lineProbeCandidateRevision=candidateRevision;
          if(s.lineProbeBlocked&&onFireBlocked?.(u,d.target,'fire-line-blocked',now)){
            s.status='blocked';s.reason='retargeted';resetAim(s);clearPreview(s);continue;
          }
        }
        if(!s.pending)continue;
        const request=s.pending;s.pending=null;
        if(s.status!=='ready'||request.key!==s.targetKey){s.lastRejection=check.reason||'target-changed';continue;}
        // Recheck actual signed drivetrain speed immediately before every
        // manual/automatic shot. A queued request cannot spend ammunition or
        // decision RNG after the vehicle starts moving again.
        if(!motionReady(u,p,s)){s.lastRejection='must-stop';continue;}
        if(request.source==='auto'&&s.autoSuppressed){s.lastRejection='movement-policy';continue;}
        // A fire command must recheck its own current range/FOV/terrain samples;
        // an old 10Hz contact or team knowledge cannot authorize a shot.
        s.lineProbeQueries++;const sight=freshSight(u,d.target);
        if(!sight?.visible){
          const blocked=sight?.reason||'fresh-sight-failed',switched=blocked==='fire-line-blocked'&&onFireBlocked?.(u,d.target,blocked,now);
          s.lineProbeResult=blocked;if(blocked==='fire-line-blocked'){s.lineProbeTarget=s.targetKey;s.lineProbePose=linePose;s.lineProbeBlocked=true;s.lineProbeCandidateRevision=candidateRevision;}
          s.status='blocked';s.reason=switched?'retargeted':blocked;resetAim(s);s.lastRejection=s.reason;clearPreview(s);continue;
        }
        s.lineProbeTarget=s.targetKey;s.lineProbePose=linePose;s.lineProbeBlocked=false;s.lineProbeResult='clear';s.lineProbeCandidateRevision=candidateRevision;
        const pose=sight.pose,range=Math.hypot(pose.x-u.x,pose.y-u.y);
        if(range>f.maxRange||Math.abs(diff(Math.atan2(pose.y-u.y,pose.x-u.x),u.turret))>f.alignmentTolerance){s.status='aligning';s.reason='fresh-alignment-failed';resetAim(s);clearPreview(s);continue;}
        const ammoId=currentAmmoId(p,s),shotSettings=fireSettings(p,s,ammoId),firePenalty=observationPenalty(p,s,now,u),chance=estimate(u,pose,sight,shotSettings,s.targetVelocity,s.layTime,firePenalty.errorSigmaMultiplier),number=s.shotCount+1;
        if(!(chance.hitChance>0)){s.status='blocked';s.reason='no-presented-target';resetAim(s);clearPreview(s);continue;}
        // The last mutable readiness check must succeed before creating a
        // flight, effect or public event. Rejected fire never spends a round
        // and cannot leave a display-only shot behind.
        if(managed(p)&&!ammoId||!consumeLoaded(u,p,s,now)){s.lastRejection='reloading';continue;}if(managed(p))syncAmmo(p,s);else s.ammo--;
        const origin=G.muzzleWorld(u,p.model),tof=chance.breakdown.tof,predicted={x:pose.x+s.targetVelocity.x*tof,y:pose.y+s.targetVelocity.y*tof},beta=Math.atan2(predicted.y-origin.y,predicted.x-origin.x),id=u.id+'-shot-'+number,impactAt=now+tof;
        const shot={id,number,time:now,impactAt,team:u.team,shooterId:u.id,targetKey:s.targetKey,targetId:d.target,ammoId,shooter:u,
          origin,fireEye:sight.fireEye,profileAtFire:clone(p),fireControl:clone(shotSettings),ammunitionAtFire:ammoId&&Combat.ammunitionRegistry.has(ammoId)?clone(Combat.ammunitionRegistry.get(ammoId)):null,pose:clone(pose),fireExposure:clone(sight),
          beta,rangeAtFire:chance.breakdown.range,predicted,aim:clone(chance.breakdown.aim),sigma:clone(chance.breakdown.sigma),aimPenaltyAtFire:clone(firePenalty),hitChanceAtFire:chance.hitChance,ammoRemaining:s.ammo};
        flights.push(shot);
        const flightEffect=emitEffect({kind:'fire',time:now,expiresAt:impactAt+.35,origin:{x:origin.x,y:origin.y},heading:beta,distanceM:chance.breakdown.range,duration:tof,visualSeed:visualSeed(shot,'fire',seed)});
        shot.flightEffectId=flightEffect.id;
        emit({type:'fired',id,time:now,team:u.team,shooterId:u.id,targetKey:s.targetKey,source:request.source,origin:{...origin},muzzleHeading:beta,
          tof,impactAt,hitChanceAtFire:chance.hitChance,ammoId,ammoRemaining:s.ammo});
        s.shotCount=number;if(managed(p))syncAmmo(p,s);resetAim(s);clearPreview(s);s.status=(s.engageableAmmo??s.ammo>0)?'reloading':'blocked';s.reason=(s.engageableAmmo??s.ammo>0)?'reloading':s.ammo>0?'selected-ammo-unavailable':'out-of-ammo';
      }
    }
    function request(u,key,now){
      const p=profileOf(u),s=init(u,p),check=inspect(u,now);
      if(s.pending)return{ok:false,reason:'pending'};
      if(s.hitChance===0)return{ok:false,reason:'no-presented-target'};
      if(check.reason||s.status!=='ready'||key!==s.targetKey)return{ok:false,reason:check.reason||'not-ready'};
      if(!motionReady(u,p,s))return{ok:false,reason:'must-stop'};
      s.pending={key,source:'manual'};return{ok:true};
    }
    function setMode(u,mode){
      if(!['auto','hold'].includes(mode))return false;
      const s=init(u,profileOf(u));s.fireMode=mode;
      if(mode==='hold'&&s.pending?.source==='auto')s.pending=null;
      return true;
    }
    function setAmmoPreference(u,preference){const p=profileOf(u),s=init(u,p);if(!managed(p)||!['auto',...p.ammunition.supported].includes(preference))return false;s.ammunition.preference=preference;syncAmmo(p,s);return true;}
    function ammoIncidentSnapshot(u){const p=profileOf(u),s=init(u,p);return incidentSnapshot(p,s);}
    function applyAmmoIncident(u,resolved,now,snapshot=null){
      const p=profileOf(u),s=init(u,p),config=p.ammoIncidents,a=s.ammunition;if(!managed(p)||config?.enabled!==true||!resolved?.confirmed)return null;
      const before=snapshot||incidentSnapshot(p,s),ids=p.ammunition.supported,section=resolved.section,outcome=resolved.outcome,lost=Object.fromEntries(ids.map(id=>[id,0]));
      if(outcome!=='fatal'&&ids.reduce((sum,id)=>sum+(before.sections?.[section]?.counts?.[id]||0),0)<=0)return null;
      if(outcome==='fatal'){
        for(const id of ids){lost[id]=ammunitionTotal(s,id);for(const counts of Object.values(a.sections))counts[id]=0;}
        a.loadedAmmoId=null;if(a.task)a.task.reserved=false;a.task=null;s.loaded=false;s.reloadProgress=0;s.reloadStartedAt=null;
      }else{
        const owned=before.sections[section].counts,total=ids.reduce((sum,id)=>sum+owned[id],0),amount=outcome==='isolatedFire'?total:Math.max(1,Math.ceil(total*config.partialLossFraction)),allocation=outcome==='isolatedFire'?cloneCounts(owned):proportionalLoss(owned,amount,ids);
        for(const id of ids){let remaining=allocation[id]||0,take=Math.min(remaining,a.sections[section][id]);a.sections[section][id]-=take;remaining-=take;lost[id]+=take;if(remaining&&a.task?.reserved&&a.task.source===section&&a.task.ammoId===id){lost[id]++;remaining--;a.task.reserved=false;a.task=null;s.reloadProgress=a.loadedAmmoId?1:0;s.reloadStartedAt=null;}if(remaining)throw Error('탄약고 사고 손실 소유권 오류');}
        if(outcome==='isolatedFire')a.incident.safetyUntil=Math.max(a.incident.safetyUntil,now+config.safetySeconds);
      }
      const lostCount=ids.reduce((sum,id)=>sum+lost[id],0),entry={id:resolved.impactId??'incident-'+now,time:now,section,outcome,lostCount,lost:{...lost},safetyUntil:a.incident.safetyUntil};
      for(const id of ids)a.incident.lostTotals[id]+=lost[id];a.incident.last=entry;a.incident.history.push(entry);if(a.incident.history.length>8)a.incident.history.shift();syncAmmo(p,s);
      return{section,outcome,lostCount,lost:{...lost},safetyUntil:a.incident.safetyUntil,totalBefore:before.total,totalAfter:s.ammo};
    }
    function emitCombatEffect({impactId,time,position,outcome}){
      if(!position||!['ammoLoss','isolatedFire','fatal'].includes(outcome))return null;
      return emitEffect({kind:'ammo-incident',time,expiresAt:time+(outcome==='fatal'?3.4:outcome==='isolatedFire'?2.8:1.2),position:{x:position.x,y:position.y,z:position.z},effectClass:outcome==='fatal'?'fatal':outcome==='isolatedFire'?'isolated-fire':'partial',visualSeed:Math.floor(random((impactId||'impact')+':visual:ammo-incident',seed^0x1b873593)*4294967296)>>>0});
    }
    function probe(u,key){const s=init(u,profileOf(u));if(!key)return false;s.lineProbeRequest=key;return true;}
    function view(u,key=null){
      const p=profileOf(u),s=init(u,p),same=!key||key===s.targetKey,readyToMoveFire=motionReady(u,p,s);
      const inspection=inspect(u,currentTime);
      const aimPenalty=observationPenalty(p,s,currentTime,u);
      const ammoState=managed(p)?s.ammunition:null,task=ammoState?.task,taskDuration=task?(task.stage==='prepare'?p.ammunition.sections[task.source].prepareSeconds/Math.max(Number.MIN_VALUE,u?.hitReactionModifiers?.loaderEfficiency??1):task.stage==='replenish'?p.ammunition.replenish.seconds[task.source]/Math.max(Number.MIN_VALUE,u?.hitReactionModifiers?.loaderEfficiency??1):reloadSeconds(p,s,u)):null;
      const incident=ammoState?.incident,incidentView=incident?{active:incident.safetyUntil>currentTime+1e-9,safetyUntil:incident.safetyUntil,remaining:Math.max(0,incident.safetyUntil-currentTime),last:incident.last?clone(incident.last):null,history:clone(incident.history),lostTotals:{...incident.lostTotals}}:null;
      const ammunition=ammoState?{managed:true,loadedAmmoId:ammoState.loadedAmmoId,preference:ammoState.preference,supported:[...p.ammunition.supported],total:ammunitionTotal(s),totals:Object.fromEntries(p.ammunition.supported.map(id=>[id,ammunitionTotal(s,id)])),sections:Object.fromEntries(Object.entries(ammoState.sections).map(([section,counts])=>[section,{capacity:p.ammunition.sections[section].capacity,total:sectionTotal(ammoState,section),counts:{...counts}}])),task:task?{purpose:task.purpose,ammoId:task.ammoId,source:task.source,stage:task.stage,progress:task.progress,paused:!!task.paused,pauseReason:task.pauseReason??null,remaining:task.paused?null:Math.max(0,(1-task.progress)*(taskDuration||0))}:null,engageable:engageableAmmo(p,s),incident:incidentView}:null;
      return{status:s.status,reason:s.status==='ready'&&!readyToMoveFire?'must-stop':inspection.reason||s.reason,targetKey:s.targetKey,aimProgress:s.aimProgress,layTime:s.layTime,targetVelocity:{...s.targetVelocity},ammo:s.ammo,mode:s.fireMode,pending:!!s.pending,pendingSource:s.pending?.source??null,
        canFire:same&&!inspection.reason&&s.status==='ready'&&!s.pending&&s.hitChance>0&&readyToMoveFire,motionReady:readyToMoveFire,stationaryElapsed:s.stationaryElapsed,autoSuppressed:s.autoSuppressed,hitChance:same?s.hitChance:null,zoneProbabilities:same&&s.zoneProbabilities?{...s.zoneProbabilities}:null,
        loading:{loaded:s.loaded,ammoId:currentAmmoId(p,s),progress:task?.purpose==='load'?task.progress:s.reloadProgress,stage:task?.purpose==='load'?task.stage:s.loaded?'loaded':'idle',estimatedSeconds:s.loaded?0:task?.purpose==='load'&&!task.paused?Math.max(0,(1-task.progress)*(taskDuration||0)):s.ammo>0&&!managed(p)?(1-s.reloadProgress)*reloadSeconds(p,s,u):null,currentWorkSeconds:reloadSeconds(p,s,u),chamber:s.loaded&&s.ammo>0?1:0,stored:Math.max(0,s.ammo-(s.loaded&&s.ammo>0?1:0)),burstShots:s.burstShots,fatigueSeconds:s.fatigueSeconds,shockSeconds:s.shockSeconds},ammunition,
        aimPenalty,
        faults:Object.fromEntries(faultKinds.map(kind=>[kind,{active:faultActive(s,kind,currentTime),remaining:Math.max(0,s.faultUntil[kind]-currentTime)}])),
        inFlight:flights.filter(v=>v.shooter===u).map(v=>({id:v.id,impactAt:v.impactAt,remaining:Math.max(0,v.impactAt-currentTime)})),breakdown:same&&s.breakdown?JSON.parse(JSON.stringify(s.breakdown)):null,shotCount:s.shotCount,lastShot:s.lastShot?JSON.parse(JSON.stringify(s.lastShot)):null};
    }
    function suppressAuto(u,value){const s=init(u,profileOf(u));s.autoSuppressed=!!value;if(value&&s.pending?.source==='auto')s.pending=null;return s.autoSuppressed;}
    function cancel(u){const s=init(u,profileOf(u));s.pending=null;s.lineProbeRequest=null;resetAim(s);s.status='blocked';s.reason='cancelled';clearPreview(s);}
    const publicEvents=(team,since=-Infinity)=>events.filter(e=>e.team===team&&e.time>=since).map(e=>JSON.parse(JSON.stringify(e)));
    const publicEffects=(since=-Infinity)=>effects.filter(e=>e.time>=since&&e.expiresAt>=currentTime).map(e=>clone(e));
    return{step,resolveImpacts:(units,now)=>{currentTime=now;pruneEffects(now);finishDue(units,now);},request,probe,setMode,setAmmoPreference,view,cancel,suppressAuto,react,ammoIncidentSnapshot,applyAmmoIncident,emitCombatEffect,events:publicEvents,effects:publicEffects,effectStats:()=>({queued:effects.length,limit:256}),debugRecords:()=>debug?clone(records):[]};
  }
  return Object.freeze({create,init,motionReady,reloadSeconds,faultChance,faultDuration,faultKind,observationPenalty,normalCdf,errorBudget,presentedRects,rectProbability,estimate,distribution,sideFor,reflectedHeading,resolve,impactEvaluation,sampleImpactPlane,pathHeight,marchImpact,impactLocation,proportionalLoss,zones:Object.freeze(zones)});
})();
if(typeof module!=='undefined')module.exports=TacticalFireControl;
