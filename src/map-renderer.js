'use strict';
/* Geometry stays in metres. Only the current viewport is cached at native DPR;
 * every pan/zoom rebuilds it from paths, never from an enlarged map bitmap. */
class TacticalRenderer {
  constructor(core, contours) {
    this.C=core;
    if(contours.sourceMapHash!==core.MAP.meta.mapHash)throw Error('등고선과 지형 버전 불일치');
    this.cache=document.createElement('canvas');
    this.shade=document.createElement('canvas');
    this.key='';
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
  draw(ctx,camera,showContours){
    const {x,y,zoom,w,h,dpr}=camera,key=[x,y,zoom,w,h,dpr,showContours].join('|');
    if(this.key!==key){this.rebuild(camera,showContours);this.key=key;}
    ctx.drawImage(this.cache,0,0,this.cache.width,this.cache.height,0,0,w,h);
  }
  rebuild(c,showContours){
    const {C}=this,{x,y,zoom,w,h,dpr}=c;
    this.cache.width=Math.round(w*dpr);this.cache.height=Math.round(h*dpr);
    const g=this.cache.getContext('2d'),left=x-w/2/zoom,top=y-h/2/zoom,v=[left,top,left+w/zoom,top+h/zoom];
    g.setTransform(dpr,0,0,dpr,0,0);g.fillStyle='#899275';g.fillRect(0,0,w,h);
    // Continuous elevation colour / hill shading only. Features below are vector.
    const sw=Math.ceil(w/4),sh=Math.ceil(h/4);this.shade.width=sw;this.shade.height=sh;
    const sg=this.shade.getContext('2d'),img=sg.createImageData(sw,sh),low=C.MAP.meta.heightRange[0],span=C.MAP.meta.heightRange[1]-low;
    for(let py=0;py<sh;py++)for(let px=0;px<sw;px++){
      const wx=left+(px+.5)*w/sw/zoom,wy=top+(py+.5)*h/sh/zoom,z=C.heightAt(wx,wy);
      const dx=C.heightAt(wx+4,wy)-C.heightAt(wx-4,wy),dy=C.heightAt(wx,wy+4)-C.heightAt(wx,wy-4);
      const shade=C.clamp(-dx*.07-dy*.10,-.26,.26),high=(z-low)/span,k=(py*sw+px)*4;
      img.data[k]=151+high*13+shade*100;img.data[k+1]=162+high*10+shade*100;img.data[k+2]=117+high*10+shade*82;img.data[k+3]=255;
    }
    sg.putImageData(img,0,0);
    g.save();g.beginPath();g.rect(-left*zoom,-top*zoom,C.WORLD.w*zoom,C.WORLD.h*zoom);g.clip();
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(this.shade,0,0,w,h);
    g.translate(w/2-x*zoom,h/2-y*zoom);g.scale(zoom,zoom);
    const fill=(f,color)=>{g.fillStyle=color;g.fill(f.path,'evenodd');};
    const stroke=(f,color,width)=>{g.strokeStyle=color;g.lineWidth=width;g.stroke(f.path);};
    for(const f of this.fields)if(this.visible(f,v)){
      const color={field:'#d0b67d23',settlement:'#b9aa8e35',scrub:'#65835324'}[f.kind];
      if(color)fill(f,color);if(f.kind==='field')stroke(f,'#ddd2a62b',Math.max(.4,.55/zoom));
    }
    for(const f of this.forests)if(this.visible(f,v))fill(f,'#456b4245');
    for(const f of this.water)if(this.visible(f,v)){fill(f,'#719e9c');stroke(f,'#456b6c80',1);}
    g.lineJoin='round';g.lineCap='round';
    for(const f of this.waterways)if(this.visible(f,v))stroke(f,'#6d999d95',Math.max(1.3,f.width));
    const colors=['#4e6d43','#5b794a','#68814e','#567343'];
    for(const t of this.treeTiles)if(this.visible(t,v)){
      g.fillStyle='#263e2938';g.fill(t.shadow);
      t.crowns.forEach((p,i)=>{g.fillStyle=colors[i];g.fill(p);});
      g.fillStyle='#b6c77c30';g.fill(t.light);
    }
    for(const r of this.roads)if(this.visible(r,v)){
      stroke(r,r.driveable?'#66734d65':'#6c7d5030',r.width+2);
      stroke(r,r.bridge?'#535f4a':r.driveable?'#c9c3a3':'#c9c5a68a',r.bridge?r.width+2:r.width);
      if(r.bridge)stroke(r,'#ded6b8',r.width);
      if(zoom>2.5&&r.driveable&&r.width>5){g.setLineDash([3,6]);stroke(r,'#eee8ce80',.12);g.setLineDash([]);}
    }
    if(showContours)for(const f of this.contours)if(this.visible(f,v))stroke(f,f.level%50===0?'#3f563891':'#4e654c61',(f.level%50===0?1.2:.65)/zoom);
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
  contourLabels(g,c,v){
    const placed=[];g.font='10px ui-monospace,monospace';g.textAlign='center';g.textBaseline='middle';
    for(const f of this.contours){
      if(f.level%50||!this.visible(f,v))continue;
      let length=0;
      for(let i=1;i<f.points.length;i++){
        const a=f.points[i-1],b=f.points[i];length+=Math.hypot(b[0]-a[0],b[1]-a[1])*c.zoom;
        if(length<240)continue;
        const sx=(b[0]-c.x)*c.zoom+c.w/2,sy=(b[1]-c.y)*c.zoom+c.h/2;
        if(sx<35||sy<35||sx>c.w-35||sy>c.h-35||placed.some(p=>Math.hypot(sx-p[0],sy-p[1])<110))continue;
        g.lineWidth=4;g.strokeStyle='#b9c09bde';g.strokeText(f.level+'',sx,sy);g.fillStyle='#43563b';g.fillText(f.level+'',sx,sy);placed.push([sx,sy]);length=0;
      }
    }
  }
}
