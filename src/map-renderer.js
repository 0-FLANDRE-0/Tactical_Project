'use strict';
/* Geometry stays in metres. Only the current viewport is cached at native DPR;
 * every pan/zoom rebuilds it from paths, never from an enlarged map bitmap. */
const TacticalTerrainStyle=(()=>{
  const stops=[290,340,390,440,510];
  const palettes={
    normal:[[91,112,105],[117,132,94],[151,150,96],[178,162,109],[205,188,137]],
    emphasis:[[75,101,101],[105,126,82],[151,151,82],[190,164,97],[220,196,139]]
  };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Map x points east and y points south. The primary light is therefore
  // negative x/negative y for a north-west source. Secondary lights preserve
  // folds facing other directions without flattening the primary reading.
  function hillshade(dx,dy,emphasis=false,sight=false){
    const soft=value=>value/(1+Math.abs(value));
    const northWest=soft((dx+dy)*.7071),northEast=soft(dy*.56-dx*.83),southWest=soft(dx*.55-dy*.84);
    const strength=(emphasis ? 1.18 : .84)*(sight ? .38 : 1),value=(northWest*.72+northEast*.18+southWest*.10)*strength;
    return clamp(value,-(emphasis ? .21 : .15),emphasis ? .21 : .15);
  }
  function baseColour(height,emphasis=false){
    const palette=palettes[emphasis?'emphasis':'normal'];let i=0;
    while(i<stops.length-2&&height>stops[i+1])i++;
    const t=clamp((height-stops[i])/(stops[i+1]-stops[i]),0,1),a=palette[i],b=palette[i+1];
    return a.map((value,index)=>value+(b[index]-value)*t);
  }
  function colour(height,dx,dy,emphasis=false,sight=false){
    const rgb=baseColour(height,emphasis),shade=hillshade(dx,dy,emphasis,sight),amount=shade*(emphasis?122:94);
    return rgb.map((value,index)=>Math.round(clamp(value+amount*(index===2 ? .88 : 1),0,255)));
  }
  function writePixel(data,index,height,dx,dy,emphasis=false,sight=false){
    const palette=palettes[emphasis?'emphasis':'normal'];let i=height<=340?0:height<=390?1:height<=440?2:3;
    const t=clamp((height-stops[i])/(stops[i+1]-stops[i]),0,1),a=palette[i],b=palette[i+1],shade=hillshade(dx,dy,emphasis,sight),amount=shade*(emphasis?122:94);
    data[index]=Math.round(clamp(a[0]+(b[0]-a[0])*t+amount,0,255));
    data[index+1]=Math.round(clamp(a[1]+(b[1]-a[1])*t+amount,0,255));
    data[index+2]=Math.round(clamp(a[2]+(b[2]-a[2])*t+amount*.88,0,255));data[index+3]=255;
  }
  return{version:'1.0.0',stops,palettes,hillshade,baseColour,colour,writePixel};
})();

class TacticalRenderer {
  constructor(core, contours, terrain=null) {
    this.C=core;
    const mapSpecApi=typeof TacticalMapSpec!=='undefined'?TacticalMapSpec:require('./map-spec.js');
    mapSpecApi.validateDerived(core.SPEC,contours,'contour');
    this.cache=document.createElement('canvas');
    this.shade=document.createElement('canvas');
    this.key='';
    this.rebuildCount=0;this.cacheHits=0;this.rebuildTimes=[];
    const shape=(geometry)=>{
      const p=new Path2D(),all=[];
      const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
      for(const polygon of polygons)for(const ring of polygon){
        ring.forEach(([x,y],i)=>{i?p.lineTo(x,y):p.moveTo(x,y);all.push([x,y]);});p.closePath();
      }
      return {path:p,bounds:this.bounds(all)};
    };
    const line=(points)=>{const path=new Path2D();points.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));return {path,bounds:this.bounds(points)};};
    for(const name of ['fields','forests','water','buildings'])this[name]=core[name].map(f=>({...f,...shape(f.geometry)}));
    this.roads=core.roads.slice().sort((a,b)=>a.width-b.width).map(f=>({...f,...line(f.points)}));
    this.waterways=core.waterways.filter(s=>!s.culvert).map(f=>({...f,...line(f.points)}));
    this.contours=contours.lines.map(f=>({...f,...line(f.points)}));
    this.terrainValid=mapSpecApi.validateDerived(core.SPEC,terrain,'terrain readability',{optional:true});
    if(this.terrainValid&&terrain.schemaVersion!==1)throw Error('unsupported terrain readability schema');
    if(!this.terrainValid)console.info('지형 해석선 데이터가 없어 기본 지형 표시를 사용함');
    this.terrainVersion=this.terrainValid?terrain.algorithmVersion:'unavailable';
    this.terrainLines=this.terrainValid?terrain.lines.map(f=>({...f,...line(f.points)})):[];
    const tiles=new Map();
    for(const [x,y,r] of core.trees){
      const tx=Math.floor(x/256),ty=Math.floor(y/256),id=tx+','+ty;
      if(!tiles.has(id))tiles.set(id,{bounds:[tx*256-20,ty*256-20,(tx+1)*256+20,(ty+1)*256+20],shadow:new Path2D(),light:new Path2D(),crowns:Array.from({length:4},()=>new Path2D())});
      const t=tiles.get(id),p=t.crowns[Math.floor(core.hash(x|0,y|0,4)*4)];
      t.shadow.moveTo(x+r+5,y+4);t.shadow.ellipse(x+3,y+4,r+2,r*.8,0,0,Math.PI*2);
      p.moveTo(x+r,y);p.arc(x,y,r,0,Math.PI*2);
      t.light.moveTo(x-2+r*.6,y-2);t.light.arc(x-2,y-2,r*.6,0,Math.PI*2);
    }
    this.treeTiles=[...tiles.values()];
  }
  bounds(points){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const [x,y]of points){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}return [x0,y0,x1,y1];}
  visible(f,v){const b=f.bounds;return b[0]<=v[2]&&b[2]>=v[0]&&b[1]<=v[3]&&b[3]>=v[1];}
  draw(ctx,camera,options=true){
    if(typeof options==='boolean')options={showContours:options,terrainMode:false,sightHeld:false};
    const {showContours=true,terrainMode=false,sightHeld=false}=options;
    const {x,y,zoom,w,h,dpr}=camera,key=[x,y,zoom,w,h,dpr,showContours,terrainMode,sightHeld,TacticalTerrainStyle.version,this.terrainVersion].join('|');
    if(this.key!==key){const start=performance.now();this.rebuild(camera,{showContours,terrainMode,sightHeld});this.key=key;this.rebuildCount++;this.rebuildTimes.push(performance.now()-start);if(this.rebuildTimes.length>240)this.rebuildTimes.shift();}
    else this.cacheHits++;
    ctx.drawImage(this.cache,0,0,this.cache.width,this.cache.height,0,0,w,h);
  }
  stats(){return{key:this.key,rebuildCount:this.rebuildCount,cacheHits:this.cacheHits,lastRebuildMs:this.rebuildTimes.at(-1)??0,rebuildTimes:[...this.rebuildTimes],terrainValid:this.terrainValid,terrainLines:this.terrainLines.length};}
  rebuild(c,{showContours,terrainMode,sightHeld}){
    const {C}=this,{x,y,zoom,w,h,dpr}=c;
    this.cache.width=Math.round(w*dpr);this.cache.height=Math.round(h*dpr);
    const g=this.cache.getContext('2d'),left=x-w/2/zoom,top=y-h/2/zoom,v=[left,top,left+w/zoom,top+h/zoom];
    g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#899275';g.fillRect(0,0,w,h);
    // Continuous elevation colour / hill shading only. Features below are vector.
    const sw=Math.ceil(w/4),sh=Math.ceil(h/4);this.shade.width=sw;this.shade.height=sh;
    const sg=this.shade.getContext('2d'),img=sg.createImageData(sw,sh);
    for(let py=0;py<sh;py++)for(let px=0;px<sw;px++){
      const wx=left+(px+.5)*w/sw/zoom,wy=top+(py+.5)*h/sh/zoom,z=C.heightAt(wx,wy);
      const sample=10,dx=(C.heightAt(wx+sample,wy)-C.heightAt(wx-sample,wy))/(sample*2),dy=(C.heightAt(wx,wy+sample)-C.heightAt(wx,wy-sample))/(sample*2);
      const k=(py*sw+px)*4;TacticalTerrainStyle.writePixel(img.data,k,z,dx,dy,terrainMode,sightHeld);
    }
    sg.putImageData(img,0,0);
    g.save();g.beginPath();g.rect(-left*zoom,-top*zoom,C.WORLD.w*zoom,C.WORLD.h*zoom);g.clip();
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(this.shade,0,0,w,h);
    g.translate(w/2-x*zoom,h/2-y*zoom);g.scale(zoom,zoom);
    const fill=(f,color)=>{g.fillStyle=color;g.fill(f.path,'evenodd');};
    const stroke=(f,color,width)=>{g.strokeStyle=color;g.lineWidth=width;g.stroke(f.path);};
    for(const f of this.fields)if(this.visible(f,v)){
      const color=(terrainMode?{field:'#d0b67d12',settlement:'#b9aa8e22',scrub:'#65835316'}:{field:'#d0b67d23',settlement:'#b9aa8e35',scrub:'#65835324'})[f.kind];
      if(color)fill(f,color);if(f.kind==='field')stroke(f,terrainMode?'#ddd2a619':'#ddd2a62b',Math.max(.4,.55/zoom));
    }
    for(const f of this.forests)if(this.visible(f,v)){fill(f,terrainMode?'#385e3c2b':'#456b4245');if(terrainMode)stroke(f,'#365b3b73',Math.max(.7,1/zoom));}
    for(const f of this.water)if(this.visible(f,v)){fill(f,'#719e9c');stroke(f,'#456b6c80',1);}
    g.lineJoin='round';g.lineCap='round';
    for(const f of this.waterways)if(this.visible(f,v))stroke(f,'#6d999d95',Math.max(1.3,f.width));
    const colors=terrainMode?['#425f426d','#4d6b4770','#58744b68','#48654370']:['#4e6d43','#5b794a','#68814e','#567343'];
    for(const t of this.treeTiles)if(this.visible(t,v)){
      if(!terrainMode){g.fillStyle='#263e2938';g.fill(t.shadow);}
      t.crowns.forEach((p,i)=>{g.fillStyle=colors[i];g.fill(p);});
      if(!terrainMode){g.fillStyle='#b6c77c30';g.fill(t.light);}
    }
    if(terrainMode)this.drawTerrainLines(g,v,zoom,sightHeld);
    for(const r of this.roads)if(this.visible(r,v)){
      stroke(r,r.driveable?'#66734d65':'#6c7d5030',r.width+2);
      stroke(r,r.bridge?'#535f4a':r.driveable?'#c9c3a3':'#c9c5a68a',r.bridge?r.width+2:r.width);
      if(r.bridge)stroke(r,'#ded6b8',r.width);
      if(zoom>2.5&&r.driveable&&r.width>5){g.setLineDash([3,6]);stroke(r,'#eee8ce80',.12);g.setLineDash([]);}
    }
    if(showContours)for(const f of this.contours)if(this.visible(f,v)){
      const major=f.level%50===0;if(!major&&zoom<.42)continue;
      stroke(f,major?(terrainMode?'#314a35b8':'#364e38ad'):(terrainMode?'#435d4878':'#4a644d72'),(major?1.7:.75)/zoom);
    }
    for(const b of this.buildings)if(this.visible(b,v)){
      g.save();g.translate(2,2.5);fill(b,'#20342540');g.restore();
      fill(b,'#99917b');stroke(b,'#52614c',Math.min(.5,.8/zoom));
      if(zoom>1.2){
        // A small inset roof detail, clipped to the actual footprint.
        const [x0,y0,x1,y1]=b.bounds;g.save();g.clip(b.path,'evenodd');
        g.beginPath();if(x1-x0>y1-y0){g.moveTo(x0,(y0+y1)/2);g.lineTo(x1,(y0+y1)/2);}else{g.moveTo((x0+x1)/2,y0);g.lineTo((x0+x1)/2,y1);}
        g.lineWidth=.2;g.strokeStyle='#d0c3a388';g.stroke();g.restore();
      }
    }
    g.restore();
    if(showContours)this.contourLabels(g,c,v);
  }
  drawTerrainLines(g,v,zoom,sightHeld){
    g.save();g.globalAlpha=sightHeld ? .28 : .72;g.lineJoin='round';g.lineCap='round';
    for(const f of this.terrainLines){
      if(zoom<f.minimumZoom||!this.visible(f,v))continue;
      if(f.kind==='ridge'){
        g.setLineDash([]);g.strokeStyle='#a2704f';g.lineWidth=.9/zoom;
      }else{
        g.setLineDash([7/zoom,5/zoom]);g.strokeStyle='#647f8c';g.lineWidth=.82/zoom;
      }
      g.stroke(f.path);
    }
    g.restore();
  }
  contourLabels(g,c,v){
    const placed=[];g.font='600 11.5px ui-monospace,monospace';g.textAlign='center';g.textBaseline='middle';
    for(const f of this.contours){
      if(f.level%50||!this.visible(f,v))continue;
      let length=0;
      for(let i=1;i<f.points.length;i++){
        const a=f.points[i-1],b=f.points[i];length+=Math.hypot(b[0]-a[0],b[1]-a[1])*c.zoom;
        if(length<260||i<3||i+3>=f.points.length)continue;
        const before=f.points[i-3],after=f.points[i+3],v1=[b[0]-before[0],b[1]-before[1]],v2=[after[0]-b[0],after[1]-b[1]],bend=Math.abs(Math.atan2(v1[0]*v2[1]-v1[1]*v2[0],v1[0]*v2[0]+v1[1]*v2[1]));
        if(bend>.42)continue;
        const sx=(b[0]-c.x)*c.zoom+c.w/2,sy=(b[1]-c.y)*c.zoom+c.h/2;
        const underHeading=sx<340&&sy<112,underBottomUi=sx<450&&sy>c.h-158,underMapTools=sx>c.w-120&&sy<220;
        if(sx<35||sy<28||sx>c.w-75||sy>c.h-105||underHeading||underBottomUi||underMapTools||placed.some(p=>Math.hypot(sx-p[0],sy-p[1])<135))continue;
        const text=String(f.level),width=g.measureText(text).width;g.fillStyle='#d8dec3e8';g.fillRect(sx-width/2-3,sy-7,width+6,14);
        g.lineWidth=2;g.strokeStyle='#d8dec3';g.strokeText(text,sx,sy);g.fillStyle='#344a36';g.fillText(text,sx,sy);placed.push([sx,sy]);length=0;
      }
    }
  }
}

if(typeof module!=='undefined')module.exports={TacticalRenderer,TacticalTerrainStyle};
