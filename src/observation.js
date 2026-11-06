'use strict';
/* Fictional RTS rules, not real sensor performance or fire control. Simulation
 * owns evidence/orders/individual knowledge; rendering receives detached views. */
const TacticalObservation=(()=>{
  const TAU=Math.PI*2,diff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function hash(text,seed=0){let n=(2166136261^seed)>>>0;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619);n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;return(n>>>0)/4294967296;}
  const order=()=>({mode:'auto',point:null,interest:null,interestUntil:0,expiresAt:null,focus:null,focusSince:0,cooldowns:{}});
  const copyPose=p=>({...p,model:{...p.model}});
  const active=d=>['designated','waiting','acquiring','acquired'].includes(d.status);
  function init(u){if(!u.observation){u.commander=u.turret;u.observation={commander:order(),gunner:order(),contacts:{},designation:{status:'idle'},lastQuery:null};}return u.observation;}
  function cancel(u,time=0,reason='manual'){
    const s=init(u),d=s.designation;if(d.target)for(const ch of ['commander','gunner'])s[ch].cooldowns[d.target]=time+12;
    s.designation={status:'cancelled',reason,endedAt:time};
  }
  function guard(u,ch,point,duration=0,time=0){
    if(!['commander','gunner'].includes(ch)||!point||![point.x,point.y,duration,time].every(Number.isFinite)||duration<0)return false;
    Object.assign(init(u)[ch],{mode:'guard',point:{x:point.x,y:point.y},interest:{x:point.x,y:point.y},interestUntil:Number.MAX_VALUE,expiresAt:duration?time+duration:null,focus:null});
    if(ch==='gunner')cancel(u,time,'guard');return true;
  }
  function resume(u,ch,time=0){if(!['commander','gunner'].includes(ch))return false;Object.assign(init(u)[ch],{mode:'auto',point:null,interestUntil:time+8,expiresAt:null,focus:null});if(ch==='gunner')cancel(u,time);return true;}
  function create({profileOf,exposure,seed=7}){
    let tick=0,time=0,teams=new Map();const stats={queries:0,candidates:0,samples:0,rayQueries:0,rayCacheHits:0},geometryCaches=new WeakMap();
    function record(u,id){
      const s=init(u),t=profileOf(u).sensors.tuning;
      if(!s.contacts[id]){const random=label=>hash(u.id+':'+id+':'+label,seed);s.contacts[id]={key:'접촉-'+Math.floor(hash(id,seed)*4294967296).toString(36),detected:false,identified:false,current:false,evidence:0,identityEvidence:0,
        detectAt:t.detectThreshold[0]+random('detect')*(t.detectThreshold[1]-t.detectThreshold[0]),identifyAt:t.identifyThreshold[0]+random('identify')*(t.identifyThreshold[1]-t.identifyThreshold[0]),lastSeen:-Infinity,knowledgeAt:-Infinity,pose:null,known:null,channels:[],gunnerSince:null};}
      return s.contacts[id];
    }
    function designate(u,id,source='manual',shared=null){
      const s=init(u),c=shared||s.contacts[id];if(!c?.detected||!c.pose||time-c.lastSeen>profileOf(u).sensors.tuning.memorySeconds)return false;
      const local=record(u,id);
      if(shared)Object.assign(local,{detected:true,identified:c.identified,pose:copyPose(c.pose),known:c.known?{...c.known}:null,lastSeen:c.lastSeen,knowledgeAt:c.knowledgeAt});
      if(source==='manual')Object.assign(s.gunner,{mode:'auto',point:null,expiresAt:null,focus:null});
      local.gunnerSince=null;s.designation={status:'designated',target:id,key:local.key,source,startedAt:time,expiresAt:time+profileOf(u).sensors.tuning.designationSeconds,reason:'slewing'};return true;
    }
    function focus(u,ch,now){
      const s=init(u),o=s[ch],t=profileOf(u).sensors.tuning;
      const usable=id=>{const c=s.contacts[id];return c?.detected&&c.pose&&now-c.lastSeen<=t.lossGrace&&(o.cooldowns[id]??0)<=now;};
      if(o.focus&&usable(o.focus)&&now-o.focusSince<t.focusLimit)return s.contacts[o.focus].pose;
      if(o.focus&&now-o.focusSince<t.focusSeconds)return s.contacts[o.focus]?.pose;
      if(o.focus)o.cooldowns[o.focus]=now+t.revisitSeconds;o.focus=null;
      // Control reads only observed snapshots, never hidden unit positions.
      const entries=Object.entries(s.contacts).filter(([id])=>usable(id)&&!(ch==='commander'&&active(s.designation)&&s.designation.target===id));
      entries.sort((a,b)=>Number(a[1].identified)-Number(b[1].identified)||b[1].lastSeen-a[1].lastSeen||a[0].localeCompare(b[0]));
      if(entries.length){o.focus=entries[0][0];o.focusSince=now;return entries[0][1].pose;}return null;
    }
    function control(u,dt,now){
      const s=init(u),p=profileOf(u),sensors=p.sensors;
      for(const ch of ['commander','gunner']){
        const o=s[ch],eq=sensors[ch];if(o.mode==='guard'&&o.expiresAt!==null&&now>=o.expiresAt)Object.assign(o,{mode:'auto',point:null,interestUntil:now+8,expiresAt:null,focus:null});
        if(!eq.enabled||(ch==='commander'&&!eq.independent))continue;
        let point=o.mode==='guard'?o.point:null;
        if(!point&&ch==='gunner'&&active(s.designation))point=s.contacts[s.designation.target]?.pose;
        if(!point)point=focus(u,ch,now);
        const phase=hash(u.id+':'+ch,seed)*TAU;
        const centre=o.interest&&now<o.interestUntil?Math.atan2(o.interest.y-u.y,o.interest.x-u.x):u.heading;
        const aim=point?Math.atan2(point.y-u.y,point.x-u.x):centre+(ch==='commander'?now*.24+phase:Math.sin(now*.24+phase)*.55);
        const field=ch==='gunner'?'turret':'commander',rate=ch==='gunner'?Math.min(p.mobility.turretRate,eq.rate):eq.rate;
        u[field]+=clamp(diff(aim,u[field]),-rate*dt,rate*dt);
      }
      if(!sensors.commander.enabled||!sensors.commander.independent)u.commander=u.turret;
    }
    function quality(u,ch,v){
      const e=profileOf(u).sensors[ch],d=Math.hypot(v.x-u.x,v.y-u.y);if(!e.enabled||d>e.range)return 0;
      const a=ch==='ambient'?0:Math.abs(diff(Math.atan2(v.y-u.y,v.x-u.x),ch==='gunner'?u.turret:u.commander));if(a>e.fov/2)return 0;
      const centre=ch==='ambient'?1:.2+.8*Math.cos(a/(e.fov/2)*Math.PI/2)**2;
      return centre*(1-.6*(d/e.range)**2)*Math.exp(-1.5*(v.forestDepth||0));
    }
    function query(u,candidates,now,elapsed){
      const s=init(u),p=profileOf(u),t=p.sensors.tuning,seen=new Set();stats.queries++;
      for(const target of candidates){
        if(target.team===u.team||target===u)continue;
        const tp=profileOf(target),pad=Math.hypot(tp.model.hullLength/2,tp.model.width/2),distance=Math.hypot(target.x-u.x,target.y-u.y);
        const channels=['ambient','commander','gunner'].filter(ch=>{
          const e=p.sensors[ch];if(!e.enabled||distance>e.range+pad)return false;if(ch==='ambient'||distance<=pad)return true;
          return Math.abs(diff(Math.atan2(target.y-u.y,target.x-u.x),ch==='gunner'?u.turret:u.commander))<=e.fov/2+Math.asin(Math.min(1,pad/distance));
        });if(!channels.length)continue;stats.candidates++;
        // Geometry reused between equal-height channels within this query only.
        const geometry=new Map(),result={};
        for(const ch of channels){const h=p.sensors[ch].eyeHeight;if(!geometry.has(h)){
            let targets=geometryCaches.get(u);if(!targets){targets=new WeakMap();geometryCaches.set(u,targets);}
            let heights=targets.get(target);if(!heights){heights=new Map();targets.set(target,heights);}
            let cache=heights.get(h);if(!cache){cache={samples:[]};heights.set(h,cache);}cache.time=now;cache.maxAge=t.geometryMaxAge;
            const result=exposure(u,target,h,cache);geometry.set(h,result);stats.samples++;stats.rayQueries+=result.rayQueries??9;stats.rayCacheHits+=result.rayCacheHits??0;
          }
          const ex=geometry.get(h),samples=ex.samples||[{x:target.x,y:target.y,visible:ex.visible,forestDepth:ex.forestDepth||0,part:'hull'}];let q=0,hull=0,turret=0;
          for(const v of samples)if(v.visible){const value=quality(u,ch,v);q+=value;if(value>0){if(v.part==='turret')turret++;else hull++;}}
          result[ch]={quality:q/samples.length,hull:hull/6,turret:turret/3};
        }
        const detect=Math.max(0,...Object.values(result).map(v=>v.quality)),identify=Math.max(result.commander?.quality||0,result.gunner?.quality||0);if(detect<=0)continue;
        const c=record(u,target.id);seen.add(target.id);const credit=Math.min(elapsed,t.queryPeriod);
        c.evidence+=detect*credit;c.identityEvidence+=identify*credit;
        if(c.evidence>=c.detectAt)c.detected=true;if(c.detected&&c.identityEvidence>=c.identifyAt)c.identified=true;c.current=c.detected;
        if(c.detected){c.lastSeen=now;c.pose={x:target.x,y:target.y,heading:target.heading,turret:target.turret,commander:target.commander??target.turret,model:{hullLength:tp.model.hullLength,width:tp.model.width,barrelTip:tp.model.barrelTip,turretCenter:tp.model.turretCenter}};
          c.channels=Object.keys(result).filter(ch=>result[ch].quality>0);const best=Object.values(result).sort((a,b)=>b.quality-a.quality)[0];c.exposure={hull:best.hull,turret:best.turret};
          if(c.identified){c.known={name:target.name,type:tp.name};c.knowledgeAt=now;}}
        if(result.gunner?.quality>0&&c.detected){if(c.gunnerSince===null)c.gunnerSince=now;c.gunnerLastSeen=now;}else c.gunnerSince=null;
      }
      for(const [id,c]of Object.entries(s.contacts)){
        if(!seen.has(id)){c.current=false;c.channels=[];c.gunnerSince=null;const decay=Math.pow(.5,Math.min(elapsed,t.queryPeriod)/t.evidenceHalfLife);c.evidence*=decay;c.identityEvidence*=decay;}
        if(now-c.lastSeen>t.memorySeconds){c.detected=false;c.current=false;c.pose=null;}
        if(now-c.knowledgeAt>t.knowledgeSeconds){c.identified=false;c.known=null;}
        if(!c.detected&&!c.identified&&c.evidence<.001&&c.identityEvidence<.001)delete s.contacts[id];
      }s.lastQuery=now;
    }
    function handoff(u,now){
      const s=init(u),sensors=profileOf(u).sensors,t=sensors.tuning,d=s.designation;
      if(active(d)){
        const c=s.contacts[d.target];if((d.status!=='acquired'&&now>=d.expiresAt)||!c?.pose||now-c.lastSeen>t.designationStale){const id=d.target;s.designation={status:'expired',reason:d.status!=='acquired'&&now>=d.expiresAt?'timeout':'stale',endedAt:now};s.commander.cooldowns[id]=now+t.revisitSeconds;s.gunner.cooldowns[id]=now+t.revisitSeconds;s.commander.focus=null;s.gunner.focus=null;return;}
        if(c.current&&c.channels.includes('gunner')&&c.gunnerSince!==null&&now-c.gunnerSince>=t.acquireSeconds){d.status='acquired';d.reason='gunner';d.acquiredAt??=now;d.expiresAt=null;s.commander.cooldowns[d.target]=now+t.revisitSeconds;if(s.commander.focus===d.target)s.commander.focus=null;}
        else{if(d.status==='acquired'&&c.gunnerLastSeen!==undefined&&now-c.gunnerLastSeen<=t.lossGrace)return;if(d.status==='acquired')d.expiresAt=now+t.designationSeconds;d.status=c.gunnerSince===null?'waiting':'acquiring';const distance=Math.hypot(c.pose.x-u.x,c.pose.y-u.y);d.reason=distance>sensors.gunner.range?'range':Math.abs(diff(Math.atan2(c.pose.y-u.y,c.pose.x-u.x),u.turret))>sensors.gunner.fov/2?'slewing':'occluded';}
        // Once secured, an automatic handoff may accept a different identified
        // contact after a minimum dwell. Explicit player designation persists.
        if(d.status==='acquired'&&d.source==='commander'&&now-d.acquiredAt>=t.focusSeconds&&sensors.hunterKiller&&s.gunner.mode!=='guard'){
          const next=Object.entries(s.contacts).find(([id,v])=>id!==d.target&&v.current&&v.identified&&v.channels.includes('commander')&&(s.commander.cooldowns[id]??0)<=now);
          if(next)designate(u,next[0],'commander');
        }
        return;
      }
      if(!sensors.hunterKiller||!sensors.commander.enabled||s.gunner.mode==='guard')return;
      const found=Object.entries(s.contacts).find(([id,c])=>c.current&&c.identified&&c.channels.includes('commander')&&(s.commander.cooldowns[id]??0)<=now);if(found)designate(u,found[0],'commander');
    }
    function buildTeam(units){
      const merged=new Map();for(const u of units){const map=merged.get(u.team)||new Map();merged.set(u.team,map);
        for(const[id,c]of Object.entries(init(u).contacts)){if(!c.detected||!c.pose)continue;const old=map.get(id);if(!old){map.set(id,{...c,pose:copyPose(c.pose)});continue;}
          const knowledge=old.identified&&old.known?{identified:true,known:old.known,knowledgeAt:old.knowledgeAt}:{},current=old.current||c.current;
          if(c.lastSeen>old.lastSeen)Object.assign(old,{...c,pose:copyPose(c.pose)});
          if(c.identified&&c.known)Object.assign(old,{identified:true,known:{...c.known},knowledgeAt:c.knowledgeAt});else Object.assign(old,knowledge);old.current=current;
        }
      }teams=merged;
    }
    function advance(units,dt,now){
      time=now;tick++;for(const u of units)control(u,dt,now);
      const buckets=new Map(),size=500;for(const u of units){const k=Math.floor(u.x/size)+','+Math.floor(u.y/size);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(u);}
      for(const[index,u]of units.entries()){const s=init(u),p=profileOf(u).sensors,period=p.tuning.queryPeriod,stride=Math.max(1,Math.round(period/dt));if(tick%stride!==index%stride)continue;
        const radius=Math.max(...['ambient','commander','gunner'].map(ch=>p[ch].enabled?p[ch].range:0))+10,candidates=[];
        for(let y=Math.floor((u.y-radius)/size);y<=Math.floor((u.y+radius)/size);y++)for(let x=Math.floor((u.x-radius)/size);x<=Math.floor((u.x+radius)/size);x++){const group=buckets.get(x+','+y);if(group)candidates.push(...group);}
        query(u,candidates,now,s.lastQuery===null?0:now-s.lastQuery);
      }for(const u of units)handoff(u,now);buildTeam(units);
    }
    function contacts(team){return[...(teams.get(team)?.values()||[])].map(c=>{
      const v={key:c.key,...copyPose(c.pose),team:team==='blue'?'red':'blue',identified:c.identified,current:c.current,memory:!c.current,observedAt:c.lastSeen,age:Math.max(0,time-c.lastSeen),label:c.identified&&c.known?c.known.name:'미식별 표적'};
      if(c.identified&&c.known){v.name=c.known.name;v.type=c.known.type;if(c.current)v.exposure={...c.exposure};}return v;
    });}
    function direct(u,key){const match=[...(teams.get(u.team)?.entries()||[])].find(([,c])=>c.key===key);return!!match&&designate(u,match[0],'manual',match[1]);}
    return{advance,contacts,direct,stats};
  }
  function view(u,ch='commander',time=0){const o=init(u)[ch];return{mode:o.mode==='guard'?'fixed':'idle',turret:u.turret,gaze:u.commander,direction:o.mode==='guard'?Math.atan2(o.point.y-u.y,o.point.x-u.x):null,remaining:o.expiresAt===null?null:Math.max(0,o.expiresAt-time),point:o.point?{...o.point}:null};}
  return Object.freeze({create,init,guard,resume,cancel,view,hash});
})();
if(typeof module!=='undefined')module.exports=TacticalObservation;
