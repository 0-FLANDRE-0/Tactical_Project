'use strict';
/* Fictional RTS observation. Channel provenance and own observation are distinct
 * from shared knowledge. Every control point is an observed snapshot or order;
 * candidate unit coordinates are confined to sampling, never search control. */
const TacticalObservation=(()=>{
  const TAU=Math.PI*2,channels=['ambient','commander','gunner'];
  const diff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function hash(text,seed=0){let n=(2166136261^seed)>>>0;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619);n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;return(n>>>0)/4294967296;}
  const order=()=>({mode:'auto',point:null,interest:null,interestUntil:0,expiresAt:null,focus:null,focusSince:0,cooldowns:{}});
  const copyPose=p=>({...p,model:{...p.model,turretPivot:p.model?.turretPivot?.slice(),muzzleLocal:p.model?.muzzleLocal?.slice()}});
  const active=d=>d&&['designated','waiting','acquiring','acquired'].includes(d.status);
  const mission=s=>active(s.designation)?s.designation:active(s.tracking)?s.tracking:null;
  function init(u){
    if(!u.observation){u.commander??=u.turret;u.observation={commander:order(),gunner:order(),contacts:{},designation:{status:'idle'},tracking:{status:'idle'},pending:[],candidateRevision:0,autoAssignAfter:0,lastQuery:null};}
    u.observation.candidateRevision??=0;
    return u.observation;
  }
  function cancel(u,time=0,reason='manual'){
    const s=init(u),d=mission(s),delay=s.revisitSeconds??12;
    if(d?.target)for(const ch of ['commander','gunner'])s[ch].cooldowns[d.target]=time+delay;
    s.designation={status:'cancelled',reason,endedAt:time};s.tracking={status:'cancelled',reason,endedAt:time};s.pending=[];s.gunner.focus=null;s.autoAssignAfter=time+delay;
  }
  function guard(u,ch,point,duration=0,time=0){
    if(!['commander','gunner'].includes(ch)||!point||![point.x,point.y,duration,time].every(Number.isFinite)||duration<0)return false;
    Object.assign(init(u)[ch],{mode:'guard',point:{x:point.x,y:point.y},interest:{x:point.x,y:point.y},interestUntil:Number.MAX_VALUE,expiresAt:duration?time+duration:null,focus:null});
    return true;
  }
  function resume(u,ch,time=0){if(!['commander','gunner'].includes(ch))return false;Object.assign(init(u)[ch],{mode:'auto',point:null,interestUntil:time+8,expiresAt:null,focus:null});return true;}
  function interrupt(u,ch,time=0){
    if(!['commander','gunner'].includes(ch))return false;const s=init(u);
    for(const c of Object.values(s.contacts)){const source=c.sources?.[ch];if(source)source.current=false;c.channels=c.channels.filter(v=>v!==ch);c.current=!!(c.detected&&channels.some(v=>c.sources?.[v]?.current));if(ch==='gunner')c.gunnerSince=null;}
    const d=mission(s);if(ch==='gunner'&&d?.status==='acquired'){d.status='acquiring';d.reason='gunner-fault';d.expiresAt=Number.MAX_VALUE;}
    s[ch].focus=null;s[ch].interruptedAt=time;return true;
  }
  function create({profileOf,exposure,seed=7,onEvent=null,channelOperational=()=>true}){
    let tick=0,time=0,teams=new Map();
    const stats={queries:0,candidates:0,samples:0,rayQueries:0,rayCacheHits:0},geometryCaches=new WeakMap();
    const automaticControllers=new WeakMap();
    function emit(u,type,c=null,extra={}){
      if(onEvent)onEvent({time,observer:u.id,type,key:c?.key??null,detectedBy:c?.detectedBy??null,identifiedBy:c?.identifiedBy??null,current:c?.current??false,turret:u.turret,commander:u.commander,heading:u.heading,...extra});
    }
    function record(u,id){
      const s=init(u),t=profileOf(u).sensors.tuning;
      if(!s.contacts[id]){
        const random=label=>hash(u.id+':'+id+':'+label,seed);
        s.contacts[id]={key:'접촉-'+Math.floor(hash(id,seed)*4294967296).toString(36),detected:false,identified:false,enemyConfirmed:false,current:false,evidence:0,identityEvidence:0,
          detectAt:t.detectThreshold[0]+random('detect')*(t.detectThreshold[1]-t.detectThreshold[0]),identifyAt:t.identifyThreshold[0]+random('identify')*(t.identifyThreshold[1]-t.identifyThreshold[0]),
          detectedBy:null,detectedAt:null,identifiedBy:null,identifiedAt:null,confirmationOwner:null,
          sources:Object.fromEntries(channels.map(ch=>[ch,{current:false,lastSeen:-Infinity,firstSeen:null,detectedAt:null}])),
          lastSeen:-Infinity,knowledgeAt:-Infinity,pose:null,known:null,channels:[],gunnerSince:null,gunnerLastSeen:-Infinity,shared:null};
      }
      return s.contacts[id];
    }
    function designate(u,id,source='manual',shared=null){
      const s=init(u),c=shared||s.contacts[id],t=profileOf(u).sensors.tuning;
      if(!c?.detected||!c.pose||time-c.lastSeen>t.memorySeconds||!profileOf(u).sensors.gunner.enabled)return false;
      const local=record(u,id);
      if(shared){
        // Team knowledge is transferred, not own detection/evidence/current LOS.
        local.shared={pose:copyPose(c.pose),observedAt:c.lastSeen,receivedAt:time};
        if(c.identified){local.identified=true;local.enemyConfirmed=c.enemyConfirmed;local.known={...c.known,...(c.known?.combat?{combat:{...c.known.combat}}:{})};local.knowledgeAt=c.knowledgeAt;local.knowledgeSource='team';}
        emit(u,'team-designation-received',local,{source:'manual'});
      }
      if(source==='manual'){
        s.tracking={status:'cancelled',reason:'player-change',endedAt:time};
      }
      s.designation={status:'designated',target:id,key:local.key,source,pose:copyPose(c.pose),observedAt:c.lastSeen,startedAt:time,expiresAt:time+t.designationSeconds,reason:'slewing'};
      const before=s.pending.length;s.pending=s.pending.filter(v=>v.target!==id);if(s.pending.length!==before)s.candidateRevision++;emit(u,'designated',local,{source,status:'designated'});return true;
    }
    function targetStatus(u){
      const d=mission(init(u));return d?{target:d.target,key:d.key,source:d.source,status:d.status,reason:d.reason,pose:d.pose?{x:d.pose.x,y:d.pose.y}:null}:null;
    }
    function endAutomatic(u,reason,now,target=null){
      const s=init(u),d=mission(s);if(!d||d.source!=='ai'||target!==null&&d.target!==target)return false;
      d.status='lost';d.reason=reason;d.endedAt=now;s.gunner.focus=null;releaseCommander(s,d.target);emit(u,'target-lost',s.contacts[d.target],{source:'ai',status:'lost',reason});return true;
    }
    function controlAutomatic(u,enabled=true,now=time){
      if(enabled){const old=automaticControllers.get(u);automaticControllers.set(u,old||{desired:null});return true;}
      endAutomatic(u,'ai-disabled',now);automaticControllers.delete(u);return true;
    }
    function automatic(u,id,now=time){
      const ctl=automaticControllers.get(u);if(!ctl)return false;const s=init(u),c=s.contacts[id],d=mission(s);
      // A manual order owns the observation mission even when its current pose
      // is outside gunner range. Tactical AI separately decides whether that
      // order is engageable and must observe this rejection as a real failure.
      if(d?.source==='manual')return false;
      if(!c?.current||!c.identified||!c.enemyConfirmed||c.wreckConfirmed||!c.pose)return false;
      if(d?.target===id){if(d.source!=='ai'){d.source='ai';emit(u,'target-owner',c,{source:'ai',status:d.status});}ctl.desired=id;return true;}
      if(d){
        if(d.source==='ai')endAutomatic(u,'ai-switch',now);
        else{const previousSource=d.source;d.status='lost';d.reason='ai-switch';d.endedAt=now;s.gunner.focus=null;releaseCommander(s,d.target);emit(u,'target-lost',s.contacts[d.target],{source:previousSource,status:'lost',reason:'ai-switch'});}
      }
      const before=s.pending.length;s.pending=[];if(before)s.candidateRevision++;
      const accepted=designate(u,id,'ai');if(accepted)ctl.desired=id;return accepted;
    }
    function releaseAutomatic(u,now=time,reason='ai-release',target=null){
      const ctl=automaticControllers.get(u);if(!ctl)return false;ctl.desired=null;return endAutomatic(u,reason,now,target);
    }
    function focus(u,ch,now){
      const s=init(u),o=s[ch],t=profileOf(u).sensors.tuning,currentMission=mission(s);
      const usable=id=>{
        const c=s.contacts[id];if(!c?.detected||!c.pose||(o.cooldowns[id]??0)>now)return false;
        if(ch==='gunner')return now-c.sources.gunner.lastSeen<=t.lossGrace;
        if(currentMission?.target===id&&currentMission.status==='acquired')return false;
        if(c.identifiedBy==='gunner'&&c.sources.gunner.current)return false;
        return now-Math.max(c.sources.ambient.lastSeen,c.sources.commander.lastSeen)<=t.lossGrace;
      };
      const old=o.focus;
      if(old&&usable(old)&&now-o.focusSince<t.focusLimit)return s.contacts[old].pose;
      if(old&&usable(old)&&now-o.focusSince<t.focusSeconds)return s.contacts[old].pose;
      if(old){o.cooldowns[old]=now+t.revisitSeconds;s.contacts[old].confirmationOwner=null;}o.focus=null;
      const entries=Object.entries(s.contacts).filter(([id])=>usable(id));
      entries.sort((a,b)=>Number(a[1].identified)-Number(b[1].identified)||b[1].lastSeen-a[1].lastSeen||a[0].localeCompare(b[0]));
      if(entries.length){
        const[id,c]=entries[0];o.focus=id;o.focusSince=now;c.confirmationOwner=ch;emit(u,'focus',c,{channel:ch});return c.pose;
      }
      return null;
    }
    function control(u,dt,now){
      const s=init(u),p=profileOf(u),sensors=p.sensors;s.revisitSeconds=sensors.tuning.revisitSeconds;
      for(const ch of ['commander','gunner']){
        const o=s[ch],eq=sensors[ch];
        if(o.mode==='guard'&&o.expiresAt!==null&&now>=o.expiresAt)Object.assign(o,{mode:'auto',point:null,interestUntil:now+8,expiresAt:null,focus:null});
        if(!eq.enabled||(ch==='commander'&&!eq.independent))continue;
        const d=mission(s);
        let point=ch==='gunner'&&d?d.pose:o.mode==='guard'?o.point:null;
        if(!point)point=focus(u,ch,now);
        o.scanPhase??=hash(u.id+':'+ch,seed)*TAU;
        const scan=eq.scan,aim=point?Math.atan2(point.y-u.y,point.x-u.x):u.heading+scan.amplitude*Math.sin(now*TAU/scan.period+o.scanPhase);
        const modifiers=u.hitReactionModifiers||{},reactionRate=ch==='gunner'?(modifiers.turretRate??1):(modifiers.commanderRate??1);
        const maxRate=(ch==='gunner'?Math.min(p.mobility.turretRate,eq.rate):eq.rate)*reactionRate;
        const hullRate=o.lastHeading===undefined?0:Math.abs(diff(u.heading,o.lastHeading))/dt;
        const rate=point?maxRate:Math.min(maxRate,scan.rate+hullRate),field=ch==='gunner'?'turret':'commander';
        u[field]+=clamp(diff(aim,u[field]),-rate*dt,rate*dt);o.lastHeading=u.heading;o.targetBearing=aim;o.activity=o.mode==='guard'?'guard':point?'confirm':'scan';
      }
      if(!sensors.commander.enabled||!sensors.commander.independent)u.commander=u.turret;
      const current=mission(s);for(const[id,c]of Object.entries(s.contacts))c.confirmationOwner=current?.target===id||s.gunner.focus===id?'gunner':s.commander.focus===id?'commander':null;
    }
    function quality(u,ch,v){
      const e=profileOf(u).sensors[ch],d=Math.hypot(v.x-u.x,v.y-u.y);if(!e.enabled||d>e.range)return 0;
      const a=ch==='ambient'?0:Math.abs(diff(Math.atan2(v.y-u.y,v.x-u.x),ch==='gunner'?u.turret:u.commander));if(a>e.fov/2)return 0;
      const centre=ch==='ambient'?1:.2+.8*Math.cos(a/(e.fov/2)*Math.PI/2)**2;
      return centre*(1-.6*(d/e.range)**2)*Math.exp(-1.5*(v.forestDepth||0));
    }
    function query(u,candidates,now,elapsed){
      const s=init(u),p=profileOf(u),t=p.sensors.tuning,observed=new Map(),credit=Math.min(elapsed,t.queryPeriod),decay=Math.pow(.5,credit/t.evidenceHalfLife);stats.queries++;
      for(const target of candidates){
        if(target.team===u.team||target===u)continue;
        const tp=profileOf(target),pad=Math.hypot(tp.model.hullLength/2,tp.model.width/2),distance=Math.hypot(target.x-u.x,target.y-u.y);
        const eligible=channels.filter(ch=>{
          const e=p.sensors[ch];if(!e.enabled||distance>e.range+pad)return false;if(ch!=='ambient'&&!channelOperational(u,ch,now))return false;if(ch==='ambient'||distance<=pad)return true;
          return Math.abs(diff(Math.atan2(target.y-u.y,target.x-u.x),ch==='gunner'?u.turret:u.commander))<=e.fov/2+Math.asin(Math.min(1,pad/distance));
        });if(!eligible.length)continue;stats.candidates++;
        const geometry=new Map(),result={};
        for(const ch of eligible){
          const h=p.sensors[ch].eyeHeight;
          if(!geometry.has(h)){
            let targets=geometryCaches.get(u);if(!targets){targets=new WeakMap();geometryCaches.set(u,targets);}
            let heights=targets.get(target);if(!heights){heights=new Map();targets.set(target,heights);}
            let cache=heights.get(h);if(!cache){cache={samples:[]};heights.set(h,cache);}cache.time=now;cache.maxAge=t.geometryMaxAge;
            const ex=exposure(u,target,h,cache);geometry.set(h,ex);stats.samples++;stats.rayQueries+=ex.rayQueries??9;stats.rayCacheHits+=ex.rayCacheHits??0;
          }
          const ex=geometry.get(h),samples=ex.samples||[{x:target.x,y:target.y,visible:ex.visible,forestDepth:ex.forestDepth||0,part:'hull'}];let q=0,hull=0,turret=0;
          const channelSamples=ch==='gunner'?[]:null;
          for(const v of samples){const value=v.visible?quality(u,ch,v):0;q+=value;if(value>0){if(v.part==='turret')turret++;else hull++;}if(channelSamples)channelSamples.push({...v,visible:value>0});}
          result[ch]={quality:q/samples.length,hull:hull/6,turret:turret/3,...(channelSamples?{samples:channelSamples}:{})};
        }
        const detect=Math.max(0,...Object.values(result).map(v=>v.quality)),identify=Math.max(result.commander?.quality||0,result.gunner?.quality||0);if(detect<=0)continue;
        const c=record(u,target.id);observed.set(target.id,{result,detect,identify});
        c.evidence+=detect*credit;if(identify>0)c.identityEvidence+=identify*credit;
        if(!c.detected&&c.evidence>=c.detectAt){
          const best=channels.reduce((a,b)=>(result[b]?.quality||0)>(result[a]?.quality||0)?b:a,'ambient');
          c.detected=true;c.detectedBy=best;c.detectedAt=now;emit(u,'detected',c,{channel:best,current:true});
        }
        if(!c.identified&&identify>0&&c.identityEvidence>=c.identifyAt){
          const gunnerOwn=s.gunner.focus===target.id||c.detectedBy==='gunner';
          const by=result.gunner?.quality>0&&(gunnerOwn||!(result.commander?.quality>0))?'gunner':'commander';
          c.identified=true;c.enemyConfirmed=true;c.identifiedBy=by;c.identifiedAt=now;c.knowledgeSource=by;emit(u,'identified',c,{channel:by,enemyConfirmed:true,current:true});
        }
        if(c.detected){
          c.lastSeen=now;c.pose={x:target.x,y:target.y,heading:target.heading,turret:target.turret,commander:target.commander??target.turret,model:{hullLength:tp.model.hullLength,width:tp.model.width,turretLength:tp.model.turretLength,turretWidth:tp.model.turretWidth,barrelTip:tp.model.barrelTip,turretOrigin:tp.model.turretOrigin,turretPivot:[...tp.model.turretPivot],turretRingDiameter:tp.model.turretRingDiameter,muzzleLocal:[...tp.model.muzzleLocal]}};
          const best=Object.values(result).sort((a,b)=>b.quality-a.quality)[0];c.exposure={hull:best.hull,turret:best.turret};c.gunnerExposure=result.gunner?{hull:result.gunner.hull,turret:result.gunner.turret,samples:result.gunner.samples,presented:{...tp.fireControl.presented}}:{hull:0,turret:0,samples:[]};
          if(c.identified&&identify>0){
            c.known={name:target.name,type:tp.name,...(target.combat?{combat:{hp:target.combat.hp,maxHp:target.combat.maxHp,status:target.combat.status}}:{})};c.knowledgeAt=now;
          }
          if(c.detected&&result.commander?.quality>0)c.commanderDiscoveredAt??=now;
          if(c.identified&&result.commander?.quality>0)c.commanderIdentifiedAt??=now;
          // A destroyed world object remains an ordinary observation candidate.
          // Its private state becomes team knowledge only after this observer has
          // both re-detected it and obtained an identifying optical sample.
          if(target.combat?.status==='destroyed'&&c.detected&&c.identified&&identify>0){
            c.wreckConfirmed=true;c.wreckConfirmedAt??=now;
          }
        }
      }
      for(const[id,c]of Object.entries(s.contacts)){
        const seen=observed.get(id);c.current=c.detected&&!!seen;c.channels=[];
        // Detection and unfinished identification have independent validity.
        if(!seen)c.evidence*=decay;if(!seen?.identify)c.identityEvidence*=decay;
        for(const ch of channels){
          const source=c.sources[ch],valid=!!(c.detected&&seen?.result[ch]?.quality>0);
          if(valid){source.lastSeen=now;source.firstSeen??=now;source.detectedAt??=now;c.channels.push(ch);}
          if(source.current!==valid)emit(u,valid?'channel-seen':'channel-lost',c,{channel:ch,channelCurrent:valid});source.current=valid;
        }
        if(c.sources.gunner.current){c.gunnerSince??=now;c.gunnerLastSeen=now;}else c.gunnerSince=null;
        if(now-c.lastSeen>t.memorySeconds){c.detected=false;c.current=false;c.pose=null;}
        if(now-c.knowledgeAt>t.knowledgeSeconds){c.identified=false;c.enemyConfirmed=false;c.known=null;}
        if(c.shared&&now-c.shared.observedAt>t.memorySeconds)c.shared=null;
        if(!c.detected&&!c.identified&&!c.shared&&c.evidence<.001&&c.identityEvidence<.001)delete s.contacts[id];
      }
      s.lastQuery=now;
    }
    function releaseCommander(s,id){if(s.commander.mode==='auto'&&s.commander.focus===id){s.commander.focus=null;if(s.contacts[id])s.contacts[id].confirmationOwner=mission(s)?.target===id?'gunner':null;}}
    function finish(u,d,status,reason,now){
      const s=init(u),t=profileOf(u).sensors.tuning;d.status=status;d.reason=reason;d.endedAt=now;
      for(const ch of ['commander','gunner'])s[ch].cooldowns[d.target]=now+t.revisitSeconds;
      s.gunner.focus=null;releaseCommander(s,d.target);emit(u,'target-'+status,s.contacts[d.target],{source:d.source,status,reason});
    }
    function handoff(u,now){
      const s=init(u),sensors=profileOf(u).sensors,t=sensors.tuning;let d=mission(s);
      if(d){
        const c=s.contacts[d.target],previous=d.status;
        if(c?.current&&c.pose){d.pose=copyPose(c.pose);d.observedAt=c.lastSeen;}
        if(c?.wreckConfirmed){finish(u,d,'destroyed','confirmed-wreck',now);d=null;}
        else if(d.status==='acquired'&&now-(c?.gunnerLastSeen??-Infinity)>t.lossGrace){finish(u,d,'lost','own-observation-lost',now);d=null;}
        else if(d.status!=='acquired'&&(now>=d.expiresAt||now-d.observedAt>t.designationStale)){finish(u,d,'expired',now>=d.expiresAt?'timeout':'stale',now);d=null;}
        else if(c?.sources.gunner.current&&c.gunnerSince!==null&&now-c.gunnerSince>=t.acquireSeconds){
          d.status='acquired';d.reason='gunner';d.acquiredAt??=now;d.expiresAt=null;releaseCommander(s,d.target);s.commander.cooldowns[d.target]=now+t.revisitSeconds;
          if(previous!=='acquired')emit(u,'target-acquired',c,{source:d.source,status:'acquired'});
        }else if(d.status!=='acquired'){
          d.status=c?.gunnerSince===null||c?.gunnerSince===undefined?'waiting':'acquiring';
          d.reason=Math.hypot(d.pose.x-u.x,d.pose.y-u.y)>sensors.gunner.range?'range':Math.abs(diff(Math.atan2(d.pose.y-u.y,d.pose.x-u.x),u.turret))>sensors.gunner.fov/2?'slewing':'occluded';
        }
      }
      const controller=automaticControllers.get(u);
      if(controller){
        if(s.pending.length){s.pending=[];s.candidateRevision++;}
        return;
      }
      // Refresh pending candidates only from this commander's actual samples.
      const beforePending=s.pending.length;
      s.pending=s.pending.filter(v=>now-v.observedAt<=t.memorySeconds&&v.target!==d?.target&&!s.contacts[v.target]?.wreckConfirmed);
      if(s.pending.length!==beforePending)s.candidateRevision++;
      let pendingOrderChanged=false;
      if(sensors.hunterKiller&&sensors.commander.enabled){
        for(const[id,c]of Object.entries(s.contacts))if(c.current&&c.identified&&c.enemyConfirmed&&c.commanderIdentifiedAt!==undefined&&!c.wreckConfirmed&&c.sources.commander.current&&id!==d?.target){
          const entry={target:id,key:c.key,pose:copyPose(c.pose),observedAt:c.lastSeen,discoveredAt:c.commanderDiscoveredAt??c.sources.commander.firstSeen??c.lastSeen,identifiedAt:c.commanderIdentifiedAt},index=s.pending.findIndex(v=>v.target===id);
          if(index>=0)s.pending[index]=entry;
          else if((s.commander.cooldowns[id]??0)<=now){
            s.pending.push(entry);s.candidateRevision++;pendingOrderChanged=true;emit(u,'candidate-queued',c,{channel:'commander',discoveredAt:entry.discoveredAt,identifiedAt:entry.identifiedAt});
            if(d&&s.commander.mode==='auto'){releaseCommander(s,id);s.commander.cooldowns[id]=now+t.revisitSeconds;}
          }
        }
        if(pendingOrderChanged)s.pending.sort((a,b)=>a.discoveredAt-b.discoveredAt||(a.key<b.key?-1:a.key>b.key?1:0));
      }
      if(d||!sensors.gunner.enabled||now<s.autoAssignAfter)return;
      if(sensors.hunterKiller&&sensors.commander.enabled){
        const next=s.pending.find(v=>now-v.observedAt<=t.designationStale&&!s.contacts[v.target]?.wreckConfirmed&&(s.gunner.cooldowns[v.target]??0)<=now);
        if(next){designate(u,next.target,'commander');return;}
      }
      // Own gunner identification/recognition is a separate route, not a fake
      // commander handoff, and works without commander equipment or HK.
      const own=Object.entries(s.contacts).find(([id,c])=>c.current&&c.identified&&c.enemyConfirmed&&!c.wreckConfirmed&&c.sources.gunner.current&&(s.gunner.cooldowns[id]??0)<=now);
      if(own){
        const[id,c]=own;s.tracking={status:'acquiring',target:id,key:c.key,source:'gunner',pose:copyPose(c.pose),observedAt:c.lastSeen,startedAt:now,expiresAt:now+t.designationSeconds,reason:'own-confirmation'};
        releaseCommander(s,id);s.commander.cooldowns[id]=now+t.revisitSeconds;s.pending=s.pending.filter(v=>v.target!==id);emit(u,'gunner-own-target',c,{channel:'gunner',source:'gunner'});return;
      }
    }
    function retarget(u,target,reason,now){
      const s=init(u),d=mission(s),t=profileOf(u).sensors.tuning;
      if(automaticControllers.has(u))return false;
      if(!d||d.target!==target||d.status!=='acquired')return false;
      const next=s.pending.find(v=>v.target!==target&&now-v.observedAt<=t.designationStale&&!s.contacts[v.target]?.wreckConfirmed&&(s.gunner.cooldowns[v.target]??0)<=now);
      if(!next)return false;
      finish(u,d,'lost',reason,now);
      if(!designate(u,next.target,'commander'))return false;
      s.designation.reason=reason;s.designation.previousKey=d.key;
      emit(u,'target-switched',s.contacts[next.target],{source:'commander',reason,previousKey:d.key});
      return true;
    }
    function buildTeam(units){
      const merged=new Map();for(const u of units){const map=merged.get(u.team)||new Map();merged.set(u.team,map);
        for(const[id,c]of Object.entries(init(u).contacts)){
          if(!c.detected||!c.pose)continue;const old=map.get(id);if(!old){map.set(id,{...c,pose:copyPose(c.pose),known:c.known?{...c.known,...(c.known.combat?{combat:{...c.known.combat}}:{})}:null});continue;}
          // Observation pose and identification knowledge have separate clocks.
          // A later-listed observer's memory must not replace newer public HP,
          // even if that observer refreshed its pose using ambient sight only.
          const current=old.current||c.current;
          const source=c.identified&&c.known&&(!old.identified||!old.known||c.knowledgeAt>old.knowledgeAt)?c:old;
          const knowledge=source.identified&&source.known?{identified:true,enemyConfirmed:source.enemyConfirmed,known:{...source.known,...(source.known.combat?{combat:{...source.known.combat}}:{})},knowledgeAt:source.knowledgeAt}:null;
          if(c.lastSeen>old.lastSeen)Object.assign(old,{...c,pose:copyPose(c.pose)});
          if(knowledge)Object.assign(old,knowledge);old.current=current;
        }
      }teams=merged;
    }
    function advance(units,dt,now,candidates=units){
      time=now;tick++;for(const u of units)control(u,dt,now);
      const buckets=new Map(),size=500;for(const u of candidates){const k=Math.floor(u.x/size)+','+Math.floor(u.y/size);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(u);}
      for(const[index,u]of units.entries()){
        const s=init(u),p=profileOf(u).sensors,period=p.tuning.queryPeriod,stride=Math.max(1,Math.round(period/dt));if(tick%stride!==index%stride)continue;
        const radius=Math.max(...channels.map(ch=>p[ch].enabled?p[ch].range:0))+10,candidates=[];
        for(let y=Math.floor((u.y-radius)/size);y<=Math.floor((u.y+radius)/size);y++)for(let x=Math.floor((u.x-radius)/size);x<=Math.floor((u.x+radius)/size);x++){const group=buckets.get(x+','+y);if(group)candidates.push(...group);}
        query(u,candidates,now,s.lastQuery===null?0:now-s.lastQuery);
      }
      for(const u of units)handoff(u,now);buildTeam(units);
    }
    function contacts(team){return[...(teams.get(team)?.values()||[])].map(c=>{
      const v={key:c.key,...copyPose(c.pose),team:team==='blue'?'red':'blue',identified:c.identified,current:c.current,memory:!c.current,observedAt:c.lastSeen,age:Math.max(0,time-c.lastSeen),label:c.identified&&c.known?c.known.name:'미식별 표적'};
      if(c.identified&&c.known){v.name=c.known.name;v.type=c.known.type;if(c.known.combat)v.combat={...c.known.combat};if(c.current)v.exposure={...c.exposure};}return v;
    });}
    function direct(u,key){const match=[...(teams.get(u.team)?.entries()||[])].find(([,c])=>c.key===key);return!!match&&designate(u,match[0],'manual',match[1]);}
    function ownStatus(u,key=null){
      const s=init(u),entry=Object.values(s.contacts).find(c=>c.key===key),d=mission(s),last=s.tracking.endedAt>(s.designation.endedAt??-Infinity)?s.tracking:s.designation;
      return{current:entry?.current??false,channels:entry?.channels.slice()||[],identified:entry?.identified??false,
        gunnerCurrent:entry?.sources.gunner.current??false,acquired:!!(d?.status==='acquired'&&(!key||d.key===key)),
        targetKey:d?.key??null,status:d?.status??last.status,source:d?.source??last.source??null,reason:d?.reason??last.reason??null,pending:s.pending.length};
    }
    return{advance,contacts,direct,ownStatus,retarget,controlAutomatic,automatic,releaseAutomatic,targetStatus,stats};
  }
  function view(u,ch='commander',time=0){const o=init(u)[ch];return{mode:o.mode==='guard'?'fixed':'idle',turret:u.turret,gaze:u.commander,direction:o.mode==='guard'?Math.atan2(o.point.y-u.y,o.point.x-u.x):null,remaining:o.expiresAt===null?null:Math.max(0,o.expiresAt-time),point:o.point?{...o.point}:null};}
  return Object.freeze({create,init,guard,resume,cancel,interrupt,view,hash});
})();
if(typeof module!=='undefined')module.exports=TacticalObservation;
