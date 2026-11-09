'use strict';
/* Metres / seconds / radians. Fixed, measured terrain; UI never owns world state.
 * Building selection and forest geometry are baked once into BATTLEFIELD_DATA.
 * Navigation and observation caches are derived from that same frozen map. */
const TacticalCore = (() => {
  if (typeof BATTLEFIELD_DATA === 'undefined') throw Error('전장 데이터가 없음');
  const MAP = BATTLEFIELD_DATA, M = MAP.meta;
  if (M.width !== 4000 || M.height !== 4000 || MAP.heightmap.spacing !== 2) throw Error('전장 규격 오류');
  const WORLD = {w:M.width,h:M.height,step:2,nav:16};
  const registry=VEHICLE_PROFILES.registry;
  const ACTIVE_PROFILE_ID=registry.has('M1A2_1998')?'M1A2_1998':'M1A2';
  const PROFILE=registry.get(ACTIVE_PROFILE_ID);
  const VEHICLE = Object.freeze({radius:PROFILE.navigation.radius,maxSlope:PROFILE.mobility.maxLongitudinalGrade,eye:PROFILE.sensors.eyeHeight,range:PROFILE.sensors.observationLimit,model:PROFILE.model});
  const profileOf=u=>{const p=registry.get(u?.profileId??ACTIVE_PROFILE_ID);return u?.profileOverride||p;};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  function hash(x,y,s=0) {
    let n=Math.imul(x+374761393,668265263)^Math.imul(y+1274126177,2246822519)^s;
    n=Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967296;
  }
  function bytesFromBase64(s) {
    if(typeof Buffer!=='undefined') return new Uint8Array(Buffer.from(s,'base64'));
    const str=atob(s), b=new Uint8Array(str.length);
    for(let i=0;i<str.length;i++) b[i]=str.charCodeAt(i);
    return b;
  }
  const H=MAP.heightmap, TH=MAP.terrain, hb=bytesFromBase64(H.data);
  const heights=new Float32Array(H.columns*H.rows), surface=bytesFromBase64(TH.data);
  let byteIndex=0;
  for(let row=0;row<H.rows;row++) {
    let value=0;
    for(let col=0;col<H.columns;col++) {
      let z=0,shift=0,b;
      do { if(byteIndex>=hb.length || shift>28) throw Error('고도 데이터 손상'); b=hb[byteIndex++]; z|=(b&127)<<shift; shift+=7; } while(b&128);
      value+=(z>>>1)^-(z&1);
      heights[row*H.columns+col]=value*H.scale;
    }
  }
  if(byteIndex!==hb.length || surface.length!==TH.columns*TH.rows) throw Error('전장 데이터 길이 오류');
  function heightAt(x,y) {
    const gx=clamp((x-H.sampleOrigin)/H.spacing,0,H.columns-1),gy=clamp((y-H.sampleOrigin)/H.spacing,0,H.rows-1);
    const i=Math.min(H.columns-2,Math.floor(gx)),j=Math.min(H.rows-2,Math.floor(gy)),a=gx-i,b=gy-j,k=j*H.columns+i;
    return mix(mix(heights[k],heights[k+1],a),mix(heights[k+H.columns],heights[k+H.columns+1],a),b);
  }
  function surfaceCode(x,y) {
    return surface[clamp(Math.floor(y/TH.spacing),0,TH.rows-1)*TH.columns+clamp(Math.floor(x/TH.spacing),0,TH.columns-1)];
  }
  const names=['grass','field','forest','settlement','scrub','water','stream','road','bridge','obstacle'];
  const surfaceAt=(x,y)=>names[surfaceCode(x,y)];
  const forestAt=(x,y)=>{const code=surfaceCode(x,y);return code===2?.9:code===4?.22:0;};
  const waterAt=(x,y)=>surfaceCode(x,y)===5;
  const bridgeAt=(x,y)=>surfaceCode(x,y)===8;
  function slopeAt(x,y) {
    return Math.hypot(heightAt(x+4,y)-heightAt(x-4,y),heightAt(x,y+4)-heightAt(x,y-4))/8;
  }
  function gradeAt(x,y,heading){
    const dx=(heightAt(x+4,y)-heightAt(x-4,y))/8,dy=(heightAt(x,y+4)-heightAt(x,y-4))/8,c=Math.cos(heading),s=Math.sin(heading);
    return {along:dx*c+dy*s,side:-dx*s+dy*c};
  }
  function gradePassable(along,side,p=PROFILE){return Math.abs(along)<=p.mobility.maxLongitudinalGrade&&Math.abs(side)<=p.mobility.maxSideGrade;}
  const {roads,forests,fields,water,waterways,trees,labels}=MAP.features;
  const buildings=MAP.features.buildings.map(b=>{
    const rings=b.geometry.coordinates, all=rings.flat();
    const minX=Math.min(...all.map(p=>p[0])),maxX=Math.max(...all.map(p=>p[0]));
    const minY=Math.min(...all.map(p=>p[1])),maxY=Math.max(...all.map(p=>p[1]));
    return {...b,rings,minX,maxX,minY,maxY,roof:heightAt((minX+maxX)/2,(minY+maxY)/2)+b.z};
  });
  const bucketSize=64,bucketCols=Math.ceil(WORLD.w/bucketSize),buildingBuckets=new Map();
  for(const b of buildings) {
    for(let y=Math.floor(b.minY/64);y<=Math.floor(b.maxY/64);y++) for(let x=Math.floor(b.minX/64);x<=Math.floor(b.maxX/64);x++) {
      const key=y*bucketCols+x;
      if(!buildingBuckets.has(key)) buildingBuckets.set(key,[]);
      buildingBuckets.get(key).push(b);
    }
  }
  function insideRing(x,y,r) {
    let inside=false;
    for(let i=0,j=r.length-1;i<r.length;j=i++) {
      const a=r[i],b=r[j];
      if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
    }
    return inside;
  }
  function insideBuilding(x,y,b) {
    if(!insideRing(x,y,b.rings[0])) return false;
    for(let i=1;i<b.rings.length;i++) if(insideRing(x,y,b.rings[i])) return false;
    return true;
  }
  function distanceSegment(x,y,a,b) {
    const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
    const t=den?clamp(((x-a[0])*dx+(y-a[1])*dy)/den,0,1):0;
    return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);
  }
  function buildingAt(x,y,pad=0) {
    const seen=new Set();
    for(let by=Math.floor((y-pad)/64);by<=Math.floor((y+pad)/64);by++) for(let bx=Math.floor((x-pad)/64);bx<=Math.floor((x+pad)/64);bx++) {
      if(bx<0||by<0||bx>=bucketCols||by>=bucketCols) continue;
      const candidates=buildingBuckets.get(by*bucketCols+bx);
      if(!candidates) continue;
      for(const b of candidates) {
        if(seen.has(b.id)) continue;
        seen.add(b.id);
        if(x<b.minX-pad||x>b.maxX+pad||y<b.minY-pad||y>b.maxY+pad) continue;
        if(insideBuilding(x,y,b)) return b;
        if(pad) for(const ring of b.rings) for(let i=1;i<ring.length;i++) if(distanceSegment(x,y,ring[i-1],ring[i])<pad) return b;
      }
    }
    return null;
  }
  const solidAt=buildingAt;
  function passable(x,y,units=[],ignore=null,heading=null) {
    const r=VEHICLE.radius;
    if(x<r+2||y<r+2||x>WORLD.w-r-2||y>WORLD.h-r-2) return false;
    if(slopeAt(x,y)>VEHICLE.maxSlope || buildingAt(x,y,r)) return false;
    if(heading!==null){const grade=gradeAt(x,y,heading);if(!gradePassable(grade.along,grade.side))return false;}
    for(const [dx,dy] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]]) if(waterAt(x+dx,y+dy)) return false;
    for(const u of units) if(u!==ignore&&Math.hypot(u.x-x,u.y-y)<r*2.1) return false;
    return true;
  }
  function segmentClear(a,b,units=[],ignore=null) {
    const d=Math.hypot(a.x-b.x,a.y-b.y),n=Math.max(1,Math.ceil(d/3));
    const heading=d>.001?Math.atan2(b.y-a.y,b.x-a.x):a.heading??null;
    for(let i=0;i<=n;i++) if(!passable(mix(a.x,b.x,i/n),mix(a.y,b.y,i/n),units,ignore,heading)) return false;
    return true;
  }
  function travelCost(x,y) {
    const code=surfaceCode(x,y);
    return ([1,1.12,2.15,1.05,1.35,Infinity,2.8,.58,.58,Infinity][code])*(1+slopeAt(x,y)*3);
  }
  const nav=WORLD.nav,cols=Math.ceil(WORLD.w/nav),rows=Math.ceil(WORLD.h/nav),navCost=new Float32Array(cols*rows),edges=new Uint8Array(cols*rows);
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  const opposite=[1,0,3,2,7,6,5,4];
  const cellPoint=id=>({x:(id%cols+.5)*nav,y:(Math.floor(id/cols)+.5)*nav});
  const navigationContract=PROFILE.navigation.contract;
  if(MAP.navigation) {
    const n=MAP.navigation;
    if(n.sourceHash!==M.mapHash || n.contract!==navigationContract || n.cols!==cols || n.rows!==rows) throw Error('길찾기 캐시 버전이 전장과 다름');
    const raw=bytesFromBase64(n.costs),view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
    if(raw.length!==navCost.length*4)throw Error('길찾기 캐시 길이 오류');
    for(let i=0;i<navCost.length;i++)navCost[i]=view.getFloat32(i*4,true);
    const rawEdges=bytesFromBase64(n.edges);
    if(rawEdges.length!==edges.length)throw Error('길찾기 연결 길이 오류');
    edges.set(rawEdges);
  } else {
  for(let id=0;id<navCost.length;id++) {const p=cellPoint(id);navCost[id]=passable(p.x,p.y)?travelCost(p.x,p.y):Infinity;}
  // Static edges are baked from fine collision queries, not centre-cell assumptions.
  for(let id=0;id<navCost.length;id++) {
    if(!Number.isFinite(navCost[id])) continue;
    const x=id%cols,y=Math.floor(id/cols),p=cellPoint(id);
    for(const di of [0,2,4,5]) {
      const [dx,dy]=dirs[di],xx=x+dx,yy=y+dy;
      if(xx<0||yy<0||xx>=cols||yy>=rows) continue;
      const ni=yy*cols+xx;
      if(!Number.isFinite(navCost[ni])) continue;
      if(dx&&dy&&(!Number.isFinite(navCost[y*cols+xx])||!Number.isFinite(navCost[yy*cols+x]))) continue;
      if(segmentClear(p,cellPoint(ni))) {edges[id]|=1<<di;edges[ni]|=1<<opposite[di];}
    }
  }
  }
  function bakeNavigation(){return {costs:navCost.slice(),edges:edges.slice(),cols,rows,contract:navigationContract};}
  class Heap {
    constructor(){this.a=[];}
    push(id,f){const a=this.a,v={id,f};let i=a.length;a.push(v);while(i){const p=(i-1)>>1;if(a[p].f<=f)break;a[i]=a[p];i=p;}a[i]=v;}
    pop(){const a=this.a,v=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c;}a[i]=last;}return v;}
    get length(){return this.a.length;}
  }
  function nearestCell(p,units,ignore) {
    const cx=Math.floor(p.x/nav),cy=Math.floor(p.y/nav);let best=-1,bd=Infinity;
    for(let y=cy-3;y<=cy+3;y++) for(let x=cx-3;x<=cx+3;x++) {
      if(x<0||y<0||x>=cols||y>=rows) continue;
      const id=y*cols+x,q=cellPoint(id),d=Math.hypot(q.x-p.x,q.y-p.y);
      if(d<bd&&Number.isFinite(navCost[id])&&segmentClear(p,q,units,ignore)) {best=id;bd=d;}
    }
    return best;
  }
  function segmentCost(a,b) {
    const d=Math.hypot(a.x-b.x,a.y-b.y),n=Math.max(1,Math.ceil(d/8));let cost=0;
    for(let i=0;i<n;i++) cost+=travelCost(mix(a.x,b.x,(i+.5)/n),mix(a.y,b.y,(i+.5)/n))*d/n;
    return cost;
  }
  function planPath(start,goal,units=[],ignore=null) {
    if(!passable(goal.x,goal.y,units,ignore)) return {ok:false,reason:'이 지점은 전차가 통과할 수 없음',points:[]};
    const s=nearestCell(start,units,ignore),g=nearestCell(goal,units,ignore);
    if(s<0||g<0) return {ok:false,reason:'연결 가능한 경로가 없음',points:[]};
    const dist=new Float64Array(navCost.length),prev=new Int32Array(navCost.length),closed=new Uint8Array(navCost.length),heap=new Heap(),gp=cellPoint(g);
    dist.fill(Infinity);prev.fill(-1);dist[s]=0;
    const heuristic=id=>{const p=cellPoint(id);return Math.hypot(p.x-gp.x,p.y-gp.y)*.58;};
    heap.push(s,heuristic(s));let visits=0;
    while(heap.length) {
      const id=heap.pop().id;if(closed[id])continue;closed[id]=1;visits++;
      if(id===g)break;
      const p=cellPoint(id);
      for(let di=0;di<8;di++) {
        if(!(edges[id]&(1<<di)))continue;
        const [dx,dy]=dirs[di],ni=id+dy*cols+dx;if(closed[ni])continue;
        const q=cellPoint(ni);
        if(units.some(u=>u!==ignore&&Math.hypot(u.x-q.x,u.y-q.y)<nav*2)&&!segmentClear(p,q,units,ignore))continue;
        const nd=dist[id]+Math.hypot(dx,dy)*nav*(navCost[id]+navCost[ni])*.5;
        if(nd<dist[ni]){dist[ni]=nd;prev[ni]=id;heap.push(ni,nd+heuristic(ni));}
      }
    }
    if(!Number.isFinite(dist[g])) return {ok:false,reason:'지형을 우회할 경로가 없음',points:[]};
    let raw=[];for(let id=g;id!==-1;id=prev[id]){raw.push(cellPoint(id));if(id===s)break;}
    raw.reverse();raw.unshift({x:start.x,y:start.y});raw.push({...goal});
    const points=[raw[0]];let a=0;
    while(a<raw.length-1) {
      let best=a+1,routed=0;
      for(let j=a+1;j<raw.length&&j<a+24;j++) {
        routed+=segmentCost(raw[j-1],raw[j]);
        if(segmentClear(raw[a],raw[j],units,ignore)&&segmentCost(raw[a],raw[j])<=routed*1.12)best=j;
      }
      points.push(raw[best]);a=best;
    }
    return {ok:true,points:points.slice(1),visits,cost:dist[g]};
  }
  function makeTank(id,name,x,y,heading,team='blue',profileId=ACTIVE_PROFILE_ID,fireMode='auto') {
    registry.get(profileId);
    const u={id,name,profileId,x,y,heading,turret:heading,speed:0,drive:TacticalMobility.create(),path:[],goal:null,reverse:false,team,state:'대기',distanceTravelled:0,replanTimer:0,trackTimer:0};
    const p=profileOf(u);TacticalObservation.init(u);TacticalFireControl.init(u,p,fireMode);if(p.combat)TacticalCombatState.initUnit(u,p);return u;
  }
  function legalNear(x,y,units=[]) {
    for(let r=0;r<150;r+=8) for(let a=0;a<Math.PI*2;a+=Math.PI/8) {
      const p={x:x+Math.cos(a)*r,y:y+Math.sin(a)*r};
      if(passable(p.x,p.y,units))return p;
    }
    throw Error('배치 가능한 위치가 없음');
  }
  function createScenario(seed=7,options={}) {
    const units=[];
    for(const [id,name,x,y,h,team] of [
      ['A11','ALPHA 11',550,2750,-.45,'blue'],['A12','ALPHA 12',780,3060,-.45,'blue'],
      ['T01','관측 표적 01',1150,2330,2.4,'red'],['T02','관측 표적 02',1800,1650,2.5,'red'],['T03','관측 표적 03',3020,2060,2.8,'red']
    ]) {const p=legalNear(x,y,units);units.push(makeTank(id,name,p.x,p.y,h,team));}
    const scenario={time:0,seed,units,recordAIEvents:!!options.recordAIEvents};
    // Playable scenarios state the normal automatic policy explicitly too;
    // manual compatibility fixtures opt into hold when constructing a unit.
    for(const u of units)fireFor(scenario).setMode(u,'auto');
    const byId=id=>units.find(u=>u.id===id),missionPoint=(x,y)=>legalNear(x,y,units);
    assignMission(scenario,byId('T01'),{id:'T01-patrol',type:'patrol',policy:'maintain',loop:true,waypoints:[missionPoint(1420,2190),missionPoint(1040,2460)]});
    assignMission(scenario,byId('T02'),{id:'T02-stop-engage',type:'patrol',policy:'halt',loop:true,waypoints:[missionPoint(1960,1510),missionPoint(1660,1820)]});
    assignMission(scenario,byId('T03'),{id:'T03-reposition',type:'move',policy:'auto',stopPreference:'maintain',waypoints:[missionPoint(2780,2200)]});
    return scenario;
  }
  function applyMove(u,goal,reverse,units) {
    if(u?.combat?.status==='destroyed')return{ok:false,reason:'격파 차량은 이동할 수 없음',points:[]};
    const r=planPath(u,goal,units,u);if(!r.ok)return r;
    u.path=r.points;u.goal={...goal};u.reverse=reverse;u.drive.requestedDirection=reverse?-1:1;return r;
  }
  function applyStop(u){if(u?.combat?.status==='destroyed')return false;u.path=[];u.goal=null;u.reverse=false;u.drive.requestedDirection=0;u.drive.pendingDirection=0;u.state=u.speed>.15?'감속':'대기';return true;}
  function issueMove(u,goal,reverse,units){TacticalAI.override(u,'manual-move');return applyMove(u,goal,reverse,units);}
  function stop(u){TacticalAI.override(u,'manual-stop');return applyStop(u);}
  function routeDistance(u){let d=0,p=u;for(const q of u.path){d+=Math.hypot(q.x-p.x,q.y-p.y);p=q;}return d;}
  function mobilityLimit(type,along,side,reverse=false,p=PROFILE){
    const m=p.mobility,base=type==='road'||type==='bridge'?m.roadSpeed:Math.min(m.crossCountrySpeed,m.surfaceSpeed[type]??Infinity);
    const grade=Math.abs(along);let gradeCap=m.roadSpeed;
    for(let i=1;i<m.gradeSpeedPoints.length;i++){
      const [g0,v0]=m.gradeSpeedPoints[i-1],[g1,v1]=m.gradeSpeedPoints[i];
      if(grade<=g1){gradeCap=mix(v0,v1,clamp((grade-g0)/(g1-g0),0,1));break;}
      gradeCap=v1;
    }
    if(!gradePassable(along,side,p))return 0;
    return Math.min(base,gradeCap,reverse?m.reverseSpeed:Infinity)*(1-.35*clamp(Math.abs(side)/m.maxSideGrade,0,1));
  }
  function driveAcceleration(speed,p=PROFILE){const q=p.mobility.powertrain,ratio=q.forwardRatios[TacticalMobility.selectGearForSpeed(p,1,Math.abs(speed))-1];return Math.max(0,Math.min(q.launchAcceleration*(q.referenceMassKg/p.massKg)*Math.pow(p.engineHp/q.referenceEngineHp,q.launchPowerExponent)*Math.pow(ratio/q.forwardRatios[0],q.gearForceExponent),p.engineHp*745.6998715822702*q.efficiency/(p.massKg*Math.max(Math.abs(speed),q.powerFloorSpeed)))-q.rollingDeceleration);}
  function ensureDrive(u){
    if(u.drive)return u.drive;
    u.drive=TacticalMobility.create();u.drive.velocity=(u.reverse?-1:1)*(Number(u.speed)||0);u.speed=Math.abs(u.drive.velocity);return u.drive;
  }
  function mobilityView(u){
    const d=ensureDrive(u),requested=d.requestedDirection<0?'후진':d.requestedDirection>0?'전진':'정지',actualDirection=Math.abs(d.velocity)>.015?Math.sign(d.velocity):d.selectedDirection;
    const actual=Math.abs(d.velocity)>.015?(d.velocity<0?'실제 후진':'실제 전진'):TacticalMobility.directionLabel(d);
    return{requested,actual,requestMatches:!d.pendingDirection&&d.requestedDirection===actualDirection,gear:TacticalMobility.gearLabel(d),velocity:d.velocity,mode:d.mode,shiftCount:d.shiftCount};
  }
  function stepTank(u,dt,units) {
    const drive=ensureDrive(u);
    if(u.combat?.status==='destroyed'){TacticalAI.destroy(u);TacticalMobility.reset(drive);u.speed=0;u.path=[];u.goal=null;u.state='격파';return;}
    const pVehicle=profileOf(u),motion=pVehicle.mobility;
    u.replanTimer=Math.max(0,u.replanTimer-dt);
    while(u.path.length>1&&Math.hypot(u.path[0].x-u.x,u.path[0].y-u.y)<4)u.path.shift();
    let desired=0,request=0,err=0;
    if(u.path.length) {
      const p=u.path[0],d=Math.hypot(p.x-u.x,p.y-u.y);
      if(u.path.length===1&&d<=motion.powertrain.arrivalRadius&&Math.abs(drive.velocity)<=motion.powertrain.arrivalSpeed){u.path=[];u.goal=null;u.reverse=false;}
    }
    if(u.path.length) {
      request=u.reverse?-1:1;
      const velocityDirection=Math.abs(drive.velocity)>motion.powertrain.directionStopSpeed?Math.sign(drive.velocity):0;
      // A route direction only becomes steerable after the drivetrain has
      // connected that direction. During direction-brake/direction-wait the
      // old momentum keeps its heading while targetSpeed=0 performs braking.
      const directionConnected=!drive.pendingDirection&&drive.selectedDirection===request&&(!velocityDirection||velocityDirection===request);
      if(directionConnected) {
        const p=u.path[0],d=Math.hypot(p.x-u.x,p.y-u.y);
        const aim=Math.atan2(p.y-u.y,p.x-u.x)+(request<0?Math.PI:0);err=angleDiff(aim,u.heading);
        const turnLimit=TacticalMobility.turnRate(drive.velocity,pVehicle)*dt;
        u.heading+=clamp(err,-turnLimit,turnLimit);
        const type=surfaceAt(u.x,u.y),grade=gradeAt(u.x,u.y,u.heading),base=mobilityLimit(type,grade.along,grade.side,request<0,pVehicle),corner=Math.max(0,Math.cos(err));
        desired=Math.min(base*corner*corner,Math.sqrt(Math.max(0,2*motion.brakeDeceleration*(routeDistance(u)-motion.powertrain.arrivalRadius))));
        if(u.path.length>1&&d<24){const q=u.path[1],turn=Math.abs(angleDiff(Math.atan2(q.y-p.y,q.x-p.x),Math.atan2(p.y-u.y,p.x-u.x)));if(turn>.5)desired=Math.min(desired,2.5+Math.max(0,d-5)*.35);}
        if(Math.abs(err)>1.15)desired=0;
      }
    }
    TacticalMobility.step(drive,{direction:request,targetSpeed:desired},pVehicle,dt);u.speed=Math.abs(drive.velocity);
    u.state=TacticalMobility.directionLabel(drive);if(u.path.length&&desired<.2&&u.speed<.3&&!drive.pendingDirection)u.state='선회';
    const next={x:u.x+Math.cos(u.heading)*drive.velocity*dt,y:u.y+Math.sin(u.heading)*drive.velocity*dt};
    if(u.speed>0&&segmentClear(u,next,units,u)){u.distanceTravelled+=u.speed*dt;u.x=next.x;u.y=next.y;}
    else if(u.speed>0){drive.velocity=0;drive.selectedDirection=0;drive.gear=0;u.speed=0;u.state='경로 대기';if(u.goal&&u.replanTimer<=0){const r=planPath(u,u.goal,units,u);if(r.ok)u.path=r.points;u.replanTimer=1.5;}}
  }
  const observationRuntimes=new WeakMap();
  function observationFor(s){
    if(!observationRuntimes.has(s))observationRuntimes.set(s,TacticalObservation.create({profileOf,exposure,seed:s.seed??7,onEvent:s.recordObservationEvents?e=>{s.observationEvents??=[];s.observationEvents.push(e);if(s.observationEvents.length>4000)s.observationEvents.shift();}:null}));
    return observationRuntimes.get(s);
  }
  const aiRuntimes=new WeakMap();
  function aiFor(s){
    if(!aiRuntimes.has(s))aiRuntimes.set(s,TacticalAI.create({profileOf,move:applyMove,stop:applyStop,suppressAuto:(u,value)=>fireFor(s).suppressAuto(u,value),
      onEvent:s.recordAIEvents?event=>{s.aiEvents??=[];s.aiEvents.push(event);if(s.aiEvents.length>2000)s.aiEvents.shift();}:null}));
    return aiRuntimes.get(s);
  }
  const assignMission=(s,u,spec)=>aliveCommand(u)?aiFor(s).assign(u,spec,s.time):null;
  const cancelMission=(s,u,halt=true)=>{const changed=TacticalAI.override(u,'mission-cancelled');if(changed&&halt)applyStop(u);return changed;};
  function step(s,dt){
    s.time+=dt;
    for(const u of s.units){const p=profileOf(u);if(p.combat&&!u.combat)TacticalCombatState.initUnit(u,p);stepTank(u,dt,s.units);}
    // Flight arrivals and their temporary reactions precede sensing, AI and
    // any new fire attempt at the same fixed-step timestamp.
    fireFor(s).resolveImpacts(s.units,s.time);
    const alive=s.units.filter(u=>u.combat?.status!=='destroyed');
    // Only living vehicles observe and act; every vehicle remains a sensing
    // candidate so an unseen destruction can later be discovered as a wreck.
    observationFor(s).advance(alive,dt,s.time,s.units);
    confirmObservedWrecks(s,alive);
    aiFor(s).advance(alive,dt,s.time);
    fireFor(s).step(s.units,dt,s.time);
  }
  const wreckRuntimes=new WeakMap();
  function wreckMap(s,team){if(!wreckRuntimes.has(s))wreckRuntimes.set(s,new Map());const all=wreckRuntimes.get(s);if(!all.has(team))all.set(team,new Map());return all.get(team);}
  function contacts(s,team='blue'){
    const base=observationFor(s).contacts(team),wrecks=wreckMap(s,team),result=[],seen=new Set();
    for(const c of base){const w=wrecks.get(c.key);result.push(w?JSON.parse(JSON.stringify(w)):c);seen.add(c.key);}
    for(const [key,w]of wrecks)if(!seen.has(key))result.push(JSON.parse(JSON.stringify(w)));
    return result;
  }
  function wreckSnapshot(target,c,now){
    const p=profileOf(target),pose=c.pose;
    return{key:c.key,x:pose.x,y:pose.y,heading:pose.heading,turret:pose.turret,commander:pose.commander??pose.turret,
      model:{...pose.model,turretPivot:pose.model?.turretPivot?.slice(),muzzleLocal:pose.model?.muzzleLocal?.slice()},team:target.team,
      identified:true,current:false,memory:false,wreck:true,destroyed:true,observedAt:now,age:0,label:'격파 잔해',name:c.known?.name??target.name,type:c.known?.type??p.name};
  }
  function confirmWreck(s,team,target,c){
    const map=wreckMap(s,team);if(map.has(c.key)||!c.pose)return map.get(c.key)||null;
    const copy=wreckSnapshot(target,c,s.time);map.set(c.key,copy);return copy;
  }
  function confirmObservedWrecks(s,observers){
    const byId=new Map(s.units.map(u=>[u.id,u]));
    for(const observer of observers)for(const[id,c]of Object.entries(observer.observation?.contacts||{})){
      if(!c.wreckConfirmed)continue;const target=byId.get(id);
      if(target?.combat?.status==='destroyed')confirmWreck(s,observer.team,target,c);
    }
  }
  const aliveCommand=u=>u&&u.combat?.status!=='destroyed';
  const guard=(s,u,ch,point,duration=0)=>aliveCommand(u)&&!!profileOf(u).sensors[ch]?.enabled&&(ch!=='commander'||profileOf(u).sensors.commander.independent)&&TacticalObservation.guard(u,ch,point,duration,s.time);
  const resumeObservation=(s,u,ch)=>aliveCommand(u)&&TacticalObservation.resume(u,ch,s.time);
  // Command acceptance depends only on the team's public contact. A hidden
  // destruction must not be disclosed by a different success/failure result.
  const designate=(s,u,key)=>aliveCommand(u)&&!wreckMap(s,u.team).has(key)&&observationFor(s).direct(u,key);
  const cancelDesignation=(s,u)=>{if(!aliveCommand(u))return false;TacticalObservation.cancel(u,s.time);fireFor(s).cancel(u);return true;};
  const observationView=(s,u,ch='commander')=>TacticalObservation.view(u,ch,s.time);
  const ownObservation=(s,u,key=null)=>observationFor(s).ownStatus(u,key);
  const observationStats=s=>({...observationFor(s).stats});
  const combatRuntimes=new WeakMap();
  function combatFor(s){
    if(!combatRuntimes.has(s))combatRuntimes.set(s,TacticalCombatState.create({profileOf,onDestroyed:(target)=>{
      target.speed=0;if(target.drive)TacticalMobility.reset(target.drive);target.path=[];target.goal=null;target.reverse=false;target.state='격파';
      TacticalAI.destroy(target);
      TacticalObservation.cancel(target,s.time,'destroyed');fireFor(s).cancel(target);
    }}));
    return combatRuntimes.get(s);
  }
  const combatView=u=>{
    if(!u?.combat)return null;let lastDamage=null;
    if(u.combat.lastDamage){const{id,targetId,...safe}=u.combat.lastDamage;lastDamage=JSON.parse(JSON.stringify(safe));}
    return{maxHp:u.combat.maxHp,hp:u.combat.hp,status:u.combat.status,ammoId:u.combat.ammoId,destroyedAt:u.combat.destroyedAt,lastDamage};
  };
  const combatEvents=s=>s.recordFireEvents?combatFor(s).records():[];
  const combatStats=s=>combatFor(s).stats();
  const fireRuntimes=new WeakMap();
  function fireFor(s){
    if(!fireRuntimes.has(s)){
      let observedAt=-1;const observedTeams=new Map();
      fireRuntimes.set(s,TacticalFireControl.create({profileOf,seed:s.seed??7,debug:!!s.recordFireEvents,
      isObserved:(team,key)=>{if(observedAt!==s.time){observedTeams.clear();observedAt=s.time;}if(!observedTeams.has(team))observedTeams.set(team,new Map(contacts(s,team).filter(v=>v.current).map(v=>[v.key,v])));return observedTeams.get(team).get(key)||false;},
      impactEnvironment:{heightAt,buildingAt,world:WORLD},
      impactSight:shot=>{const target=s.units.find(v=>v.id===shot.targetId);if(!target)return{visible:false,gone:true};const p=profileOf(target),origin={...shot.origin,profileOverride:shot.profileAtFire};return{...exposure(origin,target,shot.fireEye),presented:{...p.fireControl.presented},pose:{x:target.x,y:target.y,heading:target.heading,turret:target.turret,model:{hullLength:p.model.hullLength,width:p.model.width,turretLength:p.model.turretLength,turretWidth:p.model.turretWidth,turretPivot:[...p.model.turretPivot]}}};},
      onImpactResolved:event=>{
        const target=s.units.find(v=>v.id===event.targetId),p=target?profileOf(target):null;
        const record=p?.combat?combatFor(s).apply(event,target,s.time):{applied:false,reason:target?'unsupported-profile':'target-unavailable',damage:0,destroyed:false};
        if(target&&record.applied)fireFor(s).react(target,record,s.time);
        if(record.destroyed&&event.observed&&event.observation){
          const c=event.observation,w={key:c.key,x:event.pose.x,y:event.pose.y,heading:event.pose.heading,turret:event.pose.turret,commander:event.pose.commander??event.pose.turret,model:{...c.model,turretPivot:c.model?.turretPivot?.slice(),muzzleLocal:c.model?.muzzleLocal?.slice()},team:target.team,identified:true,current:false,memory:false,wreck:true,destroyed:true,observedAt:s.time,age:0,label:'격파 잔해',name:c.name??target.name,type:c.type??p.name};
          wreckMap(s,event.team).set(c.key,w);
          for(const observer of s.units.filter(u=>u.team===event.team)){
            const mission=[observer.observation?.designation,observer.observation?.tracking].find(d=>['designated','waiting','acquiring','acquired'].includes(d?.status));
            if(mission?.target===target.id){TacticalObservation.cancel(observer,s.time,'target-destroyed');fireFor(s).cancel(observer);}
          }
        }
        return TacticalCombatState.publicRecord(record);
      },
      onFireBlocked:(u,target,reason,now)=>observationFor(s).retarget(u,target,reason,now),
      freshSight:(u,id)=>{
      const target=s.units.find(v=>v.id===id);if(!target)return{visible:false,reason:'fresh-sight-failed'};
      // A private destruction may physically stop a shot, but its public reason
      // stays indistinguishable from an ordinary loss of the firing solution.
      if(target.combat?.status==='destroyed')return{visible:false,reason:'fresh-sight-failed'};
      const p=profileOf(u),sensor=p.sensors.gunner,optical=exposure(u,target,sensor.eyeHeight),muzzle={...TacticalVehicleGeometry.muzzleWorld(u,p.model),profileId:u.profileId,profileOverride:u.profileOverride};
      // Keep the game firing height relative to the hull's ground, even when
      // the barrel tip lies over different terrain. Optics stay on the vehicle.
      const fireEye=heightAt(u.x,u.y)+p.fireControl.fireHeight-heightAt(muzzle.x,muzzle.y);
      const muzzleRoof=buildingAt(muzzle.x,muzzle.y)?.roof??-Infinity;
      const weapon=fireEye>0&&heightAt(u.x,u.y)+p.fireControl.fireHeight>=muzzleRoof?exposure(muzzle,target,fireEye):null;
      let hull=0,turret=0,gunnerVisible=false;const samples=optical.samples.map(v=>({...v,visible:false}));
      for(let i=0;i<optical.samples.length;i++){
        const v=optical.samples[i],d=Math.hypot(v.x-u.x,v.y-u.y),angle=Math.abs(angleDiff(Math.atan2(v.y-u.y,v.x-u.x),u.turret));
        if(!v.visible||d>sensor.range||angle>sensor.fov/2)continue;gunnerVisible=true;
        if(weapon?.samples[i].visible){samples[i].visible=true;if(v.part==='hull')hull++;else turret++;}
      }
      const tp=profileOf(target);
      return{visible:hull+turret>0,hull:hull/6,turret:turret/3,samples,fireEye,presented:{...tp.fireControl.presented},reason:gunnerVisible?'fire-line-blocked':'fresh-sight-failed',pose:{x:target.x,y:target.y,heading:target.heading,turret:target.turret,model:{hullLength:tp.model.hullLength,width:tp.model.width,turretLength:tp.model.turretLength,turretWidth:tp.model.turretWidth,turretPivot:[...tp.model.turretPivot]}}};
    }}));}
    return fireRuntimes.get(s);
  }
  const fireStatus=(s,u,key=null)=>fireFor(s).view(u,key);
  const fireMode=(s,u,mode)=>aliveCommand(u)&&fireFor(s).setMode(u,mode);
  const requestFire=(s,u,key)=>{
    if(!aliveCommand(u))return{ok:false,reason:'destroyed'};
    return fireFor(s).request(u,key,s.time);
  };
  const fireEvents=(s,team='blue',since=-Infinity)=>fireFor(s).events(team,since);
  const effectEvents=(s,since=-Infinity)=>fireFor(s).effects(since);
  const effectEventStats=s=>fireFor(s).effectStats();
  const fireDebugRecords=s=>s.recordFireEvents?fireFor(s).debugRecords():[];
  const roofGrid=new Float32Array(TH.columns*TH.rows);
  for(const b of buildings) for(let y=Math.max(0,Math.floor(b.minY/4));y<=Math.min(999,Math.floor(b.maxY/4));y++) for(let x=Math.max(0,Math.floor(b.minX/4));x<=Math.min(999,Math.floor(b.maxX/4));x++) {
    if(insideBuilding(x*4+2,y*4+2,b))roofGrid[y*1000+x]=Math.max(roofGrid[y*1000+x],b.roof);
  }
  function roofAt(x,y){return roofGrid[clamp(Math.floor(y/4),0,999)*1000+clamp(Math.floor(x/4),0,999)];}
  // LOS needs only a single spatial bucket and no clearance/duplicate set.
  // Keep exact polygon checks, including structures thinner than the roof atlas.
  function sightRoofBlocked(x,y,ray){
    const candidates=buildingBuckets.get(Math.floor(y/64)*bucketCols+Math.floor(x/64));
    if(!candidates)return false;
    for(const b of candidates)if(b.roof>ray&&x>=b.minX&&x<=b.maxX&&y>=b.minY&&y<=b.maxY&&insideBuilding(x,y,b))return true;
    return false;
  }
  function sightRoofBlockedPair(x,y,ray0,ray1){
    const candidates=buildingBuckets.get(Math.floor(y/64)*bucketCols+Math.floor(x/64));
    if(!candidates)return 0;
    let blocked=0;
    for(const b of candidates){
      if((blocked&1||b.roof<=ray0)&&(blocked&2||b.roof<=ray1))continue;
      if(x<b.minX||x>b.maxX||y<b.minY||y>b.maxY||!insideBuilding(x,y,b))continue;
      if(b.roof>ray0)blocked|=1;if(b.roof>ray1)blocked|=2;if(blocked===3)break;
    }
    return blocked;
  }
  // Conservative static summaries, never a replacement heightfield. Include
  // every interpolation vertex touching a 32m tile (one-node halo), all roofs
  // whose bounding boxes intersect it, and every forest/scrub surface cell.
  const sightTile=32,sightCols=Math.ceil(WORLD.w/sightTile),sightRows=Math.ceil(WORLD.h/sightTile);
  const sightGroundMax=new Float64Array(sightCols*sightRows),sightRoofMax=new Float64Array(sightCols*sightRows),sightForest=new Uint8Array(sightCols*sightRows);
  // The fast preview atlas has a zero roof floor, even in empty cells.
  sightRoofMax.fill(0);
  for(let by=0;by<sightRows;by++)for(let bx=0;bx<sightCols;bx++){
    const key=by*sightCols+bx,x0=bx*sightTile,y0=by*sightTile,x1=Math.min(x0+sightTile,WORLD.w),y1=Math.min(y0+sightTile,WORLD.h);
    const hx0=clamp(Math.floor((x0-H.sampleOrigin)/H.spacing),0,H.columns-1),hx1=clamp(Math.floor((x1-H.sampleOrigin)/H.spacing)+1,0,H.columns-1);
    const hy0=clamp(Math.floor((y0-H.sampleOrigin)/H.spacing),0,H.rows-1),hy1=clamp(Math.floor((y1-H.sampleOrigin)/H.spacing)+1,0,H.rows-1);
    let maximum=-Infinity;
    for(let y=hy0;y<=hy1;y++)for(let x=hx0;x<=hx1;x++)maximum=Math.max(maximum,heights[y*H.columns+x]);
    sightGroundMax[key]=maximum;
    const sx0=Math.floor(x0/TH.spacing),sx1=Math.min(TH.columns-1,Math.ceil(x1/TH.spacing)-1),sy0=Math.floor(y0/TH.spacing),sy1=Math.min(TH.rows-1,Math.ceil(y1/TH.spacing)-1);
    for(let y=sy0;y<=sy1;y++)for(let x=sx0;x<=sx1;x++){
      const code=surface[y*TH.columns+x];if(code===2||code===4)sightForest[key]=1;
      // Also bound the preview atlas, including any polygon/atlas boundary gap.
      sightRoofMax[key]=Math.max(sightRoofMax[key],roofGrid[y*TH.columns+x]||-Infinity);
    }
  }
  for(const b of buildings){
    const x0=clamp(Math.floor(b.minX/sightTile),0,sightCols-1),x1=clamp(Math.floor(b.maxX/sightTile),0,sightCols-1),y0=clamp(Math.floor(b.minY/sightTile),0,sightRows-1),y1=clamp(Math.floor(b.maxY/sightTile),0,sightRows-1);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const key=y*sightCols+x;sightRoofMax[key]=Math.max(sightRoofMax[key],b.roof);}
  }
  const sharedLosStats={groups:0,rays:0,heightSamples:0,heightReadsAvoided:0,buildingSamples:0,forestSamples:0};let trackSharedLos=false;
  function losDiagnostics(enable=null){
    if(enable!==null){if(enable)for(const key of Object.keys(sharedLosStats))sharedLosStats[key]=0;trackSharedLos=!!enable;}
    return{enabled:trackSharedLos,...sharedLosStats};
  }
  const losAccelerationInfo=()=>({tileMetres:sightTile,tiles:sightCols*sightRows,summaryBytes:sightGroundMax.byteLength+sightRoofMax.byteLength+sightForest.byteLength});
  function lineOfSight(observer,target,targetHeight=1.5,fast=false,eyeHeight=null) {
    const d=Math.hypot(target.x-observer.x,target.y-observer.y);
    const sensor=profileOf(observer).sensors;
    if(d>sensor.observationLimit)return {visible:false,reason:'range',forestDepth:0};
    const start=heightAt(observer.x,observer.y)+(eyeHeight??sensor.eyeHeight),end=heightAt(target.x,target.y)+targetHeight,n=Math.max(2,Math.ceil(d/(fast?6:2)));
    const dx=target.x-observer.x,dy=target.y-observer.y;
    // Outside-map and non-finite requests retain the original fine-scan path.
    const summarized=Number.isFinite(start+end+d)&&observer.x>=0&&observer.x<=WORLD.w&&observer.y>=0&&observer.y<=WORLD.h&&target.x>=0&&target.x<=WORLD.w&&target.y>=0&&target.y<=WORLD.h;
    let optical=0,i=1;
    while(i<n){
      let limit=n;
      if(summarized){
        const t=i/n,x=mix(observer.x,target.x,t),y=mix(observer.y,target.y,t),bx=Math.min(sightCols-1,Math.floor(x/sightTile)),by=Math.min(sightRows-1,Math.floor(y/sightTile));
        const exitX=dx>0?((bx+1)*sightTile-observer.x)/dx:dx<0?(bx*sightTile-observer.x)/dx:Infinity;
        const exitY=dy>0?((by+1)*sightTile-observer.y)/dy:dy<0?(by*sightTile-observer.y)/dy:Infinity;
        limit=Math.min(n,Math.max(i+1,Math.ceil(Math.min(exitX,exitY,1)*n)));
        // Verify the last original lattice point belongs to the same tile. This
        // keeps exact-boundary/negative-direction rounding conservative.
        let last=(limit-1)/n,lastX=mix(observer.x,target.x,last),lastY=mix(observer.y,target.y,last);
        while(limit>i+1&&(Math.min(sightCols-1,Math.floor(lastX/sightTile))!==bx||Math.min(sightRows-1,Math.floor(lastY/sightTile))!==by)){
          limit--;last=(limit-1)/n;lastX=mix(observer.x,target.x,last);lastY=mix(observer.y,target.y,last);
        }
        const key=by*sightCols+bx,minRay=Math.min(mix(start,end,t),mix(start,end,last)),ground=sightGroundMax[key],epsilon=1e-7;
        // A skipped span cannot block terrain/roofs or contribute any forest
        // depth. Ambiguous spans execute every original 2m (preview 6m) sample.
        if(minRay+.06>=ground+epsilon&&minRay>=sightRoofMax[key]+epsilon&&(!sightForest[key]||minRay>=ground+15+epsilon)){i=limit;continue;}
      }
      for(;i<limit;i++){
        const t=i/n,x=mix(observer.x,target.x,t),y=mix(observer.y,target.y,t),ray=mix(start,end,t),ground=heightAt(x,y);
        if(ground>ray+.06)return {visible:false,reason:'terrain',forestDepth:optical};
        if(fast&&roofAt(x,y)>ray)return {visible:false,reason:'building',forestDepth:optical};
        if(!fast&&sightRoofBlocked(x,y,ray))return {visible:false,reason:'building',forestDepth:optical};
        if(ray<ground+15)optical+=forestAt(x,y)*d/n/85;
        if(optical>1)return {visible:false,reason:'forest',forestDepth:optical};
      }
    }
    return {visible:true,reason:'clear',forestDepth:optical};
  }
  // Two hull samples at the same x/y use the exact same 2 m horizontal
  // lattice. Share only static lookups; ray height, tile skips, forest depth,
  // blocking reason and early termination remain independent.
  function pairedLineOfSight(observer,target,height0,height1,eyeHeight){
    if(!Number.isFinite(observer.x+observer.y+target.x+target.y+height0+height1+eyeHeight)||observer.x<0||observer.x>WORLD.w||observer.y<0||observer.y>WORLD.h||target.x<0||target.x>WORLD.w||target.y<0||target.y>WORLD.h){
      return[lineOfSight(observer,target,height0,false,eyeHeight),lineOfSight(observer,target,height1,false,eyeHeight)];
    }
    const d=Math.hypot(target.x-observer.x,target.y-observer.y),sensor=profileOf(observer).sensors;
    if(d>sensor.observationLimit)return[{visible:false,reason:'range',forestDepth:0},{visible:false,reason:'range',forestDepth:0}];
    const observerGround=heightAt(observer.x,observer.y),targetGround=heightAt(target.x,target.y),start=observerGround+eyeHeight,end0=targetGround+height0,end1=targetGround+height1,n=Math.max(2,Math.ceil(d/2));
    const dx=target.x-observer.x,dy=target.y-observer.y;let optical0=0,optical1=0,next0=1,next1=1,result0=null,result1=null;
    if(trackSharedLos){sharedLosStats.groups++;sharedLosStats.rays+=2;sharedLosStats.heightReadsAvoided+=2;}
    while(!result0||!result1){
      const i=Math.min(result0?Infinity:next0,result1?Infinity:next1);if(i>=n)break;
      const t=i/n,x=mix(observer.x,target.x,t),y=mix(observer.y,target.y,t),bx=Math.min(sightCols-1,Math.floor(x/sightTile)),by=Math.min(sightRows-1,Math.floor(y/sightTile));
      const exitX=dx>0?((bx+1)*sightTile-observer.x)/dx:dx<0?(bx*sightTile-observer.x)/dx:Infinity;
      const exitY=dy>0?((by+1)*sightTile-observer.y)/dy:dy<0?(by*sightTile-observer.y)/dy:Infinity;
      let limit=Math.min(n,Math.max(i+1,Math.ceil(Math.min(exitX,exitY,1)*n)));
      let last=(limit-1)/n,lastX=mix(observer.x,target.x,last),lastY=mix(observer.y,target.y,last);
      while(limit>i+1&&(Math.min(sightCols-1,Math.floor(lastX/sightTile))!==bx||Math.min(sightRows-1,Math.floor(lastY/sightTile))!==by)){
        limit--;last=(limit-1)/n;lastX=mix(observer.x,target.x,last);lastY=mix(observer.y,target.y,last);
      }
      const key=by*sightCols+bx,groundMax=sightGroundMax[key],roofMax=sightRoofMax[key],forest=sightForest[key],epsilon=1e-7;let fine0=false,fine1=false;
      if(!result0&&next0===i){const minRay=Math.min(mix(start,end0,t),mix(start,end0,last));if(minRay+.06>=groundMax+epsilon&&minRay>=roofMax+epsilon&&(!forest||minRay>=groundMax+15+epsilon))next0=limit;else fine0=true;}
      if(!result1&&next1===i){const minRay=Math.min(mix(start,end1,t),mix(start,end1,last));if(minRay+.06>=groundMax+epsilon&&minRay>=roofMax+epsilon&&(!forest||minRay>=groundMax+15+epsilon))next1=limit;else fine1=true;}
      if(!fine0&&!fine1)continue;
      for(let index=i;index<limit&&(fine0||fine1);index++){
        let active0=fine0&&!result0&&next0===index,active1=fine1&&!result1&&next1===index;if(!active0&&!active1)continue;
        const ratio=index/n,sx=mix(observer.x,target.x,ratio),sy=mix(observer.y,target.y,ratio),ground=heightAt(sx,sy),ray0=mix(start,end0,ratio),ray1=mix(start,end1,ratio);
        if(trackSharedLos){sharedLosStats.heightSamples++;if(active0&&active1)sharedLosStats.heightReadsAvoided++;}
        if(active0&&ground>ray0+.06){result0={visible:false,reason:'terrain',forestDepth:optical0};active0=fine0=false;}
        if(active1&&ground>ray1+.06){result1={visible:false,reason:'terrain',forestDepth:optical1};active1=fine1=false;}
        if(active0&&active1){const blocked=sightRoofBlockedPair(sx,sy,ray0,ray1);if(trackSharedLos)sharedLosStats.buildingSamples++;if(blocked&1){result0={visible:false,reason:'building',forestDepth:optical0};active0=fine0=false;}if(blocked&2){result1={visible:false,reason:'building',forestDepth:optical1};active1=fine1=false;}}
        else if(active0&&sightRoofBlocked(sx,sy,ray0)){result0={visible:false,reason:'building',forestDepth:optical0};active0=fine0=false;}
        else if(active1&&sightRoofBlocked(sx,sy,ray1)){result1={visible:false,reason:'building',forestDepth:optical1};active1=fine1=false;}
        const forest0=active0&&ray0<ground+15,forest1=active1&&ray1<ground+15;
        if(forest0||forest1){const density=forestAt(sx,sy),increment=density*d/n/85;if(trackSharedLos)sharedLosStats.forestSamples++;if(forest0){optical0+=increment;if(optical0>1){result0={visible:false,reason:'forest',forestDepth:optical0};active0=fine0=false;}}if(forest1){optical1+=increment;if(optical1>1){result1={visible:false,reason:'forest',forestDepth:optical1};active1=fine1=false;}}}
        if(active0)next0=index+1;if(active1)next1=index+1;
      }
    }
    if(!result0)result0={visible:true,reason:'clear',forestDepth:optical0};if(!result1)result1={visible:true,reason:'clear',forestDepth:optical1};return[result0,result1];
  }
  function exposure(observer,target,eyeHeight=null,cache=null) {
    let hull=0,turret=0,depth=0,rayQueries=0,rayCacheHits=0;const eye=eyeHeight??profileOf(observer).sensors.eyeHeight,e=profileOf(target).exposure,samples=[];
    function previousLos(index,x,y,z){
      const previous=cache?.samples[index];
      // Reuse only exactly unchanged endpoints/eye/sample height on the frozen
      // map, and for at most 0.5 simulated seconds. Turning hull/turret or moving
      // either unit invalidates affected samples immediately.
      if(previous&&previous.x===x&&previous.y===y&&previous.z===z&&previous.ox===observer.x&&previous.oy===observer.y&&previous.eye===eye&&cache.time-previous.at<=cache.maxAge){rayCacheHits++;return previous.los;}
      return null;
    }
    function store(index,x,y,z,los){if(cache)cache.samples[index]={x,y,z,ox:observer.x,oy:observer.y,eye,at:cache.time,los};}
    function append(x,y,along,z,part,col,row,los){
      samples.push({x,y,part,along,z,col,row,visible:los.visible,forestDepth:los.forestDepth});
      if(los.visible){if(part==='hull')hull++;else turret++;depth+=los.forestDepth;}
    }
    const hullCos=Math.cos(target.heading),hullSin=Math.sin(target.heading);
    for(const [col,along] of e.hullAlong.entries()){
      const x=target.x+hullCos*along,y=target.y+hullSin*along,index=samples.length,z0=e.hullHeights[0],z1=e.hullHeights[1];let los0=previousLos(index,x,y,z0),los1=previousLos(index+1,x,y,z1);
      if(!los0&&!los1){[los0,los1]=pairedLineOfSight(observer,{x,y},z0,z1,eye);rayQueries+=2;store(index,x,y,z0,los0);store(index+1,x,y,z1,los1);}
      else{
        if(!los0){los0=lineOfSight(observer,{x,y},z0,false,eye);rayQueries++;store(index,x,y,z0,los0);}
        if(!los1){los1=lineOfSight(observer,{x,y},z1,false,eye);rayQueries++;store(index+1,x,y,z1,los1);}
      }
      append(x,y,along,z0,'hull',col,0,los0);append(x,y,along,z1,'hull',col,1,los1);
    }
    const turretAngle=target.turret??target.heading,turretCos=Math.cos(turretAngle),turretSin=Math.sin(turretAngle);
    for(const [col,along] of e.turretAlong.entries()){
      const x=target.x+turretCos*along,y=target.y+turretSin*along,index=samples.length,z=e.turretHeight;let los=previousLos(index,x,y,z);
      if(!los){los=lineOfSight(observer,{x,y},z,false,eye);rayQueries++;store(index,x,y,z,los);}append(x,y,along,z,'turret',col,0,los);
    }
    return {hull:hull/6,turret:turret/3,visible:hull>0||turret>0,forestDepth:hull+turret?depth/(hull+turret):0,samples,rayQueries,rayCacheHits};
  }
  return {registry,fireStatus,fireMode,requestFire,fireEvents,effectEvents,effectEventStats,fireDebugRecords,combatView,combatEvents,combatStats,losAccelerationInfo,losDiagnostics,ownObservation,contacts,guard,resumeObservation,designate,cancelDesignation,observationView,observationStats,assignMission,cancelMission,PROFILE,profileOf,mobilityLimit,driveAcceleration,mobilityView,gradeAt,gradePassable,bakeNavigation,MAP,WORLD,VEHICLE,roads,forests,fields,water,waterways,trees,labels,buildings,clamp,mix,hash,angleDiff,heightAt,forestAt,slopeAt,surfaceAt,surfaceCode,waterAt,bridgeAt,solidAt,buildingAt,insideBuilding,passable,segmentClear,planPath,makeTank,createScenario,issueMove,stop,routeDistance,step,lineOfSight,exposure,legalNear};
})();
if(typeof module!=='undefined')module.exports=TacticalCore;
