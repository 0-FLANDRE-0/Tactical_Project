'use strict';
/* Fictional RTS firing/flight states. All coefficients are game tuning; the
 * generated impact point is a post-result display artifact, never damage or
 * a claim about measured real weapon performance. */
const TacticalFireControl=(()=>{
  const G=typeof TacticalVehicleGeometry!=='undefined'?TacticalVehicleGeometry:require('./vehicle-geometry.js');
  const zones=['hullFront','hullSide','hullRear','turretFront','turretSide','turretRear','upper'];
  const GRAVITY=9.81,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),diff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  function random(text,seed){let n=(2166136261^seed^0x51f15e)>>>0;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);n^=n>>>16;n=Math.imul(n,0x7feb352d);return((n^(n>>>15))>>>0)/4294967296;}
  const active=s=>['designated','waiting','acquiring','acquired'].includes(s?.status);
  function mission(u){const o=u.observation;return active(o?.designation)?o.designation:active(o?.tracking)?o.tracking:null;}
  function init(u,p,mode='auto'){
    if(!u.fireControl)u.fireControl={status:'no-target',reason:'no-target',targetKey:null,aimProgress:0,aimElapsed:0,layTime:0,ammo:p.fireControl.testRounds,
      shotCount:0,nextShotAt:0,pending:null,lastShot:null,hitChance:null,zoneProbabilities:null,previousSample:null,targetMotion:0,targetVelocity:{x:0,y:0},breakdown:null,fireMode:mode,lineProbeTarget:null,lineProbePose:null,lineProbeBlocked:false,lineProbeCandidateRevision:null,lineProbeQueries:0};
    u.fireControl.fireMode??=mode;u.fireControl.lineProbeTarget??=null;u.fireControl.lineProbePose??=null;u.fireControl.lineProbeBlocked??=false;u.fireControl.lineProbeCandidateRevision??=null;u.fireControl.lineProbeQueries??=0;return u.fireControl;
  }
  // Fictional RTS error budget. Target manoeuvre is represented only by the
  // difference between predicted and actual pose at impact, never twice here.
  function normalCdf(x){
    if(x===0)return .5;
    const v=Math.abs(x)/Math.SQRT2,t=1/(1+.3275911*v);
    const erf=1-(((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t)*Math.exp(-v*v);
    return clamp(.5*(1+(x<0?-erf:erf)),0,1);
  }
  function errorBudget(observer,pose,f,targetVelocity={x:0,y:0},layTime=0){
    const dx=pose.x-observer.x,dy=pose.y-observer.y,range=Math.hypot(dx,dy),safeRange=Math.max(1e-9,range),beta=Math.atan2(dy,dx);
    const vx=targetVelocity.x||0,vy=targetVelocity.y||0,cross=Math.abs(-Math.sin(beta)*vx+Math.cos(beta)*vy),tof=range/(f.muzzleVelocity*f.velocityRetention);
    const disp=f.dispersionMrad,lay=f.layMinMrad+(f.layStartMrad-f.layMinMrad)*Math.exp(-Math.max(0,layTime)/f.layTauSeconds);
    const rng=1000*GRAVITY*f.rangeErrorM/(2*f.muzzleVelocity**2),lead=1000*f.leadResidual*cross*tof/safeRange,own=f.stabMradPerMps*Math.abs(observer.speed||0);
    return{range,tof,sigma:{disp,lay,rng,lead,own,x:Math.hypot(disp,lay,lead,own),z:Math.hypot(disp,lay,rng,own)}};
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
  function estimate(observer,pose,exposure,f,targetVelocity={x:0,y:0},layTime=0){
    const budget=errorBudget(observer,pose,f,targetVelocity,layTime),rects=presentedRects(observer,pose,exposure,f);
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
  function create({profileOf,freshSight,impactSight=null,impactEnvironment=null,isObserved=()=>true,onImpactResolved=null,onFireBlocked=null,seed=7,debug=false,onDecisionRoll=null}){
    const events=[],flights=[],records=[];let currentTime=0;
    const clone=v=>JSON.parse(JSON.stringify(v));
    const emit=e=>{events.push(e);if(events.length>200)events.shift();};
    function resetAim(s){s.aimElapsed=0;s.aimProgress=0;s.layTime=0;}
    function resetMotion(s){s.previousSample=null;s.targetMotion=0;s.targetVelocity={x:0,y:0};}
    function clearPreview(s){s.hitChance=null;s.zoneProbabilities=null;s.breakdown=null;}
    function preview(s,value){s.hitChance=value.hitChance;s.zoneProbabilities=value.zoneProbabilities;s.breakdown=value.breakdown;}
    function roll(shot,kind){onDecisionRoll?.(kind,shot.id);return random(shot.shooterId+':'+shot.number+':'+kind,seed);}
    function finishDue(units,now){
      flights.sort((a,b)=>a.impactAt-b.impactAt||(a.id<b.id?-1:a.id>b.id?1:0));
      while(flights.length&&flights[0].impactAt<=now+1e-9){
        const shot=flights.shift(),sight=impactSight?impactSight(shot):{...clone(shot.fireExposure),pose:{...shot.pose,x:shot.predicted.x,y:shot.predicted.y}},evaluation=impactEvaluation(shot,sight);
        const result=resolve(evaluation.finalHitChance,evaluation.probabilities,roll(shot,'hit'),roll(shot,'zone')),side=sideFor(shot.origin,evaluation.pose,result.zone),point=sampleImpactPlane(shot,evaluation,result,seed),impact=impactLocation(shot,evaluation,result,point,impactEnvironment);
        const observation=isObserved(shot.team,shot.targetKey),observed=!sight?.gone&&!!observation;
        // Damage consumes the private resolved result exactly here, before any
        // public redaction. It must not infer a hit from the display point.
        const combat=onImpactResolved?.({id:shot.id,time:now,team:shot.team,shooterId:shot.shooterId,targetId:shot.targetId,targetKey:shot.targetKey,ammoId:shot.ammoId,hit:result.hit,zone:result.zone,side,origin:clone(shot.origin),pose:clone(evaluation.pose),rangeM:Math.hypot(evaluation.pose.x-shot.origin.x,evaluation.pose.y-shot.origin.y),impact:clone(impact),observed,observation:observation?clone(observation):null})??null;
        const publicImpact=observed?clone(impact):result.hit?null:{...clone(impact),beyond:null};
        const publicResult={type:'impact',id:shot.id,time:now,impactAt:shot.impactAt,team:shot.team,shooterId:shot.shooterId,targetKey:shot.targetKey,
          result:observed?(result.hit?'hit':'miss'):'unobserved',zone:observed?result.zone:null,side:observed?side:null,
          finalHitChance:observed?evaluation.finalHitChance:null,hitChanceAtFire:shot.hitChanceAtFire,bias:observed?clone(evaluation.bias):null,
          impact:publicImpact,ammoRemaining:shot.ammoRemaining,combat:observed&&combat?clone(combat):null};
        emit(publicResult);shot.shooter.fireControl.lastShot=clone(publicResult);
        if(debug){records.push({id:shot.id,time:now,impactAt:shot.impactAt,shooterId:shot.shooterId,targetKey:shot.targetKey,result:result.hit?'hit':'miss',zone:result.zone,side,finalHitChance:evaluation.finalHitChance,bias:clone(evaluation.bias),impact:clone(impact),point:clone(point),combat:combat?clone(combat):null,reason:sight?.gone?'target-gone':!evaluation.rects.length?'occluded':null,origin:{...shot.origin},predicted:{...shot.predicted}});if(records.length>200)records.shift();}
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
      if(s.ammo<=0)return{reason:'out-of-ammo',d,c};
      if(now<s.nextShotAt)return{reason:'interval',d,c};
      return{reason:null,d,c};
    }
    function step(units,dt,now){
      currentTime=now;
      for(const u of units){
        const p=profileOf(u),f=p.fireControl,s=init(u,p),check=inspect(u,now),{d,c}=check;
        if(s.targetKey!==d?.key){s.targetKey=d?.key??null;s.lineProbeTarget=null;s.lineProbePose=null;s.lineProbeBlocked=false;s.lineProbeCandidateRevision=null;resetAim(s);resetMotion(s);if(s.pending?.key!==s.targetKey)s.pending=null;}
        if(s.previousSample&&now-s.previousSample.time>p.sensors.tuning.queryPeriod*5+1e-9)resetMotion(s);
        if(c?.sources.gunner.current&&c.pose&&s.previousSample?.time!==c.sources.gunner.lastSeen){
          const previous=s.previousSample;
          const elapsed=previous?c.sources.gunner.lastSeen-previous.time:0;
          s.targetVelocity=elapsed>0&&elapsed<=p.sensors.tuning.queryPeriod*5+1e-9?{x:(c.pose.x-previous.x)/elapsed,y:(c.pose.y-previous.y)/elapsed}:{x:0,y:0};
          s.targetMotion=Math.hypot(s.targetVelocity.x,s.targetVelocity.y);
          s.previousSample={x:c.pose.x,y:c.pose.y,time:c.sources.gunner.lastSeen};
        }
        if(check.reason){s.status=check.reason==='interval'?'interval':check.reason==='aligning'?'aligning':'blocked';if(check.reason==='no-target')s.status='no-target';s.reason=check.reason;resetAim(s);clearPreview(s);}
        else{
          s.layTime+=dt;s.aimElapsed=Math.min(f.aimSeconds,s.aimElapsed+dt);s.aimProgress=clamp(s.aimElapsed/f.aimSeconds,0,1);
          s.status=s.aimProgress>=1-1e-9?'ready':'aiming';s.reason=null;
          const ex=c.gunnerExposure||{samples:[]};preview(s,estimate(u,c.pose,ex,f,s.targetVelocity,s.layTime));
        }
        // Normal units default to auto. Both modes retain a blocked weapon-line
        // result until the geometry changes; a new commander candidate can use
        // that result for retargeting without running the same LOS again.
        const linePose=c?.pose?[u.x,u.y,u.heading,u.turret,c.pose.x,c.pose.y,c.pose.heading,c.pose.turret]:null;
        const changedLine=!linePose||!s.lineProbePose||linePose.some((v,i)=>v!==s.lineProbePose[i]);
        const candidateRevision=u.observation?.candidateRevision??0,candidatesChanged=s.lineProbeCandidateRevision!==candidateRevision;
        if(s.status==='ready'&&!s.pending&&s.fireMode==='auto'&&s.lineProbeBlocked&&s.lineProbeTarget===s.targetKey&&!changedLine){
          s.lineProbeCandidateRevision=candidateRevision;
          if(candidatesChanged&&onFireBlocked?.(u,d.target,'fire-line-blocked',now)){
            s.status='blocked';s.reason='retargeted';resetAim(s);clearPreview(s);continue;
          }
          s.status='blocked';s.reason='fire-line-blocked';clearPreview(s);continue;
        }
        // Auto creates the same queued request consumed below and never
        // overwrites a manual request already present for this step.
        if(s.status==='ready'&&!s.pending&&s.fireMode==='auto')s.pending={key:s.targetKey,source:'auto'};
        // Hold still probes the real line and participates in hunter-killer
        // switching, while never creating an automatic firing request.
        if(s.status==='ready'&&!s.pending&&s.fireMode==='hold'&&(s.lineProbeTarget!==s.targetKey||changedLine||candidatesChanged)){
          if(s.lineProbeTarget!==s.targetKey||changedLine){s.lineProbeQueries++;const probe=freshSight(u,d.target);s.lineProbeBlocked=!probe?.visible&&probe?.reason==='fire-line-blocked';}
          s.lineProbeTarget=s.targetKey;s.lineProbePose=linePose;s.lineProbeCandidateRevision=candidateRevision;
          if(s.lineProbeBlocked&&onFireBlocked?.(u,d.target,'fire-line-blocked',now)){
            s.status='blocked';s.reason='retargeted';resetAim(s);clearPreview(s);continue;
          }
        }
        if(!s.pending)continue;
        const request=s.pending;s.pending=null;
        if(s.status!=='ready'||request.key!==s.targetKey){s.lastRejection=check.reason||'target-changed';continue;}
        // A fire command must recheck its own current range/FOV/terrain samples;
        // an old 10Hz contact or team knowledge cannot authorize a shot.
        s.lineProbeQueries++;const sight=freshSight(u,d.target);
        if(!sight?.visible){
          const blocked=sight?.reason||'fresh-sight-failed',switched=blocked==='fire-line-blocked'&&onFireBlocked?.(u,d.target,blocked,now);
          if(blocked==='fire-line-blocked'){s.lineProbeTarget=s.targetKey;s.lineProbePose=linePose;s.lineProbeBlocked=true;s.lineProbeCandidateRevision=candidateRevision;}
          s.status='blocked';s.reason=switched?'retargeted':blocked;resetAim(s);s.lastRejection=s.reason;clearPreview(s);continue;
        }
        s.lineProbeTarget=s.targetKey;s.lineProbePose=linePose;s.lineProbeBlocked=false;s.lineProbeCandidateRevision=candidateRevision;
        const pose=sight.pose,range=Math.hypot(pose.x-u.x,pose.y-u.y);
        if(range>f.maxRange||Math.abs(diff(Math.atan2(pose.y-u.y,pose.x-u.x),u.turret))>f.alignmentTolerance){s.status='aligning';s.reason='fresh-alignment-failed';resetAim(s);clearPreview(s);continue;}
        const chance=estimate(u,pose,sight,f,s.targetVelocity,s.layTime),number=s.shotCount+1;
        if(!(chance.hitChance>0)){s.status='blocked';s.reason='no-presented-target';resetAim(s);clearPreview(s);continue;}
        const origin=G.muzzleWorld(u,p.model),tof=chance.breakdown.tof,predicted={x:pose.x+s.targetVelocity.x*tof,y:pose.y+s.targetVelocity.y*tof},beta=Math.atan2(predicted.y-origin.y,predicted.x-origin.x),id=u.id+'-shot-'+number,impactAt=now+tof;
        const shot={id,number,time:now,impactAt,team:u.team,shooterId:u.id,targetKey:s.targetKey,targetId:d.target,ammoId:p.weapons.mainGun.ammunitionId??null,shooter:u,
          origin,fireEye:sight.fireEye,profileAtFire:clone(p),fireControl:clone(f),pose:clone(pose),fireExposure:clone(sight),
          beta,rangeAtFire:chance.breakdown.range,predicted,aim:clone(chance.breakdown.aim),sigma:clone(chance.breakdown.sigma),hitChanceAtFire:chance.hitChance,ammoRemaining:s.ammo-1};
        flights.push(shot);
        emit({type:'fired',id,time:now,team:u.team,shooterId:u.id,targetKey:s.targetKey,source:request.source,origin:{...origin},muzzleHeading:beta,
          tof,impactAt,hitChanceAtFire:chance.hitChance,ammoRemaining:s.ammo-1});
        s.shotCount=number;s.ammo--;s.nextShotAt=now+f.shotIntervalSeconds;resetAim(s);clearPreview(s);s.status='interval';s.reason='interval';
      }
      finishDue(units,now);
    }
    function request(u,key,now){
      const s=init(u,profileOf(u)),check=inspect(u,now);
      if(s.pending)return{ok:false,reason:'pending'};
      if(s.hitChance===0)return{ok:false,reason:'no-presented-target'};
      if(check.reason||s.status!=='ready'||key!==s.targetKey)return{ok:false,reason:check.reason||'not-ready'};
      s.pending={key,source:'manual'};return{ok:true};
    }
    function setMode(u,mode){
      if(!['auto','hold'].includes(mode))return false;
      const s=init(u,profileOf(u));s.fireMode=mode;
      if(mode==='hold'&&s.pending?.source==='auto')s.pending=null;
      return true;
    }
    function view(u,key=null){
      const s=init(u,profileOf(u)),same=!key||key===s.targetKey;
      return{status:s.status,reason:s.reason,targetKey:s.targetKey,aimProgress:s.aimProgress,layTime:s.layTime,targetVelocity:{...s.targetVelocity},ammo:s.ammo,mode:s.fireMode,pending:!!s.pending,pendingSource:s.pending?.source??null,
        canFire:same&&s.status==='ready'&&!s.pending&&s.hitChance>0,hitChance:same?s.hitChance:null,zoneProbabilities:same&&s.zoneProbabilities?{...s.zoneProbabilities}:null,
        inFlight:flights.filter(v=>v.shooter===u).map(v=>({id:v.id,impactAt:v.impactAt,remaining:Math.max(0,v.impactAt-currentTime)})),breakdown:same&&s.breakdown?JSON.parse(JSON.stringify(s.breakdown)):null,shotCount:s.shotCount,lastShot:s.lastShot?JSON.parse(JSON.stringify(s.lastShot)):null};
    }
    function cancel(u){const s=init(u,profileOf(u));s.pending=null;resetAim(s);s.status='blocked';s.reason='cancelled';clearPreview(s);}
    const publicEvents=(team,since=-Infinity)=>events.filter(e=>e.team===team&&e.time>=since).map(e=>JSON.parse(JSON.stringify(e)));
    return{step,request,setMode,view,cancel,events:publicEvents,debugRecords:()=>debug?clone(records):[]};
  }
  return Object.freeze({create,init,normalCdf,errorBudget,presentedRects,rectProbability,estimate,distribution,sideFor,resolve,impactEvaluation,sampleImpactPlane,pathHeight,marchImpact,impactLocation,zones:Object.freeze(zones)});
})();
if(typeof module!=='undefined')module.exports=TacticalFireControl;
