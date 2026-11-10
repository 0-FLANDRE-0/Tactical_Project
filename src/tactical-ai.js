'use strict';
/* Lightweight mission and engagement policy. Decisions use only a unit's own
 * observation copies and private readiness. Observation owns handoff, sim-core
 * owns paths, and fire-control remains the final firing authority. */
const TacticalAI=(()=>{
  const STATE=Symbol('tactical-ai-state');
  const POLICIES=Object.freeze(['maintain','halt','auto']);
  const DEFAULTS=Object.freeze({decisionPeriod:.75,lossGrace:1.5,observationHold:2.5,pathRetry:2,pathBudget:2,maxWaypoints:8,
    targetMinHold:2.25,switchMargin:.20,switchConfirmations:2,blockedRetry:2});
  const clone=v=>JSON.parse(JSON.stringify(v));
  const active=d=>d&&['designated','waiting','acquiring','acquired'].includes(d.status);
  const mission=u=>[u.observation?.designation,u.observation?.tracking].find(active)||null;
  function phase(id,period){let h=2166136261;for(const c of String(id))h=Math.imul(h^c.charCodeAt(0),16777619);const slots=Math.max(1,Math.round(period/.05));return((h>>>0)%slots)*period/slots;}
  function state(u){return u?.[STATE]||null;}
  function validate(spec){
    if(!spec||!['move','patrol'].includes(spec.type))throw Error('AI 임무 종류 오류');
    if(!POLICIES.includes(spec.policy))throw Error('AI 교전 이동 정책 오류');
    if(spec.stopPreference!==undefined&&!['maintain','halt'].includes(spec.stopPreference))throw Error('AI 자동 정책 선호 오류');
    if(!Array.isArray(spec.waypoints)||!spec.waypoints.length||spec.waypoints.length>DEFAULTS.maxWaypoints)throw Error('AI 경유점 개수 오류');
    if(spec.type==='move'&&spec.waypoints.length!==1)throw Error('지점 이동 임무는 경유점 하나가 필요함');
    if(!spec.waypoints.every(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&(!Object.hasOwn(p,'reverse')||typeof p.reverse==='boolean')))throw Error('AI 경유점 값 오류');
    if(spec.type==='move'&&spec.loop)throw Error('지점 이동 임무는 반복할 수 없음');
  }
  const counterKeys=['decisions','pathRequests','pathFailures','stops','resumes','waypoints','duplicateCommandsAvoided','targetSelections','targetSwitches','targetCommands','blockedTargets'];
  function assign(u,spec,now=0,decisionPeriod=DEFAULTS.decisionPeriod){
    validate(spec);const previous=state(u),revision=(previous?.mission.revision||0)+1;
    const counters=Object.fromEntries(counterKeys.map(k=>[k,0]));
    const value={enabled:true,mission:{id:String(spec.id||u.id+'-mission'),revision,type:spec.type,waypoints:spec.waypoints.map(p=>({x:p.x,y:p.y,reverse:!!p.reverse})),index:0,loop:spec.type==='patrol'&&spec.loop!==false,status:'active'},
      policy:spec.policy,stopPreference:spec.stopPreference||'maintain',behavior:'mission',nextThinkAt:now+phase(u.id,decisionPeriod),retryAt:now,lastContactKey:null,lostAt:null,haltElapsed:0,autoSuppressed:false,resumeStatus:null,
      autoTargetId:null,autoTargetKey:null,targetSelectedAt:-Infinity,challengerId:null,challengerCount:0,blockedCandidates:{},counters};
    Object.defineProperty(u,STATE,{value,writable:true,configurable:true,enumerable:false});return inspect(u);
  }
  function setSuppressed(u,s,value,callback){if(s.autoSuppressed===value)return;s.autoSuppressed=value;callback(u,value);}
  function override(u,reason='manual-command'){
    const s=state(u);if(!s?.enabled)return false;s.onDisable?.(u,s.currentTime??0,reason);s.enabled=false;s.mission.status='cancelled';s.behavior=reason;s.lastContactKey=null;s.lostAt=null;s.autoSuppressed=false;s.autoTargetId=null;s.autoTargetKey=null;s.challengerId=null;s.challengerCount=0;
    if(u.fireControl)u.fireControl.autoSuppressed=false;return true;
  }
  function destroy(u){const s=state(u);if(!s?.enabled)return false;s.onDisable?.(u,s.currentTime??0,'destroyed');s.enabled=false;s.mission.status='destroyed';s.behavior='destroyed';s.lastContactKey=null;s.lostAt=null;s.autoSuppressed=false;s.autoTargetId=null;s.autoTargetKey=null;if(u.fireControl)u.fireControl.autoSuppressed=false;return true;}
  const effectiveRange=(u,p)=>Math.min(p.fireControl.maxRange,p.sensors.gunner.range);
  const geometrySignature=(u,c)=>[u.x,u.y,u.heading,u.turret,c.pose.x,c.pose.y,c.pose.heading,c.pose.turret].map(v=>Number.isFinite(v)?v:null).join(':');
  function automaticCandidates(u,s,p,now){
    const range=effectiveRange(u,p),out=[];
    for(const[id,c]of Object.entries(u.observation?.contacts||{})){
      if(!c.current||!c.identified||!c.enemyConfirmed||c.wreckConfirmed||!c.pose)continue;
      const distance=Math.hypot(c.pose.x-u.x,c.pose.y-u.y);if(distance>range)continue;
      const signature=geometrySignature(u,c),blocked=s.blockedCandidates[id];
      if(blocked&&blocked.signature!==signature)delete s.blockedCandidates[id];
      else if(blocked&&blocked.until>now+1e-9)continue;
      else if(blocked)delete s.blockedCandidates[id];
      const score=1-Math.max(0,Math.min(1,distance/range))+(c.sources?.gunner?.current?.15:0)+(s.autoTargetId===id?.15:0);
      out.push({id,key:c.key,contact:c,distance,score,identifiedAt:Number.isFinite(c.identifiedAt)?c.identifiedAt:Infinity});
    }
    out.sort((a,b)=>b.score-a.score||a.identifiedAt-b.identifiedAt||(a.key<b.key?-1:a.key>b.key?1:0)||(a.id<b.id?-1:a.id>b.id?1:0));return out;
  }
  function manualEngagement(u,p,status){
    const d=status||mission(u);if(!active(d)||d.source!=='manual')return null;
    const c=u.observation?.contacts?.[d.target],pose=c?.pose||d.pose;if(!pose||c?.wreckConfirmed||Math.hypot(pose.x-u.x,pose.y-u.y)>effectiveRange(u,p))return null;
    return{id:d.target,key:d.key||c?.key||null,contact:c||null,pose,manual:true,status:d.status};
  }
  function shouldHalt(s,p){return s.policy==='halt'||s.policy==='auto'&&(!p.fireControl.movement.fireOnMove||s.stopPreference==='halt');}
  function inspect(u){const s=state(u);return s?clone(s):null;}
  function aggregate(units){
    const out={active:0,...Object.fromEntries(counterKeys.map(k=>[k,0])),behaviors:{}};
    for(const u of units){const s=state(u);if(!s)continue;if(s.enabled)out.active++;for(const k of counterKeys)out[k]+=s.counters[k];out.behaviors[s.behavior]=(out.behaviors[s.behavior]||0)+1;}return out;
  }
  function create({profileOf,move,stop,suppressAuto,selectTarget=()=>true,clearTarget=()=>false,targetStatus=u=>mission(u),onDisable=()=>{},onEvent=null,settings={}}){
    const config=Object.freeze({...DEFAULTS,...settings});
    if(!Number.isFinite(config.targetMinHold)||config.targetMinHold<0||!Number.isFinite(config.switchMargin)||config.switchMargin<0||!Number.isInteger(config.switchConfirmations)||config.switchConfirmations<1||!Number.isFinite(config.blockedRetry)||config.blockedRetry<0)throw Error('AI 교전 판단 설정 오류');
    function emit(u,s,type,now,extra={}){onEvent?.({time:now,unit:u.id,mission:s.mission.id,revision:s.mission.revision,type,behavior:s.behavior,...extra});}
    function progress(u,s,now){
      s.counters.waypoints++;s.mission.index++;
      if(s.mission.index>=s.mission.waypoints.length){if(s.mission.loop)s.mission.index=0;else{s.mission.status='completed';s.behavior='completed';s.resumeStatus=null;emit(u,s,'mission-completed',now);return false;}}
      emit(u,s,'waypoint-advanced',now,{index:s.mission.index});return true;
    }
    const validWaypoint=s=>Number.isInteger(s.mission.index)&&s.mission.index>=0&&s.mission.index<s.mission.waypoints.length;
    function suspendMission(s){
      if(s.mission.status==='paused'){
        if(['active','blocked'].includes(s.resumeStatus)&&validWaypoint(s))return true;
        s.resumeStatus=null;return false;
      }
      if(!['active','blocked'].includes(s.mission.status)||!validWaypoint(s)){s.resumeStatus=null;return false;}
      s.resumeStatus=s.mission.status;s.mission.status='paused';return true;
    }
    function finishEngagement(u,s,now,type='mission-resume'){
      const resume=s.mission.status==='paused'&&['active','blocked'].includes(s.resumeStatus)&&validWaypoint(s),status=s.resumeStatus;
      s.resumeStatus=null;
      if(resume){s.mission.status=status;s.behavior='resume';s.counters.resumes++;emit(u,s,type,now);return true;}
      if(s.mission.status==='paused')s.mission.status='completed';
      s.behavior=s.mission.status==='completed'?'completed':'mission';return false;
    }
    function requestRoute(u,s,now,units,budget){
      if(!s.enabled||s.mission.status==='paused'||s.mission.status==='completed'||u.goal||u.path?.length){s.counters.duplicateCommandsAvoided++;return budget;}
      const p=profileOf(u),point=s.mission.waypoints[s.mission.index];
      if(Math.hypot(point.x-u.x,point.y-u.y)<=p.mobility.powertrain.arrivalRadius+1){if(!progress(u,s,now))return budget;}
      if(now+1e-9<s.retryAt||budget<=0)return budget;
      const goal=s.mission.waypoints[s.mission.index];s.counters.pathRequests++;const result=move(u,goal,goal.reverse,units);
      if(result.ok){s.mission.status='active';s.retryAt=now;emit(u,s,'path-issued',now,{index:s.mission.index,visits:result.visits||0});return budget-1;}
      s.counters.pathFailures++;s.mission.status='blocked';s.retryAt=now+config.pathRetry;emit(u,s,'path-failed',now,{index:s.mission.index,reason:result.reason});return budget-1;
    }
    function commandAutomatic(u,s,next,now,reason){
      const previous=s.autoTargetId,changed=previous!==next.id;
      if(changed){s.autoTargetId=next.id;s.autoTargetKey=next.key;s.targetSelectedAt=now;s.challengerId=null;s.challengerCount=0;if(previous===null)s.counters.targetSelections++;else s.counters.targetSwitches++;emit(u,s,previous===null?'target-selected':'target-switched',now,{targetKey:next.key,previousTarget:previous,reason,score:next.score});}
      const actual=targetStatus(u);if(changed||!active(actual)||actual.target!==next.id||actual.source!=='ai'){
        const result=selectTarget(u,next.id,now);if(result!==false){s.counters.targetCommands++;emit(u,s,'target-commanded',now,{targetKey:next.key,reason});}
      }
      return next;
    }
    function dropAutomatic(u,s,now,reason){
      if(s.autoTargetId===null)return false;const previous=s.autoTargetId,key=s.autoTargetKey;s.autoTargetId=null;s.autoTargetKey=null;s.targetSelectedAt=-Infinity;s.challengerId=null;s.challengerCount=0;clearTarget(u,now,reason,previous);emit(u,s,'target-released',now,{targetKey:key,previousTarget:previous,reason});return true;
    }
    function chooseTarget(u,s,p,now){
      const actual=targetStatus(u),manual=manualEngagement(u,p,actual);if(manual){s.challengerId=null;s.challengerCount=0;return manual;}
      const candidates=automaticCandidates(u,s,p,now),current=candidates.find(v=>v.id===s.autoTargetId)||null;
      if(!current){if(!candidates.length)return null;return commandAutomatic(u,s,candidates[0],now,s.autoTargetId===null?'initial':'invalid-current');}
      const challenger=candidates.find(v=>v.id!==current.id);
      if(challenger&&now-s.targetSelectedAt+1e-9>=config.targetMinHold&&challenger.score>current.score+config.switchMargin){
        if(s.challengerId===challenger.id)s.challengerCount++;else{s.challengerId=challenger.id;s.challengerCount=1;}
        if(s.challengerCount>=config.switchConfirmations)return commandAutomatic(u,s,challenger,now,'sustained-advantage');
      }else{s.challengerId=null;s.challengerCount=0;}
      return commandAutomatic(u,s,current,now,'retain');
    }
    function advance(units,dt,now){
      let budget=config.pathBudget;
      for(const u of units){
        const s=state(u);if(!s?.enabled)continue;
        s.currentTime=now;
        if(u.combat?.status==='destroyed'){destroy(u);continue;}
        const p=profileOf(u),movement=p.fireControl.movement,ammo=(u.fireControl?.ammo??0)>0,halt=shouldHalt(s,p);
        if(Math.abs(u.drive?.velocity??u.speed??0)<=movement.stationarySpeedMps+1e-9)s.haltElapsed+=dt;else s.haltElapsed=0;
        if(s.autoTargetId&&u.observation?.contacts?.[s.autoTargetId]?.wreckConfirmed){dropAutomatic(u,s,now,'confirmed-wreck');s.lastContactKey=null;s.lostAt=null;setSuppressed(u,s,false,suppressAuto);if(halt&&(s.mission.status==='paused'||['observe','braking','engaging'].includes(s.behavior)))finishEngagement(u,s,now,'confirmed-wreck-resume');}
        const selected=s.autoTargetId?u.observation?.contacts?.[s.autoTargetId]:null,selectedCurrent=selected?.current&&selected.identified&&selected.enemyConfirmed&&!selected.wreckConfirmed&&selected.pose&&Math.hypot(selected.pose.x-u.x,selected.pose.y-u.y)<=effectiveRange(u,p);
        if(halt&&ammo&&(selectedCurrent||s.lastContactKey)&&s.behavior!=='engaging')setSuppressed(u,s,true,suppressAuto);
        if(now+1e-9<s.nextThinkAt)continue;
        do{s.nextThinkAt+=config.decisionPeriod;}while(s.nextThinkAt<=now+1e-9);
        s.counters.decisions++;
        let contact=ammo?chooseTarget(u,s,p,now):null;
        if(!ammo){dropAutomatic(u,s,now,'out-of-ammo');s.lastContactKey=null;s.lostAt=null;setSuppressed(u,s,false,suppressAuto);if(s.mission.status==='paused'||['observe','braking','engaging'].includes(s.behavior))finishEngagement(u,s,now,'out-of-ammo-resume');}
        else if(contact){
          s.lastContactKey=contact.key;s.lostAt=null;
          if(halt){
            if(!['braking','engaging'].includes(s.behavior)){suspendMission(s);s.behavior='braking';stop(u);s.counters.stops++;emit(u,s,'engagement-stop',now,{contactKey:contact.key});}
            if(s.haltElapsed+1e-9>=movement.stationaryHoldSeconds){s.behavior='engaging';setSuppressed(u,s,false,suppressAuto);}else setSuppressed(u,s,true,suppressAuto);
          }else setSuppressed(u,s,false,suppressAuto);
        }else if(s.lastContactKey){
          if(s.lostAt===null){s.lostAt=now;if(halt)s.behavior='observe';setSuppressed(u,s,halt,suppressAuto);emit(u,s,'contact-lost',now,{contactKey:s.lastContactKey});}
          if(now-s.lostAt+1e-9>=config.lossGrace+config.observationHold){dropAutomatic(u,s,now,'observation-timeout');s.lastContactKey=null;s.lostAt=null;setSuppressed(u,s,false,suppressAuto);if(halt)finishEngagement(u,s,now);}
        }else{
          if(halt&&(s.mission.status==='paused'||['observe','braking','engaging'].includes(s.behavior)))finishEngagement(u,s,now);
          setSuppressed(u,s,false,suppressAuto);
        }
        if(s.behavior==='resume')s.behavior='mission';
        if((s.behavior==='mission'||s.mission.status==='blocked')&&s.mission.status!=='completed')budget=requestRoute(u,s,now,units,budget);
      }
      return aggregate(units);
    }
    function assignRuntime(u,spec,now=0){
      const previous=state(u);if(previous?.autoSuppressed||u.fireControl?.autoSuppressed)suppressAuto(u,false);
      if(previous?.autoTargetId)clearTarget(u,now,'mission-reassigned',previous.autoTargetId);
      assign(u,spec,now,config.decisionPeriod);const s=state(u);Object.defineProperties(s,{currentTime:{value:now,writable:true,enumerable:false},onDisable:{value:onDisable,writable:true,enumerable:false}});
      const p=profileOf(u),hasTarget=manualEngagement(u,p,targetStatus(u))||automaticCandidates(u,s,p,now).length>0;if((u.fireControl?.ammo??0)>0&&hasTarget&&shouldHalt(s,p))setSuppressed(u,s,true,suppressAuto);return inspect(u);
    }
    function manualChanged(u,now){const s=state(u);if(!s?.enabled)return false;s.nextThinkAt=Math.min(s.nextThinkAt,now);s.challengerId=null;s.challengerCount=0;return true;}
    function fireBlocked(u,target,reason,now){
      const s=state(u);if(!s?.enabled||s.autoTargetId!==target||targetStatus(u)?.source==='manual')return false;
      const c=u.observation?.contacts?.[target];if(c?.pose)s.blockedCandidates[target]={until:now+config.blockedRetry,signature:geometrySignature(u,c),reason};
      s.counters.blockedTargets++;s.nextThinkAt=Math.min(s.nextThinkAt,now);s.autoTargetId=null;s.autoTargetKey=null;s.challengerId=null;s.challengerCount=0;emit(u,s,'target-blocked',now,{target,reason,retryAt:now+config.blockedRetry});return true;
    }
    return Object.freeze({assign:assignRuntime,advance,inspect,aggregate,manualChanged,fireBlocked,config});
  }
  return Object.freeze({create,assign,override,destroy,inspect,aggregate,automaticCandidates,effectiveRange,policies:POLICIES,defaults:DEFAULTS});
})();
if(typeof module!=='undefined')module.exports=TacticalAI;
