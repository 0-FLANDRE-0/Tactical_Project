'use strict';
/* WIP12 abstract game damage. This module consumes already-resolved hit, zone
 * and ricochet rolls; it never draws effects or owns a frame-time RNG. */
const TacticalCombatState=(()=>{
  const ZONES=Object.freeze(['hullFront','hullSide','hullRear','turretFront','turretSide','turretRear','upper']);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const diff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const clone=v=>JSON.parse(JSON.stringify(v));
  function deepFreeze(o){for(const v of Object.values(o))if(v&&typeof v==='object'&&!Object.isFrozen(v))deepFreeze(v);return Object.freeze(o);}
  const AMMUNITION=deepFreeze({
    M829A2:{
      id:'M829A2',name:'M829A2',kind:'KE',baseDamage:405,muzzleVelocity:1680,
      hitReactionPolicyId:'tank-ke/M829A2',
      penetration:{rangesM:[10,2000],anglesDeg:[0,30,60],values:[[675,570,390],[635,535,365]],parallelLimitDeg:90,outsidePolicy:'clamp'},
      ricochet:{anglesDeg:[78,80,81],chances:[0,.5,1],comparison:'roll<chance'},
      damageMultiplier:{points:[[0,.65],[.071429,1.05],[.142857,1.08],[.714286,.65],[.857143,.35],[.93,.20]],outsidePolicy:'clamp'}
    }
  });
  const ammunitionRegistry=Object.freeze({
    ids:()=>Object.freeze(Object.keys(AMMUNITION)),
    has:id=>Object.hasOwn(AMMUNITION,id),
    get(id){if(!Object.hasOwn(AMMUNITION,id))throw Error('등록되지 않은 탄약: '+id);return AMMUNITION[id];}
  });
  function validateHitReactionBindings(p){
    const config=p?.hitReactions;
    if(!config)return'not-participant';
    if(config.enabled===false)return'disabled';
    if(config.enabled!==true)throw Error('피격 반응 활성 상태 오류: '+(p?.id??'unknown'));
    const entries=Object.entries(config.policies||{});if(!entries.length)throw Error('피격 반응 효과 정책 누락: '+p.id);
    for(const[policyId,policy]of entries){
      if(!policy||typeof policy.ammoId!=='string'||!ammunitionRegistry.has(policy.ammoId))throw Error('피격 반응 효과 정책 탄약 연결 오류: '+p.id+'.'+policyId);
      const ammo=ammunitionRegistry.get(policy.ammoId);
      if(ammo.hitReactionPolicyId!==policyId)throw Error('피격 반응 효과 정책 ID 연결 오류: '+p.id+'.'+policyId);
    }
    return'active';
  }
  function validateProfileRegistry(registry){
    if(!registry||typeof registry.list!=='function')throw Error('차량 프로파일 레지스트리 누락');
    for(const profile of registry.list())validateHitReactionBindings(profile);
    return registry;
  }
  function finitePositive(v,label){if(!Number.isFinite(v)||v<=0)throw Error(label+' 값 오류');return v;}
  function validateProfile(p){
    if(!p?.combat)throw Error('차량 전투 프로파일 누락');
    finitePositive(p.combat.maxHp,'최대 HP');
    if(!p.weapons?.mainGun?.ammunitionId)throw Error('주포 탄약 ID 누락');
    ammunitionRegistry.get(p.weapons.mainGun.ammunitionId);
    validateHitReactionBindings(p);
    for(const zone of ZONES){const a=p.combat.armor?.[zone];if(!a||!Number.isFinite(a.ke)||a.ke<0)throw Error('장갑 값 오류: '+zone);}
    return p;
  }
  function initUnit(u,p){
    validateProfile(p);
    if(u.combat){initHitReactions(u,p);return u.combat;}
    u.combat={maxHp:p.combat.maxHp,hp:p.combat.maxHp,status:'alive',ammoId:p.weapons.mainGun.ammunitionId,destroyedAt:null,lastDamage:null};
    initHitReactions(u,p);
    return u.combat;
  }
  const ALLOWED_CREW_ROLES=Object.freeze(['driver','commander','gunner','loader']),SEVERITY=Object.freeze({normal:0,light:1,serious:2});
  const normalModifiers=()=>({drivePower:1,hullTurn:1,turretRate:1,commanderRate:1,gunnerAimRate:1,gunnerSigma:1,loaderEfficiency:1});
  function initHitReactions(u,p){
    const config=p?.hitReactions;if(!config)return null;
    if(config.enabled===false)return null;
    validateHitReactionBindings(p);
    if(config.victimProfileId!==p.id)throw Error('피격 반응 대상 프로파일 오류');
    if(!u.hitReactions)u.hitReactions={profileId:p.id,faultUntil:{mobility:0,turretDrive:0},crew:Object.fromEntries(config.roles.map(role=>[role,'normal'])),lastOutcome:null};
    if(u.hitReactions.profileId!==p.id)throw Error('피격 반응 상태 프로파일 불일치');
    if(!u.hitReactions._processed)Object.defineProperty(u.hitReactions,'_processed',{value:{ids:new Set(),queue:[]},enumerable:false});
    return u.hitReactions;
  }
  function weighted(weights,roll,order=Object.keys(weights)){let cumulative=0,last=null;for(const key of order){const value=weights[key];if(value>0)last=key;cumulative+=value;if(roll<cumulative)return key;}return last;}
  function reactionClass(result){return result.ricochet?'ricochet':result.penetrated?'penetration':result.nearNonPenetration?'nearNonPenetration':'nonPenetration';}
  function resolveHitReaction(profile,ammoId,result,rolls){
    const config=profile?.hitReactions;if(!config||config.enabled===false||!result?.hit)return null;
    validateHitReactionBindings(profile);
    const ammo=ammunitionRegistry.get(ammoId);if(config.victimProfileId!==profile.id)return null;
    const policyId=ammo.hitReactionPolicyId,policy=config.policies?.[policyId];if(!policy||policy.ammoId!==ammoId)return null;
    const classification=reactionClass(result),row=policy.rows[classification]?.[result.zone];if(!row)return null;
    for(const value of Object.values(rolls||{}))if(!Number.isFinite(value)||value<0||value>1)throw Error('피격 반응 난수 값 오류');
    const occurrence=rolls?.occurrence??0,targetRoll=rolls?.target??0,durationRoll=rolls?.duration??0,s=config.susceptibility;
    const limits=[['temporaryFault',row.temporaryFault*s.temporaryFault],['crewLight',row.crewLight*s.crewLight],['crewSerious',row.crewSerious*s.crewSerious]];let cumulative=0,category=null;
    for(const[name,chance]of limits){cumulative+=chance;if(occurrence<cumulative){category=name;break;}}
    if(!category)return null;
    const totalChance=limits.reduce((sum,v)=>sum+v[1],0);
    if(category==='temporaryFault'){
      const target=weighted(policy.faultWeights[result.zone],targetRoll),fault=config.faults[target],[lo,hi]=fault.durationSeconds,duration=lo+(hi-lo)*durationRoll;
      return{policyId,classification,category,target,duration,occurrence,targetRoll,durationRoll,totalChance};
    }
    const severity=category==='crewLight'?'light':'serious',target=weighted(policy.crewWeights[severity][result.zone],targetRoll,config.roles);
    return{policyId,classification,category,target,severity,occurrence,targetRoll,durationRoll:null,totalChance};
  }
  function hitReactionModifiers(u,p,now=0){
    const state=u?.hitReactions,config=p?.hitReactions,out=normalModifiers();if(!state||!config||config.enabled!==true||u.combat?.status==='destroyed')return out;
    if(state.faultUntil.mobility>now+1e-9)out.drivePower=Math.min(out.drivePower,config.faults.mobility.factor);
    if(state.faultUntil.turretDrive>now+1e-9)out.turretRate=Math.min(out.turretRate,config.faults.turretDrive.factor);
    for(const role of config.roles){const severity=state.crew[role];if(severity==='normal')continue;const effect=config.crewEffects[role][severity];
      if(role==='driver'){out.drivePower=Math.min(out.drivePower,effect.drivePower);out.hullTurn=Math.min(out.hullTurn,effect.hullTurn);}
      else if(role==='commander')out.commanderRate=Math.min(out.commanderRate,effect.commanderTurn);
      else if(role==='gunner'){out.gunnerAimRate=Math.min(out.gunnerAimRate,effect.aimRate);out.gunnerSigma=Math.max(out.gunnerSigma,effect.sigma);}
      else out.loaderEfficiency=Math.min(out.loaderEfficiency,effect.reloadEfficiency);
    }
    return out;
  }
  function applyResolvedHitReaction(u,p,outcome,now=0){
    if(!outcome)return null;const state=initHitReactions(u,p),config=p.hitReactions;if(!state)throw Error('비활성 피격 반응 적용 오류');let changed=false,until=null;
    if(outcome.category==='temporaryFault'){if(!Object.hasOwn(config.faults,outcome.target))throw Error('피격 반응 장비 대상 오류');until=Math.max(state.faultUntil[outcome.target],now+outcome.duration);changed=until!==state.faultUntil[outcome.target];state.faultUntil[outcome.target]=until;}
    else{if(!config.roles.includes(outcome.target)||!Object.hasOwn(SEVERITY,outcome.severity))throw Error('피격 반응 승무원 대상 오류');if(SEVERITY[outcome.severity]>SEVERITY[state.crew[outcome.target]]){state.crew[outcome.target]=outcome.severity;changed=true;}}
    state.lastOutcome={time:now,category:outcome.category,target:outcome.target,severity:outcome.severity??null};return{...outcome,changed,until};
  }
  function hitReactionView(u,p,now=0){
    const state=u?.hitReactions;if(!state||p?.hitReactions?.enabled!==true)return null;
    return{faults:Object.fromEntries(['mobility','turretDrive'].map(kind=>[kind,{active:u.combat?.status!=='destroyed'&&state.faultUntil[kind]>now+1e-9,remaining:u.combat?.status==='destroyed'?0:Math.max(0,state.faultUntil[kind]-now)}])),crew:{...state.crew},modifiers:hitReactionModifiers(u,p,now)};
  }
  function interval(nodes,value){
    if(value<=nodes[0])return{lo:0,hi:0,t:0,clamped:value<nodes[0]};
    const last=nodes.length-1;if(value>=nodes[last])return{lo:last,hi:last,t:0,clamped:value>nodes[last]};
    for(let i=0;i<last;i++)if(value<=nodes[i+1])return{lo:i,hi:i+1,t:(value-nodes[i])/(nodes[i+1]-nodes[i]),clamped:false};
  }
  function penetrationAt(ammo,rangeM,angleDeg){
    finitePositive(rangeM,'사거리');if(!Number.isFinite(angleDeg)||angleDeg<0)throw Error('입사각 값 오류');
    const t=ammo.penetration,r=interval(t.rangesM,rangeM),last=t.anglesDeg.at(-1),limit=t.parallelLimitDeg??last,used=clamp(angleDeg,t.anglesDeg[0],limit);
    let lo,hi,ratio;
    if(used>last){lo=hi=t.anglesDeg.length-1;ratio=0;}
    else{const a=interval(t.anglesDeg,used);lo=a.lo;hi=a.hi;ratio=a.t;}
    const row=i=>{const base=t.values[i][lo]+(t.values[i][hi]-t.values[i][lo])*ratio;return used>last?base*(limit-used)/(limit-last):base;};
    return{value:row(r.lo)+(row(r.hi)-row(r.lo))*r.t,rangeClamped:r.clamped,angleClamped:angleDeg>limit,rangeUsed:clamp(rangeM,t.rangesM[0],t.rangesM.at(-1)),angleUsed:used};
  }
  function ricochetChance(ammo,angleDeg){
    if(!Number.isFinite(angleDeg)||angleDeg<0)throw Error('도탄 입사각 값 오류');
    const rule=ammo.ricochet;if(!rule)return 0;const a=interval(rule.anglesDeg,angleDeg);
    return rule.chances[a.lo]+(rule.chances[a.hi]-rule.chances[a.lo])*a.t;
  }
  function multiplierAt(ammo,residualRatio){
    if(!Number.isFinite(residualRatio)||residualRatio<0)throw Error('잔여 관통비 값 오류');
    const points=ammo.damageMultiplier.points;
    if(residualRatio<=points[0][0])return points[0][1];
    for(let i=1;i<points.length;i++)if(residualRatio<=points[i][0]){const[a,x]=points[i-1],[b,y]=points[i];return x+(y-x)*(residualRatio-a)/(b-a);}
    return points.at(-1)[1];
  }
  function nearDamageAt(profile,deficit){
    const rule=profile.fireControl.readiness.nearNonPenetration,points=rule.damagePoints;
    if(!(deficit>0&&deficit<rule.maxDeficit))return 0;
    for(let i=1;i<points.length;i++)if(deficit<=points[i][0]){const[a,x]=points[i-1],[b,y]=points[i];return x+(y-x)*(deficit-a)/(b-a);}
    return 0;
  }
  function faceHeading(pose,zone,side){
    const heading=zone.startsWith('turret')?pose.turret:pose.heading;
    if(zone.endsWith('Front'))return heading;
    if(zone.endsWith('Rear'))return heading+Math.PI;
    if(zone.endsWith('Side')){if(!['left','right'].includes(side))throw Error('측면 좌우 값 오류');return heading+(side==='right'?Math.PI/2:-Math.PI/2);}
    return heading;
  }
  function incidenceDeg(origin,pose,zone,side){
    if(!origin||!pose||![origin.x,origin.y,pose.x,pose.y,pose.heading,pose.turret].every(Number.isFinite))throw Error('착탄 자세 값 오류');
    if(zone==='upper')return 0;
    const incoming=Math.atan2(origin.y-pose.y,origin.x-pose.x);
    return Math.abs(diff(incoming,faceHeading(pose,zone,side)))*180/Math.PI;
  }
  function evaluate({hit,zone,side,origin,pose,rangeM,profile,ammoId,ricochetRoll,nearDamageRoll}){
    if(typeof hit!=='boolean')throw Error('명중 결과 누락');
    if(!hit)return Object.freeze({hit:false,ricochet:false,penetrated:false,damage:0,reason:'miss'});
    validateProfile(profile);
    if(!ZONES.includes(zone))throw Error('지원하지 않는 피격 구역: '+zone);
    if(!Number.isFinite(ricochetRoll)||ricochetRoll<0||ricochetRoll>=1)throw Error('도탄 난수 값 오류');
    const ammo=ammunitionRegistry.get(ammoId),incidence=incidenceDeg(origin,pose,zone,side),chance=ricochetChance(ammo,incidence),ricochet=ricochetRoll<chance,pen=penetrationAt(ammo,rangeM,incidence),protection=profile.combat.armor[zone].ke;
    if(ricochet)return Object.freeze({hit:true,zone,side:side??null,kind:ammo.kind,incidenceDeg:incidence,ricochet:true,ricochetChance:chance,ricochetRoll,penetration:pen.value,protection,protectionDeficit:Math.max(0,protection-pen.value),nearNonPenetration:false,nearDamageChance:0,nearDamageRoll:null,penetrated:false,residualRatio:0,multiplier:0,baseDamage:ammo.baseDamage,damage:0,rangeM,rangeUsed:pen.rangeUsed,angleUsed:pen.angleUsed,rangeClamped:pen.rangeClamped,angleClamped:pen.angleClamped,reason:'ricochet'});
    const penetrated=pen.value>0&&pen.value>=protection,protectionDeficit=Math.max(0,protection-pen.value),nearRule=profile.fireControl.readiness.nearNonPenetration,nearNonPenetration=!penetrated&&pen.value>0&&protectionDeficit>0&&protectionDeficit<nearRule.maxDeficit;
    if(nearNonPenetration&&(!Number.isFinite(nearDamageRoll)||nearDamageRoll<0||nearDamageRoll>=1))throw Error('근접 비관통 난수 값 오류');
    const residualRatio=penetrated?(pen.value-protection)/pen.value:0,multiplier=penetrated?multiplierAt(ammo,residualRatio):0;
    const damage=penetrated?ammo.baseDamage*multiplier:nearNonPenetration&&nearDamageRoll<nearRule.chance?nearDamageAt(profile,protectionDeficit):0;
    if(!Number.isFinite(damage)||damage<0)throw Error('피해 계산 오류');
    return Object.freeze({hit:true,zone,side:side??null,kind:ammo.kind,incidenceDeg:incidence,ricochet:false,ricochetChance:chance,ricochetRoll,penetration:pen.value,protection,protectionDeficit,nearNonPenetration,nearDamageChance:nearNonPenetration?nearRule.chance:0,nearDamageRoll:nearNonPenetration?nearDamageRoll:null,penetrated,residualRatio,multiplier,baseDamage:ammo.baseDamage,damage,rangeM,rangeUsed:pen.rangeUsed,angleUsed:pen.angleUsed,rangeClamped:pen.rangeClamped,angleClamped:pen.angleClamped,reason:penetrated?'penetrated':'non-penetration'});
  }
  function create({profileOf,onDestroyed=null,recordLimit=200,idLimit=4096,seed=7}={}){
    if(typeof profileOf!=='function')throw Error('profileOf 필요');
    if(!Number.isInteger(recordLimit)||recordLimit<1)throw Error('전투 기록 제한 오류');
    if(!Number.isInteger(idLimit)||idLimit<1)throw Error('착탄 ID 기록 제한 오류');
    // Runtime IDs are <shooter>-shot-<monotonic number>. Compress their exact
    // once-only history to one watermark plus the small out-of-order flight gap
    // per shooter. Synthetic/non-runtime IDs use a bounded recent-ID fallback.
    const sequences=new Map(),recent=new Set(),recentQueue=[],records=[];let destroyedCount=0,appliedCount=0,reactionEligible=0,reactionOutcomes=0;
    function random(text,salt){let n=(2166136261^seed^salt)>>>0;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);n^=n>>>16;n=Math.imul(n,0x7feb352d);return((n^(n>>>15))>>>0)/4294967296;}
    function applyHitReaction(target,profile,result,id,now){
      if(profile.hitReactions?.enabled!==true||!result.hit||target.combat?.status==='destroyed')return null;
      const history=initHitReactions(target,profile)._processed;if(history.ids.has(id))return null;
      history.ids.add(id);history.queue.push(id);if(history.queue.length>idLimit)history.ids.delete(history.queue.shift());reactionEligible++;
      const outcome=resolveHitReaction(profile,result.ammoId||target.combat.ammoId,result,{occurrence:random(id+':wip18:occurrence',0xa54ff53a),target:random(id+':wip18:target',0x510e527f),duration:random(id+':wip18:duration',0x9b05688c)});
      if(!outcome)return null;reactionOutcomes++;return applyResolvedHitReaction(target,profile,outcome,now);
    }
    const parsed=id=>{const m=id.match(/^(.*)-shot-([1-9][0-9]*)$/);return m?{shooter:m[1],number:Number(m[2])}:null;};
    function duplicate(id){const p=parsed(id);if(!p)return recent.has(id);const s=sequences.get(p.shooter);return!!s&&(p.number<=s.contiguous||s.pending.has(p.number));}
    function mark(id){const p=parsed(id);if(!p){recent.add(id);recentQueue.push(id);if(recentQueue.length>idLimit)recent.delete(recentQueue.shift());appliedCount++;return;}
      let s=sequences.get(p.shooter);if(!s){s={contiguous:0,pending:new Set()};sequences.set(p.shooter,s);}s.pending.add(p.number);while(s.pending.delete(s.contiguous+1))s.contiguous++;appliedCount++;}
    const remember=r=>{records.push(r);if(records.length>recordLimit)records.shift();return r;};
    function apply(event,target,now=0){
      const id=event?.id;if(typeof id!=='string'||!id)throw Error('착탄 ID 누락');
      if(duplicate(id))return{applied:false,reason:'duplicate',id};
      if(!target){mark(id);return remember({applied:false,reason:'target-unavailable',id,time:now});}
      const profile=validateProfile(profileOf(target)),state=initUnit(target,profile);
      if(state.status==='destroyed'){mark(id);return remember({applied:false,reason:'target-destroyed',id,time:now,targetId:target.id,hpBefore:state.hp,hpAfter:state.hp,damage:0,destroyed:false});}
      const result=evaluate({...event,profile,ammoId:event.ammoId||profile.weapons.mainGun.ammunitionId});
      mark(id);
      const hpBefore=state.hp,computedDamage=result.damage,damage=Math.min(hpBefore,computedDamage),hpAfter=clamp(hpBefore-damage,0,state.maxHp),destroyed=hpAfter<=0&&state.status!=='destroyed';
      state.hp=hpAfter;
      const record={applied:true,id,time:now,targetId:target.id,ammoId:event.ammoId||profile.weapons.mainGun.ammunitionId,reason:result.reason,hit:result.hit,zone:result.zone??null,side:result.side??null,ricochet:!!result.ricochet,ricochetChance:result.ricochetChance??0,ricochetRoll:result.ricochetRoll??null,penetrated:result.penetrated,incidenceDeg:result.incidenceDeg??null,penetration:result.penetration??null,protection:result.protection??null,protectionDeficit:result.protectionDeficit??null,nearNonPenetration:!!result.nearNonPenetration,nearDamageChance:result.nearDamageChance??0,nearDamageRoll:result.nearDamageRoll??null,residualRatio:result.residualRatio??0,multiplier:result.multiplier??0,baseDamage:result.baseDamage??null,computedDamage,damage,hpBefore,hpAfter,maxHp:state.maxHp,destroyed};
      state.lastDamage={...record};
      if(destroyed){state.status='destroyed';state.destroyedAt=now;destroyedCount++;onDestroyed?.(target,record);}
      record.hitReaction=applyHitReaction(target,profile,{...result,ammoId:record.ammoId},id,now);
      return remember(record);
    }
    return Object.freeze({apply,records:()=>clone(records),stats:()=>({applied:appliedCount,records:records.length,destroyed:destroyedCount,sequenceShooters:sequences.size,recentIds:recent.size,reactionEligible,reactionOutcomes})});
  }
  const publicRecord=r=>r?Object.freeze({reason:r.reason,hit:!!r.hit,zone:r.zone??null,side:r.side??null,ricochet:!!r.ricochet,ricochetChance:r.ricochetChance??0,ricochetRoll:r.ricochetRoll??null,penetrated:!!r.penetrated,incidenceDeg:r.incidenceDeg,penetration:r.penetration,protection:r.protection,protectionDeficit:r.protectionDeficit,nearNonPenetration:!!r.nearNonPenetration,residualRatio:r.residualRatio,multiplier:r.multiplier,baseDamage:r.baseDamage,damage:r.damage,hpBefore:r.hpBefore,hpAfter:r.hpAfter,maxHp:r.maxHp,destroyed:!!r.destroyed}):null;
  const loadedProfiles=typeof VEHICLE_PROFILES!=='undefined'?VEHICLE_PROFILES:typeof require==='function'?require('./vehicle-profiles.js'):null;
  if(loadedProfiles?.registry)validateProfileRegistry(loadedProfiles.registry);
  return Object.freeze({create,initUnit,initHitReactions,resolveHitReaction,applyResolvedHitReaction,hitReactionModifiers,hitReactionView,validateProfile,validateHitReactionBindings,validateProfileRegistry,evaluate,penetrationAt,ricochetChance,multiplierAt,nearDamageAt,incidenceDeg,publicRecord,ammunitionRegistry,AMMUNITION,ZONES,ALLOWED_CREW_ROLES});
})();
if(typeof module!=='undefined')module.exports=TacticalCombatState;
