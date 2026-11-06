(() => {
  const C=TacticalCore,$=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d'),wrap=$('mapWrap');
  let sim=C.createScenario(),selected='A11',targetId=null,paused=false,timeScale=1,reverseMode=false,showContours=true,sightHeld=false,sightPointer=null,sightKey=false,last=performance.now(),accumulator=0,uiTime=0,toastUntil=0,visibilityDirty=true,visLast=-1,visOrigin=null,frameCount=0;
  const camera={
    x:C.WORLD.w/2,y:C.WORLD.h/2,zoom:.5,w:1,h:1,dpr:1
  }
  ,trails=[],pointers=new Map();
  let gesture=null,dragged=false,clickStart=null;
  const selectedUnit=()=>sim.units.find(u=>u.id===selected);
  const ui=TacticalUICache,updateRoster=ui.createListUpdater(v=>v.state+' · '+Math.round(v.speed*3.6)+' km/h','.unit-sub');
  const lookView=()=>C.observationView(sim,selectedUnit(),$('lookChannel').value||'commander');
  let lookPicking=false;
  const terrainRenderer=new TacticalRenderer(C,CONTOUR_DATA);
  let visibility=null,visibilityPath=null;
  const visibilityClient=new TacticalVisibilityClient(C,TacticalVisibility,()=>['battlefield-data','vehicle-profiles','observation','sim-core','visibility-code'].map(id=>$(id).textContent).join('\n'));
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
  function toggleLookPicking(){
    setLookPicking(!lookPicking);
    toast(lookPicking?'지도에서 경계할 지점을 탭해줘 · Esc 취소':'지점 경계 입력 취소');
  }
  $('lookDirection').onclick=toggleLookPicking;
  $('lookResume').onclick=()=>{setLookPicking(false);C.resumeObservation(sim,selectedUnit(),$('lookChannel').value||'commander');updateUI();};
  $('lookChannel').onchange=()=>{setLookPicking(false);updateUI();};
  $('designateTarget').onclick=()=>{if(targetId&&C.designate(sim,selectedUnit(),targetId)){toast('포수에게 지정 전달 · 자체 관측으로 확보 대기');updateUI();}};
  $('cancelDesignation').onclick=()=>{C.cancelDesignation(sim,selectedUnit());updateUI();};
  function select(id){
    setLookPicking(false);
    visibilityClient.cancel();sightRevision++;visibility=null;visibilityPath=null;visOrigin=null;
    selected=id;
    targetId=null;
    visibilityDirty=true;
    updateUI();
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
    sightHeld=!!v;
    wrap.classList.toggle('sight-on',sightHeld);
    $('sight').classList.toggle('holding',sightHeld);
    $('sight').setAttribute('aria-pressed',sightHeld);
    if(v&&(!visibility||!visOrigin||Math.hypot(selectedUnit().x-visOrigin.x,selectedUnit().y-visOrigin.y)>=1))visibilityDirty=true
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
    const p=toWorld(sx,sy);
    if(lookPicking){
      const u=selectedUnit(),dx=p.x-u.x,dy=p.y-u.y;
      if(Math.hypot(dx,dy)<1e-6){toast('전차 중심에서 떨어진 방향을 탭해줘');return;}
      const duration=Number($('lookDuration').value)||0;
      if(!C.guard(sim,u,$('lookChannel').value||'commander',p,duration)){toast('해당 장비는 독립 경계를 지원하지 않음');return;}
      setLookPicking(false);
      updateUI();
      toast((duration?duration+'초':'해제까지')+' 지정 지점 경계');
      return;
    }
    let best=null,bd=Infinity;
    for(const u of [...sim.units.filter(v=>v.team==='blue'),...C.contacts(sim)]){
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
    setReverse(false);
    toast('이동할 지면을 탭해줘')
  }
  ;
  $('reverse').onclick=()=>{
    setLookPicking(false);
    setReverse(!reverseMode);
    toast(reverseMode?'후진할 지면을 탭해줘':'전진 이동 모드')
  }
  ;
  $('stop').onclick=()=>{
    C.stop(selectedUnit());
    toast('정지 명령');
    updateUI()
  }
  ;
  $('zoomIn').onclick=()=>zoomAt(1.35);
  $('zoomOut').onclick=()=>zoomAt(1/1.35);
  $('fit').onclick=()=>fitCamera();
  $('contours').onclick=()=>{
    showContours=!showContours;
    $('contours').classList.toggle('active',showContours);
    $('contours').setAttribute('aria-pressed',showContours)
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
    visibilityClient.cancel();sightRevision++;visibility=null;visibilityPath=null;visOrigin=null;
    sim=C.createScenario();
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
    if(['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName)||e.target?.isContentEditable)return;
    if(e.code==='Escape'){setLookPicking(false);return;}
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
      if(e.code==='KeyX')C.stop(selectedUnit());
      if(e.code==='KeyF')toggleFullscreen();
      if(e.code==='Home')fitCamera()
    }
  }
  );
  window.addEventListener('keyup',e=>{
    if(e.code==='KeyV'){
      sightKey=false;
      setSight(sightPointer!==null)
    }
  }
  );
  window.addEventListener('blur',()=>{
    releaseSight();
    setLookPicking(false);
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
    pointers.clear();
    clickStart=null;
    gesture=null;
    accumulator=0;
    last=performance.now()
  }
  );
  window.addEventListener('resize',()=>resize());
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
    if(!visibility||!visibilityPath)return;
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
    const u=selectedUnit();
    const look=lookView(),bearing=look.direction===null?null:((Math.round(look.direction*180/Math.PI)+90)%360+360)%360;
    ui.setText($('lookStatus'),look.mode==='fixed'?bearing+'° · '+(look.remaining===null?'해제까지':Math.ceil(look.remaining)+'초'):'자동 경계');
    ui.setText($('unitName'),u.name);
    ui.setText($('velocity'),Math.round(u.speed*3.6));
    ui.setText($('motionState'),u.state);
    ui.setText($('elevation'),C.heightAt(u.x,u.y).toFixed(1)+' m');
    ui.setText($('slope'),(Math.atan(C.slopeAt(u.x,u.y))*180/Math.PI).toFixed(1)+'°');
    ui.setText($('heading'),((Math.round(u.heading*180/Math.PI)+90)%360+360)%360+'°');
    ui.setText($('surface'),({
      grass:'초지',field:'농경지',settlement:'취락',scrub:'관목지',stream:'실개천',road:'도로',forest:'숲',bridge:'교량',water:'수역',obstacle:'건물'
    }
    )[C.surfaceAt(u.x,u.y)]);
    const dist=C.routeDistance(u);
    ui.setHTML($('routeInfo'),u.path.length?'<strong>'+(u.reverse?'후진':'이동')+' 경로</strong> · 남은 거리 '+Math.round(dist)+'m':'지면을 탭해서 <strong>이동 경로</strong>를 지정해봐.');
    ui.setText($('clock'),'T+ '+String(Math.floor(sim.time/60)).padStart(2,'0')+':'+String(Math.floor(sim.time%60)).padStart(2,'0'));
    ui.setText($('simState'),paused?'일시정지':'기동 시험');
    updateRoster($('roster').children,sim.units,selected);
    const d=u.observation.designation,status={idle:'없음',designated:'지정 전달',waiting:'확보 대기',acquiring:'포수 확인 중',acquired:'포수 확보',expired:'지정 만료',cancelled:'지정 취소'};
    ui.setText($('designationStatus'),(status[d.status]||d.status)+(d.reason==='range'?' · 포수 거리 밖':''));
    const sensors=C.profileOf(u).sensors;
    ui.setText($('equipmentStatus'),'전차장 '+(!sensors.commander.enabled?'없음':sensors.commander.independent?'독립':'포탑 연동')+' · 헌터킬러 '+(sensors.hunterKiller?'지원':'없음'));
    const target=C.contacts(sim).find(v=>v.key===targetId);
    $('targetPanel').classList.toggle('visible',!!target);
    if(target){
      ui.setText($('targetTitle'),target.label);
      ui.setText($('targetDetails'),target.memory?'마지막 관측 '+target.age.toFixed(1)+'초 전 · '+(target.identified?target.type:'미식별 표적'):target.identified?target.type:'미식별 표적 · 상세정보 없음');
      $('targetExposure').style.display=target.identified&&target.current?'':'none';
      for(const part of ['hull','turret']){
        const value=target.identified&&target.current?Math.round((target.exposure?.[part]||0)*100)+'%':'—';
        $(part+'Bar').style.width=value==='—'?'0%':value;ui.setText($(part+'Value'),value);
      }
    }else targetId=null;
  }
  const vehicle=C.PROFILE,model=vehicle.model,motion=vehicle.mobility;
  $('vehicleSpecs').innerHTML=[['전장 · 포 전방',model.overallLength.toFixed(2)+' m'],['차체 길이 · 폭',model.hullLength.toFixed(2)+' × '+model.width.toFixed(2)+' m'],['포탑 지붕 높이',model.roofHeight.toFixed(2)+' m'],['중량 · 출력',(vehicle.massKg/1000).toFixed(1)+' t · '+vehicle.engineHp+' hp'],['도로 · 야지',(motion.roadSpeed*3.6).toFixed(1)+' / '+(motion.crossCountrySpeed*3.6).toFixed(1)+' km/h'],['후진 상한',(motion.reverseSpeed*3.6).toFixed(1)+' km/h'],['0 → 32.2km/h',motion.accelerationReferenceSeconds+' 초'],['관측 기준 높이','CITV '+vehicle.sensors.eyeHeight.toFixed(2)+' m · 근사'],['관측 채널','주변 200 / 전차장 2500 / 포수 2000 m'],['시야각 · 선회','전차장 90° · 50°/s / 포수 60° · 40°/s'],['주포 교전 기준','3,000 m · 게임 설정']].map(([name,value])=>'<div><dt>'+name+'</dt><dd>'+value+'</dd></div>').join('');
  for(const u of sim.units.filter(u=>u.team==='blue')){
    const b=document.createElement('button');
    b.className='unit-card';
    b.dataset.id=u.id;
    b.innerHTML='<span class="unit-symbol"><span></span></span><span><span class="unit-title">'+u.name+'</span><div class="unit-sub">대기 · 0 km/h</div></span><span class="unit-status"></span>';
    b.onclick=()=>{
      select(u.id);
      camera.x=u.x;
      camera.y=u.y;
      camera.zoom=Math.max(camera.zoom,3);
      clampCamera()
    }
    ;
    $('roster').appendChild(b)
  }
  function drawTank(u){
    const p=toScreen(u.x,u.y),isSelected=u.id===selected,enemy=u.team==='red',z=camera.zoom;
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
    M1A2Art.draw(ctx,u,z,model,{silhouette:unknown});
    if(!enemy&&isSelected){
      ctx.save();ctx.rotate(u.commander);ctx.strokeStyle='#93e9f0';ctx.fillStyle='#93e9f0';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(ring+3,0);ctx.lineTo(ring+19,0);ctx.stroke();
      ctx.beginPath();ctx.moveTo(ring+24,0);ctx.lineTo(ring+16,-4);ctx.lineTo(ring+16,4);ctx.closePath();ctx.fill();ctx.restore();
    }
    if(z<1){ctx.fillStyle=unknown?'#050505':enemy?'#eab17c':'#a5e1c5';ctx.strokeStyle='#253c30';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,2.5,0,Math.PI*2);ctx.fill();ctx.stroke();}
    ctx.font='600 10px ui-monospace,monospace';ctx.textAlign='center';const text=enemy?u.label+(u.memory?' · 기억':''):u.name,tw=ctx.measureText(text).width,labelY=ring+7;
    ctx.fillStyle='#12271fe8';ctx.fillRect(-tw/2-5,labelY,tw+10,17);ctx.fillStyle=enemy?'#f0bd86':'#e3edcc';ctx.fillText(text,0,labelY+12);ctx.restore();
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
    terrainRenderer.draw(ctx,camera,showContours);
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
  updateUI();
  requestAnimationFrame(loop);
  function snapshotUnit(u){
    const o=u.observation,{target,...designation}=o.designation;
    const order=ch=>{const {cooldowns,focus,...rest}=o[ch];return {...rest,focus:focus?o.contacts[focus]?.key??null:null};};
    return {...u,observation:{commander:order('commander'),gunner:order('gunner'),designation,lastQuery:o.lastQuery}};
  }
  // Detached snapshots include friendly telemetry and public contacts only.
  window.__TACTICAL__={
    version:'0.4-WIP07',core:C,snapshot:()=>JSON.parse(JSON.stringify({
      time:sim.time,selected,targetId,paused,timeScale,sightHeld,reverseMode,camera,units:sim.units.filter(u=>u.team==='blue').map(snapshotUnit),contacts:C.contacts(sim),frameCount,lookPicking,look:lookView()
    }
    )),command:(x,y,reverse=false)=>{
      setReverse(reverse);
      return C.issueMove(selectedUnit(),{
        x,y
      }
      ,reverse,sim.units)
    }
    ,select,contact:(key)=>C.contacts(sim).find(c=>c.key===key),worldToScreen:toScreen
  }
  ;
}
)();
