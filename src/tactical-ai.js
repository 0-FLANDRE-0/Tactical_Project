'use strict';
/* Lightweight mission and engagement-movement policy. It reads only a unit's
 * own observation records and drivetrain state. Terrain paths remain owned by
 * sim-core and firing remains owned by fire-control. */
const TacticalAI=(()=>{
  const STATE=Symbol('tactical-ai-state');
  const POLICIES=Object.freeze(['maintain','halt','auto']);
  const DEFAULTS=Object.freeze({decisionPeriod:.75,lossGrace:1.5,observationHold:2.5,pathRetry:2,pathBudget:2,maxWaypoints:8});
  const clone=v=>JSON.parse(JSON.stringify(v));
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
  function assign(u,spec,now=0,decisionPeriod=DEFAULTS.decisionPeriod){
    validate(spec);const previous=state(u),revision=(previous?.mission.revision||0)+1;
    const value={enabled:true,mission:{id:String(spec.id||u.id+'-mission'),revision,type:spec.type,waypoints:spec.waypoints.map(p=>({x:p.x,y:p.y,reverse:!!p.reverse})),index:0,loop:spec.type==='patrol'&&spec.loop!==false,status:'active'},
      policy:spec.policy,stopPreference:spec.stopPreference||'maintain',behavior:'mission',nextThinkAt:now+phase(u.id,decisionPeriod),retryAt:now,lastContactKey:null,lostAt:null,haltElapsed:0,autoSuppressed:false,resumeStatus:null,
      counters:{decisions:0,pathRequests:0,pathFailures:0,stops:0,resumes:0,waypoints:0,duplicateCommandsAvoided:0}};
    Object.defineProperty(u,STATE,{value,writable:true,configurable:true,enumerable:false});return inspect(u);
  }
  function setSuppressed(u,s,value,callback){if(s.autoSuppressed===value)return;s.autoSuppressed=value;callback(u,value);}
  function override(u,reason='manual-command'){
    const s=state(u);if(!s)return false;s.enabled=false;s.mission.status='cancelled';s.behavior=reason;s.lastContactKey=null;s.lostAt=null;s.autoSuppressed=false;
    if(u.fireControl)u.fireControl.autoSuppressed=false;return true;
  }
  function destroy(u){const s=state(u);if(!s)return false;s.enabled=false;s.mission.status='destroyed';s.behavior='destroyed';s.lastContactKey=null;s.lostAt=null;s.autoSuppressed=false;if(u.fireControl)u.fireControl.autoSuppressed=false;return true;}
  function ownContact(u){
    let best=null;for(const c of Object.values(u.observation?.contacts||{}))if(c.current&&c.identified&&c.enemyConfirmed&&!c.wreckConfirmed){if(!best||c.lastSeen>best.lastSeen||c.lastSeen===best.lastSeen&&c.key<best.key)best=c;}return best;
  }
  function shouldHalt(s,p){return s.policy==='halt'||s.policy==='auto'&&(!p.fireControl.movement.fireOnMove||s.stopPreference==='halt');}
  function inspect(u){const s=state(u);return s?clone(s):null;}
  function aggregate(units){
    const out={active:0,decisions:0,pathRequests:0,pathFailures:0,stops:0,resumes:0,waypoints:0,duplicateCommandsAvoided:0,behaviors:{}};
    for(const u of units){const s=state(u);if(!s)continue;if(s.enabled)out.active++;for(const k of ['decisions','pathRequests','pathFailures','stops','resumes','waypoints','duplicateCommandsAvoided'])out[k]+=s.counters[k];out.behaviors[s.behavior]=(out.behaviors[s.behavior]||0)+1;}return out;
  }
  function create({profileOf,move,stop,suppressAuto,onEvent=null,settings={}}){
    const config=Object.freeze({...DEFAULTS,...settings});
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
    function advance(units,dt,now){
      let budget=config.pathBudget;
      for(const u of units){
        const s=state(u);if(!s?.enabled)continue;
        if(u.combat?.status==='destroyed'){destroy(u);continue;}
        const p=profileOf(u),movement=p.fireControl.movement,contact=ownContact(u),ammo=(u.fireControl?.ammo??0)>0,halt=shouldHalt(s,p);
        if(Math.abs(u.drive?.velocity??u.speed??0)<=movement.stationarySpeedMps+1e-9)s.haltElapsed+=dt;else s.haltElapsed=0;
        /* Suppress halt-policy auto fire immediately after a contact appears.
         * Route and behavior changes stay on the distributed low-rate clock. */
        if(halt&&ammo&&(contact||s.lastContactKey)&&s.behavior!=='engaging')setSuppressed(u,s,true,suppressAuto);
        if(now+1e-9<s.nextThinkAt)continue;
        do{s.nextThinkAt+=config.decisionPeriod;}while(s.nextThinkAt<=now+1e-9);
        s.counters.decisions++;
        if(contact&&ammo&&halt){
          s.lastContactKey=contact.key;s.lostAt=null;
          if(!['braking','engaging'].includes(s.behavior)){
            suspendMission(s);s.behavior='braking';stop(u);s.counters.stops++;emit(u,s,'engagement-stop',now,{contactKey:contact.key});
          }
          if(s.haltElapsed+1e-9>=movement.stationaryHoldSeconds){s.behavior='engaging';setSuppressed(u,s,false,suppressAuto);}else setSuppressed(u,s,true,suppressAuto);
        }else if(s.lastContactKey&&halt&&ammo){
          if(s.lostAt===null){s.lostAt=now;s.behavior='observe';setSuppressed(u,s,true,suppressAuto);emit(u,s,'contact-lost',now,{contactKey:s.lastContactKey});}
          if(now-s.lostAt+1e-9>=config.lossGrace+config.observationHold){s.lastContactKey=null;s.lostAt=null;setSuppressed(u,s,false,suppressAuto);finishEngagement(u,s,now);}
        }else{
          if(s.mission.status==='paused'||s.behavior==='observe'||s.behavior==='braking'||s.behavior==='engaging')finishEngagement(u,s,now,ammo?'mission-resume':'out-of-ammo-resume');
          s.lastContactKey=null;s.lostAt=null;setSuppressed(u,s,false,suppressAuto);
        }
        if(s.behavior==='resume')s.behavior='mission';
        if((s.behavior==='mission'||s.mission.status==='blocked')&&s.mission.status!=='completed')budget=requestRoute(u,s,now,units,budget);
      }
      return aggregate(units);
    }
    function assignRuntime(u,spec,now=0){
      const previous=state(u);if(previous?.autoSuppressed||u.fireControl?.autoSuppressed)suppressAuto(u,false);
      assign(u,spec,now,config.decisionPeriod);const s=state(u),p=profileOf(u),contact=ownContact(u),ammo=(u.fireControl?.ammo??0)>0;
      if(contact&&ammo&&shouldHalt(s,p))setSuppressed(u,s,true,suppressAuto);
      return inspect(u);
    }
    return Object.freeze({assign:assignRuntime,advance,inspect,aggregate,config});
  }
  return Object.freeze({create,assign,override,destroy,inspect,aggregate,policies:POLICIES,defaults:DEFAULTS});
})();
if(typeof module!=='undefined')module.exports=TacticalAI;
