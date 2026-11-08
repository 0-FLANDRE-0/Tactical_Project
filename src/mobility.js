'use strict';
/* Lightweight, deterministic longitudinal drivetrain for the 0.05 s tactical
 * simulation tick. It models direction interlock, automatic ranges, finite
 * drive/brake force and speed-aware steering. Terrain/path/collision remain in
 * sim-core; this module performs no world queries and allocates nothing per tick. */
const TacticalMobility=(()=>{
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const sign=v=>v>0?1:v<0?-1:0;
  function create(){return{velocity:0,requestedDirection:0,selectedDirection:0,pendingDirection:0,
    mode:'hold',gear:0,fromGear:0,shiftRemaining:0,shiftCooldown:0,gearHold:0,directionWait:0,
    shiftCount:0,lastAcceleration:0,driveForceN:0};}
  function reset(state=create()){Object.assign(state,create());return state;}
  function gearTable(profile,direction){return direction<0?profile.mobility.powertrain.reverseRatios:profile.mobility.powertrain.forwardRatios;}
  function speedTable(profile,direction,kind){const p=profile.mobility.powertrain,prefix=direction<0?'reverse':'forward';return p[prefix+(kind==='up'?'UpshiftMps':'DownshiftMps')];}
  function selectGearForSpeed(profile,direction,speed){
    const up=speedTable(profile,direction,'up');let gear=1;
    while(gear<=up.length&&speed>=up[gear-1])gear++;
    return Math.min(gear,gearTable(profile,direction).length);
  }
  function beginRange(state,direction,profile,speed){
    state.selectedDirection=direction;state.pendingDirection=0;state.directionWait=0;
    state.gear=selectGearForSpeed(profile,direction,speed);state.fromGear=0;
    state.shiftRemaining=profile.mobility.powertrain.rangeEngageSeconds;
    state.shiftCooldown=profile.mobility.powertrain.shiftDwellSeconds;state.gearHold=0;state.mode=direction<0?'reverse':'forward';
  }
  function startInterlock(state,direction){
    state.selectedDirection=0;state.pendingDirection=direction;state.directionWait=0;
    state.fromGear=state.gear;state.gear=0;state.shiftRemaining=0;state.mode='direction-brake';
  }
  function updateRange(state,request,profile,dt){
    const p=profile.mobility.powertrain,v=state.velocity,moving=sign(Math.abs(v)>p.directionStopSpeed?v:0);
    state.requestedDirection=request;state.shiftRemaining=Math.max(0,state.shiftRemaining-dt);
    state.shiftCooldown=Math.max(0,state.shiftCooldown-dt);state.gearHold+=dt;
    if(request===0){state.pendingDirection=0;state.directionWait=0;state.selectedDirection=0;state.gear=0;state.shiftRemaining=0;state.mode=Math.abs(v)>p.holdSpeed?'braking':'hold';return;}
    if(state.pendingDirection&&request!==state.pendingDirection){
      if(request===moving){beginRange(state,request,profile,Math.abs(v));return;}
      state.pendingDirection=request;state.directionWait=0;
    }
    if(moving&&moving!==request){if(state.pendingDirection!==request)startInterlock(state,request);return;}
    if(state.pendingDirection){
      state.mode='direction-wait';
      if(Math.abs(v)<=p.directionStopSpeed){state.directionWait+=dt;if(state.directionWait+1e-9>=p.directionSettleSeconds)beginRange(state,state.pendingDirection,profile,0);}
      else state.directionWait=0;
      return;
    }
    if(state.selectedDirection!==request){
      if(state.selectedDirection&&state.selectedDirection!==request)startInterlock(state,request);
      else if(Math.abs(v)>p.directionStopSpeed)startInterlock(state,request);else beginRange(state,request,profile,Math.abs(v));
      return;
    }
    state.mode=request<0?'reverse':'forward';
  }
  function updateGear(state,profile,dt){
    const direction=state.selectedDirection;if(!direction||!state.gear||state.shiftRemaining>0)return;
    const p=profile.mobility.powertrain,ratios=gearTable(profile,direction),speed=Math.abs(state.velocity),up=speedTable(profile,direction,'up'),down=speedTable(profile,direction,'down');
    let next=state.gear;
    if(state.shiftCooldown<=0&&state.gearHold>=p.minimumGearHoldSeconds){
      if(state.gear<ratios.length&&speed>up[state.gear-1])next++;
      else if(state.gear>1&&speed<down[state.gear-2])next--;
    }
    if(next!==state.gear){state.fromGear=state.gear;state.gear=next;state.shiftRemaining=p.shiftSeconds;state.shiftCooldown=p.shiftDwellSeconds;state.gearHold=0;state.shiftCount++;}
  }
  function driveAcceleration(state,profile){
    const m=profile.mobility,p=m.powertrain,direction=state.selectedDirection,ratios=gearTable(profile,direction),ratio=ratios[Math.max(0,state.gear-1)]||ratios[0];
    const speed=Math.abs(state.velocity),power=profile.engineHp*745.6998715822702*p.efficiency;
    const engineScale=Math.pow(profile.engineHp/p.referenceEngineHp,p.launchPowerExponent);
    const gearFactor=Math.pow(ratio/ratios[0],p.gearForceExponent);
    const traction=p.launchAcceleration*engineScale*(p.referenceMassKg/profile.massKg)*gearFactor;
    const powerLimited=power/(profile.massKg*Math.max(speed,p.powerFloorSpeed));
    const connected=state.shiftRemaining>0?p.shiftDriveFraction:1;
    const acceleration=Math.max(0,Math.min(traction,powerLimited)*connected-p.rollingDeceleration);
    state.driveForceN=acceleration*profile.massKg;return acceleration;
  }
  function approachZero(v,amount){return v>0?Math.max(0,v-amount):v<0?Math.min(0,v+amount):0;}
  function step(state,input,profile,dt){
    const request=clamp(Math.trunc(input.direction||0),-1,1),target=Math.max(0,Number(input.targetSpeed)||0),before=state.velocity,p=profile.mobility.powertrain;
    updateRange(state,request,profile,dt);
    const mustBrake=!state.selectedDirection||state.pendingDirection||request===0||sign(state.velocity)&&sign(state.velocity)!==state.selectedDirection;
    if(mustBrake){state.velocity=approachZero(state.velocity,profile.mobility.brakeDeceleration*dt);state.driveForceN=0;}
    else{
      updateGear(state,profile,dt);
      const direction=state.selectedDirection,signedTarget=direction*target,speed=Math.abs(state.velocity);
      if(speed>target+p.targetSpeedTolerance)state.velocity=approachZero(state.velocity,profile.mobility.brakeDeceleration*dt);
      else if(target>p.holdSpeed&&speed<target-p.targetSpeedTolerance){
        const a=driveAcceleration(state,profile);state.velocity+=direction*Math.min(a*dt,Math.max(0,target-speed));
      }else{state.driveForceN=0;if(target<=p.holdSpeed)state.velocity=approachZero(state.velocity,profile.mobility.brakeDeceleration*dt);}
      if((direction>0&&state.velocity<0)||(direction<0&&state.velocity>0))state.velocity=0;
      if(Math.abs(state.velocity)>Math.abs(signedTarget)&&Math.abs(state.velocity)-Math.abs(signedTarget)<p.targetSpeedTolerance)state.velocity=signedTarget;
    }
    if(Math.abs(state.velocity)<p.zeroSpeedEpsilon)state.velocity=0;
    state.lastAcceleration=(state.velocity-before)/dt;
    return state;
  }
  function turnRate(speed,profile){const m=profile.mobility,p=m.powertrain,s=Math.abs(speed);return s<=p.pivotMaxSpeed?m.pivotRate:Math.min(m.pivotRate,p.lateralAcceleration/Math.max(s,.01));}
  function directionLabel(state){
    if(state.mode==='direction-brake')return state.pendingDirection<0?'감속 · 후진 대기':'감속 · 전진 대기';
    if(state.mode==='direction-wait')return state.pendingDirection<0?'정차 · 후진 연결':'정차 · 전진 연결';
    if(state.mode==='braking')return '감속';if(state.mode==='hold')return '대기';return state.selectedDirection<0?'후진 이동':'이동';
  }
  function gearLabel(state){if(state.pendingDirection)return 'N → '+(state.pendingDirection<0?'R':'D');if(!state.selectedDirection||!state.gear)return 'N';return(state.selectedDirection<0?'R':'D')+state.gear+(state.shiftRemaining>0?' 변속':'');}
  return{create,reset,step,turnRate,directionLabel,gearLabel,selectGearForSpeed};
})();
if(typeof module!=='undefined')module.exports=TacticalMobility;
