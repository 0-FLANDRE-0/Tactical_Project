'use strict';
/* WIP11A abstract game damage. This module consumes the already-resolved hit
 * and zone; it never rolls hit, zone, penetration, damage or destruction. */
const TacticalCombatState=(()=>{
  const ZONES=Object.freeze(['hullFront','hullSide','hullRear','turretFront','turretSide','turretRear','upper']);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const diff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const clone=v=>JSON.parse(JSON.stringify(v));
  function deepFreeze(o){for(const v of Object.values(o))if(v&&typeof v==='object'&&!Object.isFrozen(v))deepFreeze(v);return Object.freeze(o);}
  const AMMUNITION=deepFreeze({
    M829A2:{
      id:'M829A2',name:'M829A2',kind:'KE',baseDamage:405,muzzleVelocity:1680,
      penetration:{rangesM:[10,2000],anglesDeg:[0,30,60],values:[[675,570,390],[635,535,365]],outsidePolicy:'clamp'},
      damageMultiplier:{points:[[0,.65],[.071429,1.05],[.142857,1.08],[.714286,.65],[.857143,.35],[.93,.20]],outsidePolicy:'clamp'}
    }
  });
  const ammunitionRegistry=Object.freeze({
    ids:()=>Object.freeze(Object.keys(AMMUNITION)),
    has:id=>Object.hasOwn(AMMUNITION,id),
    get(id){if(!Object.hasOwn(AMMUNITION,id))throw Error('등록되지 않은 탄약: '+id);return AMMUNITION[id];}
  });
  function finitePositive(v,label){if(!Number.isFinite(v)||v<=0)throw Error(label+' 값 오류');return v;}
  function validateProfile(p){
    if(!p?.combat)throw Error('차량 전투 프로파일 누락');
    finitePositive(p.combat.maxHp,'최대 HP');
    if(!p.weapons?.mainGun?.ammunitionId)throw Error('주포 탄약 ID 누락');
    ammunitionRegistry.get(p.weapons.mainGun.ammunitionId);
    for(const zone of ZONES){const a=p.combat.armor?.[zone];if(!a||!Number.isFinite(a.ke)||a.ke<0)throw Error('장갑 값 오류: '+zone);}
    return p;
  }
  function initUnit(u,p){
    validateProfile(p);
    if(u.combat)return u.combat;
    u.combat={maxHp:p.combat.maxHp,hp:p.combat.maxHp,status:'alive',ammoId:p.weapons.mainGun.ammunitionId,destroyedAt:null,lastDamage:null};
    return u.combat;
  }
  function interval(nodes,value){
    if(value<=nodes[0])return{lo:0,hi:0,t:0,clamped:value<nodes[0]};
    const last=nodes.length-1;if(value>=nodes[last])return{lo:last,hi:last,t:0,clamped:value>nodes[last]};
    for(let i=0;i<last;i++)if(value<=nodes[i+1])return{lo:i,hi:i+1,t:(value-nodes[i])/(nodes[i+1]-nodes[i]),clamped:false};
  }
  function penetrationAt(ammo,rangeM,angleDeg){
    finitePositive(rangeM,'사거리');if(!Number.isFinite(angleDeg)||angleDeg<0)throw Error('입사각 값 오류');
    const t=ammo.penetration,r=interval(t.rangesM,rangeM),a=interval(t.anglesDeg,angleDeg),row=i=>t.values[i][a.lo]+(t.values[i][a.hi]-t.values[i][a.lo])*a.t;
    return{value:row(r.lo)+(row(r.hi)-row(r.lo))*r.t,rangeClamped:r.clamped,angleClamped:a.clamped,rangeUsed:clamp(rangeM,t.rangesM[0],t.rangesM.at(-1)),angleUsed:clamp(angleDeg,t.anglesDeg[0],t.anglesDeg.at(-1))};
  }
  function multiplierAt(ammo,residualRatio){
    if(!Number.isFinite(residualRatio)||residualRatio<0)throw Error('잔여 관통비 값 오류');
    const points=ammo.damageMultiplier.points;
    if(residualRatio<=points[0][0])return points[0][1];
    for(let i=1;i<points.length;i++)if(residualRatio<=points[i][0]){const[a,x]=points[i-1],[b,y]=points[i];return x+(y-x)*(residualRatio-a)/(b-a);}
    return points.at(-1)[1];
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
  function evaluate({hit,zone,side,origin,pose,rangeM,profile,ammoId}){
    if(typeof hit!=='boolean')throw Error('명중 결과 누락');
    if(!hit)return Object.freeze({hit:false,penetrated:false,damage:0,reason:'miss'});
    validateProfile(profile);
    if(!ZONES.includes(zone))throw Error('지원하지 않는 피격 구역: '+zone);
    const ammo=ammunitionRegistry.get(ammoId),incidence=incidenceDeg(origin,pose,zone,side),pen=penetrationAt(ammo,rangeM,incidence),protection=profile.combat.armor[zone].ke;
    const penetrated=pen.value>=protection,residualRatio=penetrated?(pen.value-protection)/pen.value:0,multiplier=penetrated?multiplierAt(ammo,residualRatio):0,damage=penetrated?ammo.baseDamage*multiplier:0;
    if(!Number.isFinite(damage)||damage<0)throw Error('피해 계산 오류');
    return Object.freeze({hit:true,zone,side:side??null,kind:ammo.kind,incidenceDeg:incidence,penetration:pen.value,protection,penetrated,residualRatio,multiplier,baseDamage:ammo.baseDamage,damage,rangeM,rangeUsed:pen.rangeUsed,angleUsed:pen.angleUsed,rangeClamped:pen.rangeClamped,angleClamped:pen.angleClamped,reason:penetrated?'penetrated':'non-penetration'});
  }
  function create({profileOf,onDestroyed=null,recordLimit=200,idLimit=4096}={}){
    if(typeof profileOf!=='function')throw Error('profileOf 필요');
    if(!Number.isInteger(recordLimit)||recordLimit<1)throw Error('전투 기록 제한 오류');
    if(!Number.isInteger(idLimit)||idLimit<1)throw Error('착탄 ID 기록 제한 오류');
    // Runtime IDs are <shooter>-shot-<monotonic number>. Compress their exact
    // once-only history to one watermark plus the small out-of-order flight gap
    // per shooter. Synthetic/non-runtime IDs use a bounded recent-ID fallback.
    const sequences=new Map(),recent=new Set(),recentQueue=[],records=[];let destroyedCount=0,appliedCount=0;
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
      const hpBefore=state.hp,damage=Math.min(hpBefore,result.damage),hpAfter=clamp(hpBefore-damage,0,state.maxHp),destroyed=hpAfter<=0&&state.status!=='destroyed';
      state.hp=hpAfter;
      const record={applied:true,id,time:now,targetId:target.id,reason:result.reason,hit:result.hit,zone:result.zone??null,side:result.side??null,penetrated:result.penetrated,incidenceDeg:result.incidenceDeg??null,penetration:result.penetration??null,protection:result.protection??null,residualRatio:result.residualRatio??0,multiplier:result.multiplier??0,baseDamage:result.baseDamage??null,damage,hpBefore,hpAfter,maxHp:state.maxHp,destroyed};
      state.lastDamage={...record};
      if(destroyed){state.status='destroyed';state.destroyedAt=now;destroyedCount++;onDestroyed?.(target,record);}
      return remember(record);
    }
    return Object.freeze({apply,records:()=>clone(records),stats:()=>({applied:appliedCount,records:records.length,destroyed:destroyedCount,sequenceShooters:sequences.size,recentIds:recent.size})});
  }
  const publicRecord=r=>r?Object.freeze({reason:r.reason,hit:!!r.hit,zone:r.zone??null,side:r.side??null,penetrated:!!r.penetrated,incidenceDeg:r.incidenceDeg,penetration:r.penetration,protection:r.protection,residualRatio:r.residualRatio,multiplier:r.multiplier,baseDamage:r.baseDamage,damage:r.damage,hpBefore:r.hpBefore,hpAfter:r.hpAfter,maxHp:r.maxHp,destroyed:!!r.destroyed}):null;
  return Object.freeze({create,initUnit,validateProfile,evaluate,penetrationAt,multiplierAt,incidenceDeg,publicRecord,ammunitionRegistry,AMMUNITION,ZONES});
})();
if(typeof module!=='undefined')module.exports=TacticalCombatState;
