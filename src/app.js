(() => {
  const C=TacticalCore,$=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d'),wrap=$('mapWrap');
  let sim=C.createScenario(),selected='A11',targetId=null,paused=false,timeScale=1,reverseMode=false,showContours=true,terrainMode=false,sightHeld=false,sightPointer=null,sightKey=false,last=performance.now(),accumulator=0,uiTime=0,toastUntil=0,visibilityDirty=true,visLast=-1,visOrigin=null,frameCount=0,guardPopupOpen=false,portraitBlocked=false,portraitPausedBefore=false;
  const camera={
    x:C.WORLD.w/2,y:C.WORLD.h/2,zoom:.5,w:1,h:1,dpr:1
  }
  ,trails=[],pointers=new Map();
  let gesture=null,dragged=false,clickStart=null;
  const alive=u=>u&&u.combat?.status!=='destroyed';
  const selectedUnit=()=>sim.units.find(u=>u.id===selected&&u.team==='blue'&&alive(u));
  const crewNames={driver:'운전수',commander:'전차장',gunner:'포수',loader:'장전수'},severityNames={normal:'정상',light:'경상',serious:'중상'};
  const reactionText=(v,compact=false)=>{const r=C.combatView(v)?.reactions;if(!r)return'';const faults=[r.faults.mobility.active?'기동 '+r.faults.mobility.remaining.toFixed(1)+'초':'',r.faults.turretDrive.active?'포탑 '+r.faults.turretDrive.remaining.toFixed(1)+'초':''].filter(Boolean),crew=Object.entries(r.crew).map(([role,status])=>(compact?crewNames[role][0]:crewNames[role])+' '+severityNames[status]);return(faults.length?'일시 이상 '+faults.join('/')+' · ':'')+'승무원 '+crew.join(' / ');};
  const ui=TacticalUICache;
  const lookView=channel=>{const u=selectedUnit();return u?C.observationView(sim,u,channel||$('lookChannel').value||'commander'):{mode:'idle',turret:0,gaze:0,direction:null,remaining:null,point:null};};
  let lookPicking=false;
  const terrainRenderer=new TacticalRenderer(C,CONTOUR_DATA,TERRAIN_DATA);
  const effectRenderer=TacticalEffects.create(),reducedMotionMedia=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
  let effectsEnabled=true,effectQuality=1,reducedMotionOverride=null;
  let visibility=null,visibilityPath=null;
  const visibilityClient=new TacticalVisibilityClient(C,TacticalVisibility,()=>['battlefield-data','map-spec','vehicle-profiles','mobility','tactical-ai','vehicle-geometry','observation','combat-state','fire-control','sim-core','visibility-code'].map(id=>$(id).textContent).join('\n'));
  const sightDescription='지형 가능 영역(1.5m 표적) · 실제 탐지와 다름 · 주변 200m / 전차장 2500m / 포수 2000m';
  let sightRevision=0;
  function fitCamera(){
    const rect=canvas.getBoundingClientRect();
    camera.w=rect.width;
    camera.h=rect.height;
    camera.zoom=Math.min(camera.w/C.WORLD.w,camera.h/C.WORLD.h)*.94;
    camera.x=C.WORLD.w/2;
    camera.y=C.WORLD.h/2;
    clampCamera()
  }
  function resize(initial=false){
    const r=canvas.getBoundingClientRect();
    camera.w=r.width;
    camera.h=r.height;
    camera.dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(r.width*camera.dpr);
    canvas.height=Math.round(r.height*camera.dpr);
    if(initial||!camera.zoom)fitCamera();
    else clampCamera()
  }
  function clampCamera() {
    const margin=100,cx=camera.w/(2*camera.zoom),cy=camera.h/(2*camera.zoom);
    camera.x=cx>C.WORLD.w/2+margin?C.WORLD.w/2:C.clamp(camera.x,cx-margin,C.WORLD.w-cx+margin);
    camera.y=cy>C.WORLD.h/2+margin?C.WORLD.h/2:C.clamp(camera.y,cy-margin,C.WORLD.h-cy+margin);
  }
  function toWorld(x,y){
    return {
      x:(x-camera.w/2)/camera.zoom+camera.x,y:(y-camera.h/2)/camera.zoom+camera.y
    }
  }
  function toScreen(x,y){
    return {
      x:(x-camera.x)*camera.zoom+camera.w/2,y:(y-camera.y)*camera.zoom+camera.h/2
    }
  }
  function zoomAt(factor,sx=camera.w/2,sy=camera.h/2){
    const p=toWorld(sx,sy),min=Math.min(camera.w/C.WORLD.w,camera.h/C.WORLD.h)*.65;
    camera.zoom=C.clamp(camera.zoom*factor,min,32);
    camera.x=p.x-(sx-camera.w/2)/camera.zoom;
    camera.y=p.y-(sy-camera.h/2)/camera.zoom;
    clampCamera()
  }
  function toast(text){
    $('toast').textContent=text;
    $('toast').classList.add('show');
    toastUntil=performance.now()+2700
  }
  function setReverse(v){
    reverseMode=v;
    $('reverse').classList.toggle('active',v);
    $('reverse').setAttribute('aria-pressed',v);
    $('move').classList.toggle('active',!v);
    $('move').setAttribute('aria-pressed',!v)
  }
  function setLookPicking(value){
    if(lookPicking!==!!value&&pointers.size){clickStart=null;dragged=true;}
    lookPicking=!!value;
    $('lookDirection').classList.toggle('active',lookPicking);
    $('lookDirection').setAttribute('aria-pressed',lookPicking);
    wrap.classList.toggle('look-picking',lookPicking);
  }
  function setGuardPopup(value){
    guardPopupOpen=!!value&&!portraitBlocked&&!!selectedUnit();
    $('guardPopup').classList.toggle('open',guardPopupOpen);
    $('guardPopup').setAttribute('aria-hidden',String(!guardPopupOpen));
    $('guardMenu').setAttribute('aria-expanded',String(guardPopupOpen));
    $('guardMenu').classList.toggle('active',guardPopupOpen);
  }
  function toggleLookPicking(){
    if(portraitBlocked||!selectedUnit())return;
    setLookPicking(!lookPicking);
    if(lookPicking)setGuardPopup(false);
    toast(lookPicking?'지도에서 경계할 지점을 탭해줘 · Esc 취소':'지점 경계 입력 취소');
  }
  $('guardMenu').onclick=()=>{setLookPicking(false);setGuardPopup(!guardPopupOpen);};
  $('guardClose').onclick=()=>{setLookPicking(false);setGuardPopup(false);};
  for(const type of ['pointerdown','click'])$('guardPopup').addEventListener(type,e=>e.stopPropagation());
  $('guardPopup').addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();e.stopPropagation();setLookPicking(false);setGuardPopup(false);}},true);
  $('lookDirection').onclick=toggleLookPicking;
  $('lookResume').onclick=()=>{const u=selectedUnit();setLookPicking(false);setGuardPopup(false);if(u)C.resumeObservation(sim,u,$('lookChannel').value||'commander');updateUI();};
  $('lookChannel').onchange=()=>{setLookPicking(false);updateUI();};
  $('designateTarget').onclick=()=>{const u=selectedUnit();if(u&&targetId&&C.designate(sim,u,targetId)){toast('포수에게 지정 전달 · 자체 관측으로 확보 대기');updateUI();}};
  const zoneNames={hullFront:'차체 전',hullSide:'차체 측',hullRear:'차체 후',turretFront:'포탑 전',turretSide:'포탑 측',turretRear:'포탑 후',upper:'상부'};
  const fireReasons={'no-target':'표적 미확보','not-acquired':'포수 확보 대기',unidentified:'식별 대기','own-sight-lost':'포수 관측 상실',range:'사격 거리 밖',aligning:'포탑 정렬 중',reloading:'장전 중','selected-ammo-unavailable':'선택 탄종 없음','fcs-fault':'사통 대응 중','gunner-fault':'포수 관측 대응 중','out-of-ammo':'탄약 소진',disabled:'사격 장비 없음',destroyed:'격파 차량','target-unavailable':'표적 무효','no-presented-target':'보이는 표적 없음','not-ready':'조준 미완료',pending:'발사 처리 대기',cancelled:'지정 취소','fresh-sight-failed':'발사 시 시야 상실','fire-line-blocked':'발사선 차폐','fresh-alignment-failed':'발사 시 정렬 상실','must-stop':'정차·안정화 대기','movement-policy':'교전 정차 대기'};
  function fireSelected(){
    if(portraitBlocked)return;
    if(paused||document.hidden){toast('재생 중에 발사할 수 있음');return;}
    const u=selectedUnit();if(!u){toast('선택 가능한 차량이 없음');return;}
    if(!targetId){toast('관측 중인 표적을 먼저 탭해줘');return;}
    const r=C.requestFire(sim,u,targetId);toast(r.ok?'단발 발사 입력':fireReasons[r.reason]||'현재 표적에 발사할 수 없음');updateUI();
  }
  $('fire').onclick=fireSelected;
  $('cancelDesignation').onclick=()=>{const u=selectedUnit();if(u)C.cancelDesignation(sim,u);updateUI();};
  $('fireMode').onclick=()=>{const u=selectedUnit();if(!u)return;const next=C.fireStatus(sim,u).mode==='auto'?'hold':'auto';C.fireMode(sim,u,next);toast(next==='auto'?'자동 사격 허용':'자동 사격 보류 · 수동 단발 가능');updateUI();};
  $('ammoSelect').onchange=()=>{const u=selectedUnit();if(u&&C.ammoPreference(sim,u,$('ammoSelect').value))toast($('ammoSelect').value==='auto'?'다음 탄종 자동 선택':'다음 탄종 '+$('ammoSelect').value);updateUI();};
  for(const type of ['pointerdown','click'])document.querySelector('.sidebar').addEventListener(type,e=>e.stopPropagation());
  function select(id){
    if(portraitBlocked)return false;
    const candidate=sim.units.find(u=>u.id===id&&u.team==='blue'&&alive(u));if(!candidate)return false;
    setLookPicking(false);
    setGuardPopup(false);
    visibilityClient.cancel();sightRevision++;visibility=null;visibilityPath=null;visOrigin=null;
    selected=id;
    $('unitSelect').value=id;
    targetId=null;
    visibilityDirty=true;
    updateUI();
    return true;
  }
  function moveTo(p){
    const u=selectedUnit();
    if(!u)return;
    const r=C.issueMove(u,p,reverseMode,sim.units);
    if(!r.ok){
      toast(r.reason);
      return
    }
    toast((reverseMode?'후진':'이동')+' 경로 지정 · '+Math.round(C.routeDistance(u))+'m');
    updateUI()
  }
  function setSight(v){
    if(v&&!selectedUnit())v=false;
    sightHeld=!!v;
    wrap.classList.toggle('sight-on',sightHeld);
    $('sight').classList.toggle('holding',sightHeld);
    $('sight').setAttribute('aria-pressed',sightHeld);
    const u=selectedUnit();if(v&&(!visibility||!visOrigin||Math.hypot(u.x-visOrigin.x,u.y-visOrigin.y)>=1))visibilityDirty=true
  }
  function releaseSight(){
    sightPointer=null;
    sightKey=false;
    setSight(false)
  }
  const sightButton=$('sight');
  sightButton.addEventListener('pointerdown',e=>{
    e.preventDefault();
    sightPointer=e.pointerId;
    sightButton.setPointerCapture(e.pointerId);
    setSight(true)
  }
  );
  for(const type of ['pointerup','pointercancel','lostpointercapture'])sightButton.addEventListener(type,e=>{
    if(sightPointer===e.pointerId){
      sightPointer=null;
      setSight(sightKey)
    }
  }
  );
  sightButton.addEventListener('contextmenu',e=>e.preventDefault());
  sightButton.addEventListener('keydown',e=>{
    if(e.code==='Space'||e.code==='Enter'){
      e.preventDefault();
      sightKey=true;
      setSight(true)
    }
  }
  );
  sightButton.addEventListener('keyup',e=>{
    if(e.code==='Space'||e.code==='Enter'){
      sightKey=false;
      setSight(sightPointer!==null)
    }
  }
  );
  function tap(sx,sy){
    if(portraitBlocked)return;
    const p=toWorld(sx,sy);
    if(lookPicking){
      const u=selectedUnit();if(!u){setLookPicking(false);return;}const dx=p.x-u.x,dy=p.y-u.y;
      if(Math.hypot(dx,dy)<1e-6){toast('전차 중심에서 떨어진 방향을 탭해줘');return;}
      const duration=Number($('lookDuration').value)||0;
      if(!C.guard(sim,u,$('lookChannel').value||'commander',p,duration)){toast('해당 장비는 독립 경계를 지원하지 않음');return;}
      setLookPicking(false);
      updateUI();
      toast((duration?duration+'초':'해제까지')+' 지정 지점 경계');
      return;
    }
    let best=null,bd=Infinity;
    for(const u of [...sim.units.filter(v=>v.team==='blue'&&alive(v)),...C.contacts(sim).filter(v=>!v.wreck)]){
      const q=toScreen(u.x,u.y),d=Math.hypot(q.x-sx,q.y-sy);
      const model=u.model||C.profileOf(u).model,dx=(sx-q.x)/camera.zoom,dy=(sy-q.y)/camera.zoom,c=Math.cos(u.heading),s=Math.sin(u.heading);
      const onHull=Math.abs(dx*c+dy*s)<=model.hullLength/2&&Math.abs(-dx*s+dy*c)<=model.width/2;
      if((d<24||onHull)&&d<bd){
        bd=d;
        best=u
      }
    }
    if(best){
      if(best.team==='blue')select(best.id);
      else{
        targetId=best.key;
        toast(best.label+(best.memory?' · 마지막 관측 기억':''));
        updateUI()
      }
      return
    }
    if(p.x>=0&&p.y>=0&&p.x<=C.WORLD.w&&p.y<=C.WORLD.h)moveTo(p)
  }
  function localPoint(e){
    const r=canvas.getBoundingClientRect();
    return {
      x:e.clientX-r.left,y:e.clientY-r.top
    }
  }
  canvas.addEventListener('pointerdown',e=>{
    if(portraitBlocked)return;
    if(e.button!==0&&e.pointerType==='mouse')return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    const p=localPoint(e);
    pointers.set(e.pointerId,p);
    if(pointers.size===1){
      clickStart={
        ...p,id:e.pointerId,cx:camera.x,cy:camera.y
      }
      ;
      dragged=false;
      gesture=null
    }
    else if(pointers.size===2){
      dragged=true;
      const a=[...pointers.values()];
      gesture={
        distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),mid:{
          x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2
        }
      }
    }
  }
  );
  canvas.addEventListener('pointermove',e=>{
    const p=localPoint(e),world=toWorld(p.x,p.y);
    $('coords').textContent='X '+Math.round(world.x)+' · Y '+Math.round(world.y);
    if(!pointers.has(e.pointerId))return;
    e.preventDefault();
    pointers.set(e.pointerId,p);
    if(pointers.size===2&&gesture){
      const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),mid={
        x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2
      }
      ;
      if(d>5&&gesture.distance>5)zoomAt(d/gesture.distance,gesture.mid.x,gesture.mid.y);
      camera.x-=(mid.x-gesture.mid.x)/camera.zoom;
      camera.y-=(mid.y-gesture.mid.y)/camera.zoom;
      clampCamera();
      gesture={
        distance:d,mid
      }
    }
    else if(pointers.size===1&&clickStart){
      const dx=p.x-clickStart.x,dy=p.y-clickStart.y;
      if(Math.hypot(dx,dy)>7)dragged=true;
      if(dragged){
        camera.x=clickStart.cx-dx/camera.zoom;
        camera.y=clickStart.cy-dy/camera.zoom;
        clampCamera()
      }
    }
  }
  );
  function endPointer(e){
    if(!pointers.has(e.pointerId))return;
    const p=localPoint(e),wasOnly=pointers.size===1;
    if(e.type==='pointerup'&&wasOnly&&!dragged&&clickStart)tap(p.x,p.y);
    pointers.delete(e.pointerId);
    gesture=null;
    clickStart=null;
    if(pointers.size)dragged=true
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,endPointer);
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    const p=localPoint(e);
    zoomAt(Math.exp(-e.deltaY*.0015),p.x,p.y)
  }
  ,{
    passive:false
  }
  );
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  $('move').onclick=()=>{
    setLookPicking(false);
    setGuardPopup(false);
    setReverse(false);
    toast('이동할 지면을 탭해줘')
  }
  ;
  $('reverse').onclick=()=>{
    setLookPicking(false);
    setGuardPopup(false);
    setReverse(!reverseMode);
    toast(reverseMode?'후진할 지면을 탭해줘':'전진 이동 모드')
  }
  ;
  $('stop').onclick=()=>{
    const u=selectedUnit();if(!u)return;C.stop(u);
    toast('정지 명령');
    updateUI()
  }
  ;
  $('zoomIn').onclick=()=>zoomAt(1.35);
  $('zoomOut').onclick=()=>zoomAt(1/1.35);
  $('fit').onclick=()=>fitCamera();
  $('terrainMode').onclick=()=>{
    terrainMode=!terrainMode;
    $('terrainMode').classList.toggle('active',terrainMode);
    $('terrainMode').setAttribute('aria-pressed',String(terrainMode));
    $('terrainLegend').hidden=!terrainMode;
    wrap.classList.toggle('terrain-emphasis',terrainMode);
    toast(terrainMode?'지형 강조 · 능선과 골짜기 표시':'일반 지도');
  };
  $('contours').onclick=()=>{
    showContours=!showContours;
    $('contours').classList.toggle('active',showContours);
    $('contours').setAttribute('aria-pressed',showContours);
    $('contourLegend').hidden=!showContours
  }
  ;
  function setPaused(v){
    paused=v;
    $('app').classList.toggle('paused',v);
    $('pause').textContent=v?'▶':'Ⅱ';
    $('pause').setAttribute('aria-label',v?'재생':'일시정지');
    $('pause').classList.toggle('active',v);
    accumulator=0
  }
  const orientationMedia=window.matchMedia?window.matchMedia('(orientation: portrait)'):null;
  const isPortrait=()=>orientationMedia?orientationMedia.matches:Number.isFinite(window.innerWidth)&&Number.isFinite(window.innerHeight)&&window.innerHeight>window.innerWidth;
  function syncOrientation(){
    const next=isPortrait();
    if(next===portraitBlocked)return;
    if(next){
      portraitPausedBefore=paused;portraitBlocked=true;
      releaseSight();setLookPicking(false);setGuardPopup(false);pointers.clear();gesture=null;clickStart=null;dragged=false;accumulator=0;
      setPaused(true);
    }else{
      portraitBlocked=false;
      setPaused(portraitPausedBefore);
    }
    $('orientationBlock').setAttribute('aria-hidden',String(!portraitBlocked));
    document.body?.classList.toggle('portrait-blocked',portraitBlocked);
    last=performance.now();
  }
  if(orientationMedia?.addEventListener)orientationMedia.addEventListener('change',()=>{syncOrientation();setTimeout(()=>resize(),0);});
  else if(orientationMedia?.addListener)orientationMedia.addListener(()=>{syncOrientation();setTimeout(()=>resize(),0);});
  $('pause').onclick=()=>setPaused(!paused);
  $('speed').onclick=()=>{
    timeScale=timeScale===1?2:1;
    $('speed').textContent=timeScale+'×'
  }
  ;
  async function toggleFullscreen(){
    try{
      if(document.fullscreenElement){
        await document.exitFullscreen();
        return
      }
      if(document.documentElement.requestFullscreen){
        await document.documentElement.requestFullscreen();
        try{
          await screen.orientation?.lock?.('landscape')
        }
        catch{
        }
        return
      }
      throw Error('unsupported')
    }
    catch{
      const app=$('app');
      app.classList.toggle('focus-mode');
      toast(app.classList.contains('focus-mode')?'브라우저 전체화면 대신 지도 집중 모드로 전환함':'지도 집중 모드 해제');
      setTimeout(()=>resize(),80)
    }
  }
  $('fullscreen').onclick=toggleFullscreen;
  document.addEventListener('fullscreenchange',()=>{
    releaseSight();
    setLookPicking(false);
    $('fullscreen').classList.toggle('active',!!document.fullscreenElement);
    setTimeout(()=>resize(),80)
  }
  );
  $('reset').onclick=()=>{
    setLookPicking(false);
    setGuardPopup(false);
    visibilityClient.cancel();sightRevision++;visibility=null;visibilityPath=null;visOrigin=null;
    sim=C.createScenario();
    effectRenderer.reset();
    selected='A11';
    targetId=null;
    trails.length=0;
    setPaused(false);
    setReverse(false);
    releaseSight();
    timeScale=1;
    $('speed').textContent='1×';
    visibilityDirty=true;
    fitCamera();
    updateUI();
    toast('시험장을 초기 상태로 되돌렸음')
  }
  ;
  window.addEventListener('keydown',e=>{
    if(portraitBlocked){e.preventDefault();return;}
    if(e.code==='Escape'){if(lookPicking)setLookPicking(false);else setGuardPopup(false);return;}
    if(['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName)||e.target?.isContentEditable)return;
    if(e.code==='KeyL'&&!e.repeat){e.preventDefault();toggleLookPicking();return;}
    if(e.target instanceof HTMLButtonElement&&['Space','Enter'].includes(e.code))return;
    if(e.code==='KeyV'){
      e.preventDefault();
      sightKey=true;
      setSight(true)
    }
    else if(!e.repeat){
      if(e.code==='Space'){
        e.preventDefault();
        setPaused(!paused)
      }
      if(e.code==='KeyR'){setLookPicking(false);setReverse(!reverseMode);}
      if(e.code==='KeyX'){const u=selectedUnit();if(u)C.stop(u);}
      if(e.code==='KeyG'){e.preventDefault();fireSelected();}
      if(e.code==='KeyF')toggleFullscreen();
      if(e.code==='Home')fitCamera()
    }
  }
  );
  window.addEventListener('keyup',e=>{
    if(portraitBlocked)return;
    if(e.code==='KeyV'){
      sightKey=false;
      setSight(sightPointer!==null)
    }
  }
  );
  window.addEventListener('blur',()=>{
    releaseSight();
    setLookPicking(false);
    setGuardPopup(false);
    pointers.clear();
    clickStart=null;
    gesture=null;
    accumulator=0;
    last=performance.now()
  }
  );
  document.addEventListener('visibilitychange',()=>{
    releaseSight();
    setLookPicking(false);
    setGuardPopup(false);
    pointers.clear();
    clickStart=null;
    gesture=null;
    accumulator=0;
    last=performance.now()
  }
  );
  window.addEventListener('resize',()=>{syncOrientation();resize();});
  new ResizeObserver(()=>resize()).observe(wrap);
  function updateVisibility(now){
    const u=selectedUnit();
    if(!sightHeld||!u)return;
    if(visibilityClient.pending)return;
    if(!visibilityDirty&&now-visLast<350)return;
    if(!visibilityDirty&&visOrigin&&Math.hypot(u.x-visOrigin.x,u.y-visOrigin.y)<1)return;
    const revision=sightRevision,id=u.id,origin={x:u.x,y:u.y};
    $('sightNote').textContent=visibility?'시야 갱신 중…':'시야 확인 중…';
    visLast=now;visibilityDirty=false;
    visibilityClient.request(u).then(result=>{
      if(!result||revision!==sightRevision||selected!==id)return;
      visibility=result;visibilityPath=new Path2D();
      for(const ring of visibility.loops){ring.forEach(([x,y],i)=>i?visibilityPath.lineTo(x,y):visibilityPath.moveTo(x,y));visibilityPath.closePath();}
      visOrigin=origin;$('sightNote').textContent=sightDescription;
    }).catch(()=>{visibilityDirty=true;$('sightNote').textContent='시야를 다시 확인해줘';releaseSight();});
  }
  function drawVisibility(){
    if(!visibility||!visibilityPath||!selectedUnit())return;
    const u=visibility.origin,r=visibility.range,vehicle=selectedUnit(),sensors=C.profileOf(vehicle).sensors;
    ctx.save();ctx.translate(camera.w/2-camera.x*camera.zoom,camera.h/2-camera.y*camera.zoom);ctx.scale(camera.zoom,camera.zoom);
    const sectors=new Path2D();
    for(const ch of ['ambient','commander','gunner']){
      const e=sensors[ch];if(!e.enabled)continue;
      const angle=ch==='ambient'?0:ch==='commander'?vehicle.commander:vehicle.turret;
      sectors.moveTo(vehicle.x,vehicle.y);sectors.arc(vehicle.x,vehicle.y,e.range,angle-e.fov/2,angle+e.fov/2);sectors.closePath();
    }
    ctx.clip(sectors);
    const outer=new Path2D();outer.rect(0,0,C.WORLD.w,C.WORLD.h);outer.moveTo(u.x+r,u.y);outer.arc(u.x,u.y,r,0,Math.PI*2);
    ctx.fillStyle='#0916137a';ctx.fill(outer,'evenodd');
    const hidden=new Path2D();hidden.arc(u.x,u.y,r,0,Math.PI*2);hidden.addPath(visibilityPath);
    ctx.fillStyle='#683c2d75';ctx.fill(hidden,'evenodd');
    ctx.fillStyle='#58ddb32e';ctx.fill(visibilityPath,'evenodd');
    ctx.strokeStyle='#bcf2cc9c';ctx.lineWidth=1/camera.zoom;ctx.stroke(visibilityPath);
    ctx.setLineDash([7/camera.zoom,5/camera.zoom]);ctx.beginPath();ctx.arc(u.x,u.y,r,0,Math.PI*2);ctx.strokeStyle='#d6edc580';ctx.stroke();ctx.restore();
    const p=toScreen(vehicle.x,vehicle.y);
    for(const ch of ['ambient','commander','gunner']){const e=sensors[ch];if(!e.enabled)continue;const angle=ch==='ambient'?0:ch==='commander'?vehicle.commander:vehicle.turret;
      ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle=ch==='commander'?'#93e9f0':ch==='gunner'?'#f4dc88':'#d7ead0';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,e.range*camera.zoom,angle-e.fov/2,angle+e.fov/2);ctx.closePath();ctx.stroke();ctx.restore();}

  }
  function updateUI(){
    let u=selectedUnit();
    if(!u&&selected){
      selected=null;targetId=null;
      visibilityClient.cancel();sightRevision++;visibility=null;visibilityPath=null;visOrigin=null;releaseSight();
    }
    const friendlies=sim.units.filter(v=>v.team==='blue'),living=friendlies.filter(alive);
    for(const option of $('unitSelect').children){const unit=friendlies.find(v=>v.id===option.value);option.disabled=!alive(unit);option.textContent=unit?unit.name+' · '+unit.state+' · '+Math.round(unit.speed*3.6)+' km/h':option.textContent;}
    $('unitSelect').value=u?.id??'';
    if(!u){
      for(const id of ['move','reverse','stop','sight','fire','guardMenu','lookChannel','lookDirection','lookResume','designateTarget','cancelDesignation','fireMode','ammoSelect'])$(id).disabled=true;
      ui.setText($('unitName'),'선택 차량 없음');ui.setText($('unitType'),living.length?'위 선택 메뉴에서 아군을 선택':'아군 차량 전멸');ui.setText($('velocity'),'0');ui.setText($('motionState'),'—');
      ui.setText($('combatSummary'),living.length?'명령 대기':'생존 아군 없음');ui.setText($('fireState'),'');ui.setText($('readinessState'),'');ui.setText($('flightState'),'');ui.setText($('lookStatus'),'');ui.setText($('designationStatus'),'');ui.setText($('ammoTotal'),'—');ui.setText($('ammoLoaded'),'');ui.setText($('ammoTask'),'');ui.setHTML($('ammoInventory'),'');ui.setText($('faultStatus'),'');ui.setText($('crewStatus'),'');
      ui.setText($('elevation'),'—');ui.setText($('slope'),'—');ui.setText($('heading'),'—');ui.setText($('surface'),'—');ui.setHTML($('routeInfo'),'<strong>아군 전멸</strong> · 지도 이동·확대·초기화는 계속 사용할 수 있음');
      $('targetPanel').classList.toggle('visible',false);return;
    }
    const combat=C.combatView(u),destroyed=combat?.status==='destroyed';
    const firing=C.fireStatus(sim,u,targetId),fireText=firing.status==='ready'?'조준 완료':firing.status==='aiming'?'조준 '+Math.round(firing.aimProgress*100)+'%':fireReasons[firing.reason]||'표적 미확보';
    ui.setText($('fireState'),(firing.mode==='auto'?'자동':'보류')+' · '+fireText+' · 총 '+firing.ammo+'발');
    const load=firing.loading,fcsFault=firing.faults.fireControl,observationFaults=[firing.faults.commander,firing.faults.gunner].filter(v=>v.active),observationRemaining=observationFaults.length?Math.max(...observationFaults.map(v=>v.remaining)):0;
    const faultText=[fcsFault.active?'사통 이상 '+fcsFault.remaining.toFixed(1)+'초':'',observationFaults.length?'관측장비 불안정 · 조준 저하 '+observationRemaining.toFixed(1)+'초':''].filter(Boolean).join(' / ');
    const loadText=load.loaded?'장전 '+(load.ammoId||'1발'):firing.reason==='selected-ammo-unavailable'?'선택 탄종 없음':load.estimatedSeconds===null?'장전할 탄 없음':(load.stage==='prepare'?'탄 준비 ':'장전 ')+Math.round(load.progress*100)+'% · 예상 '+Math.max(.1,load.estimatedSeconds).toFixed(1)+'초';
    const reactions=combat?.reactions,reactionStatus=reactions?reactionText(u):'';
    ui.setText($('readinessState'),loadText+(load.fatigueSeconds>.005?' · 피로 +'+load.fatigueSeconds.toFixed(2)+'초':'')+(load.shockSeconds>.005?' · 동요 +'+load.shockSeconds.toFixed(2)+'초':'')+(faultText?' · '+faultText:'')+(reactionStatus?' · '+reactionStatus:''));
    ui.setText($('fireMode'),firing.mode==='auto'?'자동':'보류');$('fireMode').setAttribute('aria-pressed',String(firing.mode==='auto'));$('fireMode').classList.toggle('active',firing.mode==='auto');
    const activeFlight=firing.inFlight[0];ui.setText($('flightState'),activeFlight?'비행 중'+(firing.inFlight.length>1?' '+firing.inFlight.length+'발':'')+' · 착탄까지 '+activeFlight.remaining.toFixed(1)+'초':firing.lastShot?.result==='unobserved'?'최근 단발: 결과 미확인':'');
    $('fire').disabled=paused||destroyed||!targetId||!firing.canFire;
    $('fire').setAttribute('aria-disabled',String($('fire').disabled));
    const guardLabel=channel=>{const view=lookView(channel),bearing=view.direction===null?null:((Math.round(view.direction*180/Math.PI)+90)%360+360)%360;return view.mode==='fixed'?bearing+'° '+(view.remaining===null?'· 해제까지':'· '+Math.ceil(view.remaining)+'초'):'자동';};
    const vehicle=C.profileOf(u);ui.setText($('unitName'),u.name);ui.setText($('unitType'),vehicle.name+' · '+vehicle.weapons.mainGun.calibreMm+'mm '+vehicle.weapons.mainGun.name);
    ui.setText($('velocity'),Math.round(u.speed*3.6));
    ui.setText($('motionState'),u.state);
    ui.setText($('combatSummary'),combat?'HP '+Math.round(combat.hp).toLocaleString()+' / '+Math.round(combat.maxHp).toLocaleString()+' · '+(destroyed?'격파':'생존'):'피해 모델 비활성');
    $('combatSummary').classList.toggle('destroyed',destroyed);
    for(const id of ['move','reverse','stop','sight','guardMenu','lookChannel','lookDirection','lookResume','designateTarget','cancelDesignation','fireMode','ammoSelect'])$(id).disabled=destroyed;
    const ammunition=firing.ammunition,sectionNames={ready:'즉응',semiReady:'준즉응',reserve:'예비'},taskNames={prepare:'탄 준비',reload:'장전',replenish:'즉응탄 보충'};
    if(ammunition){
      $('ammoSelect').value=ammunition.preference;ui.setText($('ammoTotal'),ammunition.total+'발');ui.setText($('ammoLoaded'),'장전탄 '+(ammunition.loadedAmmoId||'없음')+' · 다음 '+(ammunition.preference==='auto'?'자동':ammunition.preference));
      const task=ammunition.task,taskTime=task&&!task.paused?' · '+Math.max(1,Math.ceil(task.remaining||0))+'초':task?' · 대기':'';
      ui.setText($('ammoTask'),task?(taskNames[task.stage]||taskNames[task.purpose])+' · '+task.ammoId+' / '+sectionNames[task.source]+taskTime:'작업 없음');
      ui.setHTML($('ammoInventory'),Object.entries(ammunition.sections).map(([section,value])=>'<tr><th>'+sectionNames[section]+' '+value.total+'/'+value.capacity+'</th>'+ammunition.supported.map(id=>'<td>'+value.counts[id]+'</td>').join('')+'</tr>').join(''));
    }else{ui.setText($('ammoTotal'),firing.ammo+'발');ui.setText($('ammoLoaded'),load.loaded?'장전탄 1':'장전탄 없음');ui.setText($('ammoTask'),load.loaded?'작업 없음':'장전 중');ui.setHTML($('ammoInventory'),'');}
    const reaction=combat?.reactions,faultLines=[fcsFault.active?'사통 이상 '+Math.max(1,Math.ceil(fcsFault.remaining))+'초':'',reaction?.faults.mobility.active?'기동계 이상 '+Math.max(1,Math.ceil(reaction.faults.mobility.remaining))+'초':'',reaction?.faults.turretDrive.active?'포탑 구동 이상 '+Math.max(1,Math.ceil(reaction.faults.turretDrive.remaining))+'초':'',observationFaults.length?'관측장비 불안정 '+Math.max(1,Math.ceil(observationRemaining))+'초':''].filter(Boolean);
    ui.setText($('faultStatus'),faultLines.length?faultLines.join(' · '):'활성 일시 이상 없음');ui.setText($('crewStatus'),reaction?Object.entries(reaction.crew).map(([role,status])=>crewNames[role]+' '+severityNames[status]).join(' · '):'승무원 상태 비활성');
    ui.setText($('elevation'),C.heightAt(u.x,u.y).toFixed(1)+' m');
    ui.setText($('slope'),(Math.atan(C.slopeAt(u.x,u.y))*180/Math.PI).toFixed(1)+'°');
    ui.setText($('heading'),((Math.round(u.heading*180/Math.PI)+90)%360+360)%360+'°');
    ui.setText($('surface'),({
      grass:'초지',field:'농경지',settlement:'취락',scrub:'관목지',stream:'실개천',road:'도로',forest:'숲',bridge:'교량',water:'수역',obstacle:'건물'
    }
    )[C.surfaceAt(u.x,u.y)]);
    const dist=C.routeDistance(u);
    const drive=C.mobilityView(u),driveText='<strong>'+drive.gear+'</strong> · '+drive.actual+(!drive.requestMatches?' · 요청 '+drive.requested:'');
    ui.setHTML($('routeInfo'),destroyed?'<strong>격파</strong> · 잔해는 차량 통행을 막음':u.path.length?'<strong>'+(u.reverse?'후진':'이동')+' 경로</strong> · 남은 거리 '+Math.round(dist)+'m · '+driveText:'지면을 탭해서 <strong>이동 경로</strong>를 지정해봐. · '+driveText);
    ui.setText($('clock'),'T+ '+String(Math.floor(sim.time/60)).padStart(2,'0')+':'+String(Math.floor(sim.time%60)).padStart(2,'0'));
    ui.setText($('simState'),paused?'일시정지':'기동·관측·사격 시험');
    const own=C.ownObservation(sim,u),d=own,status={idle:'없음',designated:'지정 전달',waiting:'확보 대기',acquiring:'포수 확인 중',acquired:'포수 확보',expired:'지정 만료',cancelled:'지정 취소',lost:'표적 유지 해제'};
    ui.setText($('lookStatus'),'전차장 '+guardLabel('commander')+' · 포수 '+guardLabel('gunner')+' · 후보 '+own.pending);
    ui.setText($('designationStatus'),(d.source==='gunner'?'포수 자체 · ':d.source==='commander'?'전차장 인계 · ':d.source==='manual'?'직접 지정 · ':d.source==='ai'?'자동 인계 · ':'')+(status[d.status]||d.status)+(d.reason==='range'?' · 포수 거리 밖':''));
    let target=C.contacts(sim).find(v=>v.key===targetId);if(target?.wreck){targetId=null;target=null;}
    $('targetPanel').classList.toggle('visible',!!target);
    if(target){
      $('designateTarget').disabled=destroyed||!!target.wreck;
      ui.setText($('targetTitle'),target.label);
      const ownTarget=C.ownObservation(sim,u,target.key),channelNames={ambient:'주변',commander:'전차장',gunner:'포수'};
      ui.setText($('targetOwnStatus'),'팀 '+(target.current?'관측':'기억')+' · 선택 차량 '+(ownTarget.current?ownTarget.channels.map(ch=>channelNames[ch]).join('/'):'자체 관측 없음')+' · '+(ownTarget.acquired?'포수 확보':'포수 미확보'));
      const publicHp=target.identified&&target.combat?' · '+(target.memory?'마지막 확인 ':'')+'HP '+Math.round(target.combat.hp).toLocaleString()+' / '+Math.round(target.combat.maxHp).toLocaleString():'';
      ui.setText($('targetDetails'),target.wreck?'관측된 격파 잔해 · '+target.type:target.memory?'마지막 관측 '+target.age.toFixed(1)+'초 전 · '+(target.identified?target.type+publicHp:'미식별 표적'):target.identified?target.type+publicHp:'미식별 표적 · 상세정보 없음');
      const fc=C.fireStatus(sim,u,target.key);
      const probabilities=fc.zoneProbabilities;
      const b=fc.breakdown,rects=b?.rects||[],w=rects.length?Math.max(...rects.map(r=>r.x2))-Math.min(...rects.map(r=>r.x1)):0,h=rects.length?Math.max(...rects.map(r=>r.z2))-Math.min(...rects.map(r=>r.z1)):0;
      ui.setText($('fireDetails'),target.identified&&target.current&&b?'예상 명중 '+Math.round(fc.hitChance*100)+'% (발사 시) · 오차 '+Math.max(b.sigma.x,b.sigma.z).toFixed(2)+'밀 · 표적 '+w.toFixed(1)+'×'+h.toFixed(1)+'m · 명중 시: '+Object.entries(probabilities).filter(([,v])=>v>.001).map(([z,v])=>zoneNames[z]+' '+Math.round(v*100)+'%').join(' / '):'');
      const lastShot=target.identified&&target.current&&fc.lastShot?.targetKey===target.key?fc.lastShot:null,impactKind={ground:'지면',building:'건물','out-of-map':'지도 밖','max-distance':'최대 거리'},missText=lastShot?.impact?(lastShot.impact.beyond>=0?'표적 너머 ':'표적 앞 ')+Math.round(Math.abs(lastShot.impact.beyond))+'m '+(impactKind[lastShot.impact.kind]||lastShot.impact.kind):'탄착점 없음';
      const hitDamage=lastShot?.combat,lastDamage=hitDamage?(hitDamage.ricochet?'도탄 · 피해 0':hitDamage.penetrated?'관통 · 피해 '+Math.round(hitDamage.damage)+(hitDamage.destroyed?' · 격파':' · HP '+Math.round(hitDamage.hpAfter)):hitDamage.damage>0?'근접 비관통 · 피해 '+Math.round(hitDamage.damage)+(hitDamage.destroyed?' · 격파':' · HP '+Math.round(hitDamage.hpAfter)):'비관통 · 피해 0'):'';
      ui.setText($('shotDetails'),lastShot?'최근 단발: '+(lastShot.result==='unobserved'?'결과 미확인':lastShot.result==='hit'?'명중 · '+zoneNames[lastShot.zone]+(lastShot.side?'('+({right:'우',left:'좌'})[lastShot.side]+')':'')+(lastDamage?' · '+lastDamage:''):'빗나감 · '+missText):'');
      $('targetExposure').style.display=target.identified&&target.current?'':'none';
      for(const part of ['hull','turret']){
        const value=target.identified&&target.current?Math.round((target.exposure?.[part]||0)*100)+'%':'—';
        $(part+'Bar').style.width=value==='—'?'0%':value;ui.setText($(part+'Value'),value);
      }
    }else targetId=null;
  }
  for(const u of sim.units.filter(u=>u.team==='blue')){const option=document.createElement('option');option.value=u.id;option.textContent=u.name;$('unitSelect').appendChild(option);}
  $('unitSelect').value=selected;$('unitSelect').onchange=()=>{if(select($('unitSelect').value)){const u=selectedUnit();camera.x=u.x;camera.y=u.y;camera.zoom=Math.max(camera.zoom,3);clampCamera();}};
  function activeUnitStatus(u){
    const state=u.fireControl||{},seconds=until=>Math.max(1,Math.ceil(until-sim.time)),lines=[];
    if((state.faultUntil?.fireControl||0)>sim.time)lines.push('사통 이상 '+seconds(state.faultUntil.fireControl)+'초');
    const reactions=C.combatView(u)?.reactions,drive=[];if(reactions?.faults.mobility.active)drive.push('기동계 '+Math.max(1,Math.ceil(reactions.faults.mobility.remaining))+'초');if(reactions?.faults.turretDrive.active)drive.push('포탑 '+Math.max(1,Math.ceil(reactions.faults.turretDrive.remaining))+'초');if(drive.length)lines.push(drive.join(' · '));
    const observationUntil=Math.max(state.faultUntil?.commander||0,state.faultUntil?.gunner||0);if(observationUntil>sim.time)lines.push('관측 불안정 '+seconds(observationUntil)+'초');
    const task=state.ammunition?.task;if(task?.stage==='prepare')lines.push('탄 준비 '+task.ammoId+' · '+Math.max(1,Math.ceil((1-task.progress)*(C.profileOf(u).ammunition.sections[task.source].prepareSeconds/(u.hitReactionModifiers?.loaderEfficiency||1))))+'초');else if(task?.purpose==='replenish')lines.push(task.paused?'즉응탄 보충 대기':'즉응탄 보충 '+task.ammoId+' · '+Math.max(1,Math.ceil((1-task.progress)*(C.profileOf(u).ammunition.replenish.seconds[task.source]/(u.hitReactionModifiers?.loaderEfficiency||1))))+'초');
    return lines.slice(0,2);
  }
  function drawTank(u){
    const p=toScreen(u.x,u.y),isSelected=u.id===selected,enemy=u.team==='red',z=camera.zoom,destroyed=u.destroyed||u.wreck||u.combat?.status==='destroyed';
    const model=u.model||C.profileOf(u).model,half=model.hullLength/2,width=model.width,ring=Math.max(15,Math.hypot(half,width/2)*z+6);
    const margin=(model.barrelTip+.5)*z+30;
    if(p.x < -margin || p.y < -margin || p.x > camera.w+margin || p.y > camera.h+margin)return;
    const unknown=enemy&&!u.identified;
    ctx.save();
    if(u.memory)ctx.globalAlpha=Math.max(.12,.45*(1-u.age/30));
    ctx.translate(p.x,p.y);
    if(isSelected){
      ctx.strokeStyle='#e0edb5';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(0,0,ring,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#e0edb5';ctx.beginPath();ctx.moveTo(0,-ring-3);ctx.lineTo(-4,-ring-9);ctx.lineTo(4,-ring-9);ctx.fill();
    }
    if(u.key&&u.key===targetId){ctx.strokeStyle='#ffd19b';ctx.lineWidth=1.5;ctx.strokeRect(-ring,-ring,ring*2,ring*2);}
    const artId=enemy?'M1A2':C.profileOf(u).artId;
    if(destroyed)ctx.globalAlpha=Math.min(ctx.globalAlpha,.58);
    ({M1A2:M1A2Art})[artId].draw(ctx,u,z,model,{silhouette:unknown||destroyed});
    if(destroyed){ctx.globalAlpha=1;ctx.strokeStyle='#e09572';ctx.lineWidth=2;const d=Math.max(8,ring*.55);ctx.beginPath();ctx.moveTo(-d,-d);ctx.lineTo(d,d);ctx.moveTo(d,-d);ctx.lineTo(-d,d);ctx.stroke();}
    if(!enemy&&isSelected){
      ctx.save();ctx.rotate(u.commander);ctx.strokeStyle='#93e9f0';ctx.fillStyle='#93e9f0';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(ring+3,0);ctx.lineTo(ring+19,0);ctx.stroke();
      ctx.beginPath();ctx.moveTo(ring+24,0);ctx.lineTo(ring+16,-4);ctx.lineTo(ring+16,4);ctx.closePath();ctx.fill();ctx.restore();
    }
    if(z<1){ctx.fillStyle=unknown?'#050505':enemy?'#eab17c':'#a5e1c5';ctx.strokeStyle='#253c30';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,2.5,0,Math.PI*2);ctx.fill();ctx.stroke();}
    ctx.font='600 10px ui-monospace,monospace';ctx.textAlign='center';
    const text=enemy?(u.identified?u.label+' · '+u.type+(u.memory?' · 기억':''):'미식별 표적'):u.name+(destroyed?' · 격파':''),tw=ctx.measureText(text).width,labelY=-ring-43;
    ctx.fillStyle='#12271fe8';ctx.fillRect(-tw/2-5,labelY,tw+10,16);ctx.fillStyle=enemy?'#f0bd86':'#e3edcc';ctx.fillText(text,0,labelY+11);
    const health=!destroyed&&(!enemy||u.identified)?u.combat:null;
    if(health&&Number.isFinite(health.hp)&&Number.isFinite(health.maxHp)&&health.maxHp>0){
      const bw=Math.max(44,Math.min(84,tw+10)),ratio=C.clamp(health.hp/health.maxHp,0,1),barY=labelY+18;
      ctx.fillStyle='#0b1512df';ctx.fillRect(-bw/2-1,barY-1,bw+2,6);ctx.fillStyle=ratio>.55?'#8fc879':ratio>.25?'#d6b96c':'#d77862';ctx.fillRect(-bw/2,barY,bw*ratio,4);ctx.strokeStyle='#b8c5ad88';ctx.lineWidth=1;ctx.strokeRect(-bw/2-.5,barY-.5,bw+1,5);
    }
    if(!enemy&&!destroyed){const lines=activeUnitStatus(u);if(lines.length){const right=p.x+ring+142<camera.w,x=right?ring+8:-ring-8;ctx.textAlign=right?'left':'right';ctx.font='600 9px ui-monospace,monospace';for(let i=0;i<lines.length;i++){const y=-5+i*13,w=ctx.measureText(lines[i]).width;ctx.fillStyle='#101b18e8';ctx.fillRect(right?x-3:x-w-3,y-9,w+6,12);ctx.fillStyle='#f0c987';ctx.fillText(lines[i],x,y);}}}
    ctx.restore();
  }
  function drawShots(){
    effectRenderer.sync(C.effectEvents(sim,sim.time-4),sim.time);
    if(effectsEnabled)effectRenderer.draw(ctx,sim.time,toScreen,camera.zoom,{quality:effectQuality,reducedMotion:reducedMotionOverride??!!reducedMotionMedia?.matches});else effectRenderer.advance(sim.time);
  }
  function drawRoute(u){
    if(!u.path.length)return;
    const selectedRoute=u.id===selected;
    ctx.save();
    ctx.strokeStyle=selectedRoute?'#e8eead':'#c0d5b780';
    ctx.lineWidth=selectedRoute?2:1;
    ctx.setLineDash(u.reverse?[3,5]:[8,5]);
    ctx.beginPath();
    let p=toScreen(u.x,u.y);
    ctx.moveTo(p.x,p.y);
    for(const q of u.path){
      p=toScreen(q.x,q.y);
      ctx.lineTo(p.x,p.y)
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if(u.goal){
      p=toScreen(u.goal.x,u.goal.y);
      ctx.strokeStyle='#293e2a';
      ctx.lineWidth=4;
      ctx.beginPath();
      ctx.arc(p.x,p.y,7,0,Math.PI*2);
      ctx.stroke();
      ctx.strokeStyle='#e8eead';
      ctx.lineWidth=1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x-11,p.y);
      ctx.lineTo(p.x+11,p.y);
      ctx.moveTo(p.x,p.y-11);
      ctx.lineTo(p.x,p.y+11);
      ctx.stroke()
    }
    ctx.restore()
  }
  function label(text,x,y,size=12){
    const p=toScreen(x,y);
    ctx.font='500 '+size+'px system-ui,sans-serif';
    ctx.textAlign='center';
    ctx.fillStyle='#d8ddbb';
    ctx.strokeStyle='#d8ddbb99';
    ctx.lineWidth=4;
    ctx.strokeText(text,p.x,p.y);
    ctx.fillStyle='#40543b';
    ctx.fillText(text,p.x,p.y)
  }
  function draw(now){
    frameCount++;
    updateVisibility(now);
    ctx.setTransform(camera.dpr,0,0,camera.dpr,0,0);
    ctx.clearRect(0,0,camera.w,camera.h);
    ctx.fillStyle='#899275';
    ctx.fillRect(0,0,camera.w,camera.h);
    const p=toScreen(0,0),ww=C.WORLD.w*camera.zoom,hh=C.WORLD.h*camera.zoom;
    terrainRenderer.draw(ctx,camera,{showContours,terrainMode,sightHeld});
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x,p.y,ww,hh);
    ctx.clip();
    if(camera.zoom>.65){
      for(const t of trails){
        const a=toScreen(t.x,t.y);
        ctx.save();
        ctx.translate(a.x,a.y);
        ctx.scale(camera.zoom,camera.zoom);
        ctx.rotate(t.heading);
        ctx.fillStyle='#253b2940';
        ctx.fillRect(-1.2,-1.8,2.4,.5);
        ctx.fillRect(-1.2,1.3,2.4,.5);
        ctx.restore()
      }
    }
    if(sightHeld)drawVisibility();
    ctx.strokeStyle='#3e563c40';
    ctx.lineWidth=1;
    for(let x=0;
    x<=C.WORLD.w;
    x+=500){
      const q=toScreen(x,0);
      ctx.beginPath();
      ctx.moveTo(q.x,p.y);
      ctx.lineTo(q.x,p.y+hh);
      ctx.stroke()
    }
    for(let y=0;
    y<=C.WORLD.h;
    y+=500){
      const q=toScreen(0,y);
      ctx.beginPath();
      ctx.moveTo(p.x,q.y);
      ctx.lineTo(p.x+ww,q.y);
      ctx.stroke()
    }
    ctx.restore();
    if(!sightHeld) {
      const places=C.labels.filter(p=>p.name==='Bornmühle');
      for(const p of places)label(p.name,p.x,p.y,10);
      label('RASDORF',2850,1390,12);
      label('서부 수림',460,1500,10);
      label('능선 지대',930,3500,10);
    }
    for(const u of sim.units)if(u.team==='blue')drawRoute(u);
    for(const u of sim.units)if(u.team==='blue')drawTank(u);
    for(const contact of C.contacts(sim))drawTank(contact);
    drawShots();
    ctx.strokeStyle='#e3e6c155';
    ctx.lineWidth=1;
    ctx.strokeRect(p.x,p.y,ww,hh);
    const desired=100/camera.zoom,power=10**Math.floor(Math.log10(desired)),scale=[1,2,5,10].map(v=>v*power).reduce((a,b)=>Math.abs(a-desired)<Math.abs(b-desired)?a:b);
    $('scaleLine').style.width=scale*camera.zoom+'px';
    ui.setText($('scaleText'),scale+' m');
    canvas.dataset.view=sightHeld?(visibilityPath?'sight':'sight-pending'):'map';
    if(now>toastUntil)$('toast').classList.remove('show')
  }
  function loop(now){
    const elapsed=Math.min(.12,(now-last)/1000);
    last=now;
    if(!paused&&!document.hidden){
      accumulator+=elapsed*timeScale;
      let steps=0;
      while(accumulator>=.05&&steps<6){
        C.step(sim,.05);
        accumulator-=.05;
        steps++;
        for(const u of sim.units){
          u.trackTimer+=.05;
          if(u.team==='blue'&&u.speed>1&&u.trackTimer>.55){
            trails.push({
              x:u.x,y:u.y,heading:u.heading
            }
            );
            u.trackTimer=0;
            if(trails.length>1200)trails.shift()
          }
        }
      }
    }
    uiTime+=elapsed;
    if(uiTime>.15){
      updateUI();
      uiTime=0
    }
    draw(now);
    requestAnimationFrame(loop)
  }
  $('loading').remove();
  resize(true);
  syncOrientation();
  updateUI();
  requestAnimationFrame(loop);
  function snapshotUnit(u){
    const o=u.observation;
    const publicMission=d=>{const {target,...rest}=d;return rest;};
    const designation=publicMission(o.designation),tracking=publicMission(o.tracking);
    const order=ch=>{const {cooldowns,focus,...rest}=o[ch];return {...rest,focus:focus?o.contacts[focus]?.key??null:null};};
    return {...u,combat:C.combatView(u),activeStatus:activeUnitStatus(u),observation:{commander:order('commander'),gunner:order('gunner'),designation,tracking,sensing:C.ownObservation(sim,u,targetId),lastQuery:o.lastQuery}};
  }
  // Detached snapshots include friendly telemetry and public contacts only.
  window.__TACTICAL__={
    version:'0.4-WIP19',core:C,snapshot:()=>JSON.parse(JSON.stringify({
      time:sim.time,selected,targetId,paused,timeScale,sightHeld,reverseMode,showContours,terrainMode,camera,units:sim.units.filter(u=>u.team==='blue').map(snapshotUnit),contacts:C.contacts(sim),frameCount,lookPicking,guardPopupOpen,portraitBlocked,look:lookView(),firing:selectedUnit()?C.fireStatus(sim,selectedUnit(),targetId):null,shots:C.fireEvents(sim,'blue'),effects:C.effectEvents(sim),effectStats:effectRenderer.stats()
    }
    )),command:(x,y,reverse=false)=>{if(portraitBlocked)return{ok:false,reason:'portrait-blocked'};
      setReverse(reverse);
      const u=selectedUnit();if(!u)return{ok:false,reason:'no-selection'};return C.issueMove(u,{
        x,y
      }
      ,reverse,sim.units)
    }
    ,select,visibilityState:()=>({client:visibilityClient.status(),origin:visOrigin&&{...visOrigin},loops:visibility?.loops?.length??0}),fire:()=>{if(portraitBlocked)return{ok:false,reason:'portrait-blocked'};if(paused||!targetId||!selectedUnit())return{ok:false,reason:'paused-or-no-selection'};return C.requestFire(sim,selectedUnit(),targetId);},fireMode:mode=>!portraitBlocked&&selectedUnit()?C.fireMode(sim,selectedUnit(),mode):false,ammoPreference:preference=>!portraitBlocked&&selectedUnit()?C.ammoPreference(sim,selectedUnit(),preference):false,own:(key)=>selectedUnit()?C.ownObservation(sim,selectedUnit(),key):null,contact:(key)=>C.contacts(sim).find(c=>c.key===key),worldToScreen:toScreen,rendererStats:()=>terrainRenderer.stats(),effectRendererStats:()=>effectRenderer.stats(),effectOptions:(enabled=effectsEnabled,quality=effectQuality,reduced=reducedMotionOverride)=>{effectsEnabled=!!enabled;effectQuality=C.clamp(Number(quality)||1,.25,1);reducedMotionOverride=reduced===null?null:!!reduced;return{enabled:effectsEnabled,quality:effectQuality,reduced:reducedMotionOverride};},mapView:(x,y,zoom)=>{if([x,y,zoom].every(Number.isFinite)){camera.x=x;camera.y=y;camera.zoom=C.clamp(zoom,.1,32);clampCamera();}return{...camera};}
  }
  ;
}
)();
