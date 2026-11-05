  function drawGeometry(g, geometry, fill, stroke=null, lineWidth=1) {
    const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
    g.beginPath();
    for(const polygon of polygons) for(const ring of polygon) {
      ring.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();
    }
    if(fill){g.fillStyle=fill;g.fill('evenodd');}
    if(stroke){g.strokeStyle=stroke;g.lineWidth=lineWidth;g.stroke();}
  }
  function renderTerrain() {
    const g=terrainCanvas.getContext('2d'),w=terrainCanvas.width,h=terrainCanvas.height,img=g.createImageData(w,h);
    const low=C.MAP.meta.heightRange[0],span=C.MAP.meta.heightRange[1]-low;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
      const wx=x/MAP_SCALE,wy=y/MAP_SCALE,z=C.heightAt(wx,wy);
      const dx=C.heightAt(wx+4,wy)-C.heightAt(wx-4,wy),dy=C.heightAt(wx,wy+4)-C.heightAt(wx,wy-4);
      const shade=C.clamp(-dx*.07-dy*.10,-.26,.26),grain=(C.hash(x,y)-.5)*4,k=(y*w+x)*4;
      const high=(z-low)/span;
      img.data[k]=151+high*13+shade*100+grain;
      img.data[k+1]=162+high*10+shade*100+grain;
      img.data[k+2]=117+high*10+shade*82+grain;
      img.data[k+3]=255;
    }
    g.putImageData(img,0,0);g.save();g.scale(MAP_SCALE,MAP_SCALE);
    for(const f of C.fields) {
      const tint=f.kind==='field'?'#d0b67d23':f.kind==='settlement'?'#b9aa8e35':f.kind==='scrub'?'#65835324':null;
      drawGeometry(g,f.geometry,tint,f.kind==='field'?'#ddd2a61e':null,1.2);
    }
    for(const f of C.forests)drawGeometry(g,f.geometry,'#456b4245','#536e3e40',2);
    for(const f of C.water)drawGeometry(g,f.geometry,'#719e9c','#456b6c80',2);
    for(const stream of C.waterways) {
      if(stream.culvert)continue;
      poly(g,stream.points.map(p=>({x:p[0],y:p[1]})));
      g.strokeStyle='#6d999d95';g.lineWidth=Math.max(2,stream.width);g.stroke();
    }
    // Detail trees are fixed synthetic placements inside the real forest polygons.
    for(const [x,y,r] of C.trees) {
      g.fillStyle='#263e292a';g.beginPath();g.ellipse(x+3,y+4,r+2,r*.8,0,0,Math.PI*2);g.fill();
      g.fillStyle=['#4e6d43','#5b794a','#68814e','#567343'][Math.floor(C.hash(x|0,y|0,4)*4)];
      g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
      g.fillStyle='#a4ad6125';g.beginPath();g.arc(x-2,y-2,r*.6,0,Math.PI*2);g.fill();
    }
    const sortedRoads=C.roads.slice().sort((a,b)=>a.width-b.width);
    for(const road of sortedRoads) {
      const pts=road.points.map(p=>({x:p[0],y:p[1]}));g.lineCap='round';g.lineJoin='round';
      poly(g,pts);g.strokeStyle=road.driveable?'#66734d55':'#6c7d5030';g.lineWidth=road.width+3;g.stroke();
      poly(g,pts);g.strokeStyle=road.driveable?'#c9c3a3':'#c9c5a68a';g.lineWidth=Math.max(road.driveable?3:1.4,road.width);g.stroke();
      if(road.bridge) {poly(g,pts);g.strokeStyle='#535f4a';g.lineWidth=road.width+3;g.stroke();poly(g,pts);g.strokeStyle='#ded6b8';g.lineWidth=road.width;g.stroke();}
    }
    for(const b of C.buildings) {
      g.save();g.translate(3,4);drawGeometry(g,b.geometry,'#20342540');g.restore();
      drawGeometry(g,b.geometry,'#8b8a74','#5e6c55',1.2);
    }
    g.restore();
    // Marching squares: visit cells once, and only the contour levels crossing each cell.
    const cg=contourCanvas.getContext('2d'),paths=new Map(),step=12;
    cg.save();cg.scale(MAP_SCALE,MAP_SCALE);
    for(let y=0;y<C.WORLD.h;y+=step)for(let x=0;x<C.WORLD.w;x+=step) {
      const x1=Math.min(x+step,C.WORLD.w),y1=Math.min(y+step,C.WORLD.h);
      const pts=[{x,y},{x:x1,y},{x:x1,y:y1},{x,y:y1}],zs=pts.map(p=>C.heightAt(p.x,p.y));
      const min=Math.min(...zs),max=Math.max(...zs);
      for(let level=Math.ceil(min/10)*10;level<max;level+=10) {
        const cuts=[];
        for(let i=0;i<4;i++) {
          const j=(i+1)%4;
          if((zs[i]<level)!==(zs[j]<level)) {
            const t=(level-zs[i])/(zs[j]-zs[i]);cuts.push({x:C.mix(pts[i].x,pts[j].x,t),y:C.mix(pts[i].y,pts[j].y,t)});
          }
        }
        if(!paths.has(level))paths.set(level,[]);
        for(let i=0;i+1<cuts.length;i+=2)paths.get(level).push([cuts[i],cuts[i+1]]);
      }
    }
    for(const [level,segments] of paths) {
      cg.beginPath();for(const [a,b]of segments){cg.moveTo(a.x,a.y);cg.lineTo(b.x,b.y);}
      cg.strokeStyle=level%50===0?'#3f563886':'#4e654c47';cg.lineWidth=level%50===0?2.2:1.1;cg.stroke();
    }
    cg.font='17px ui-monospace,monospace';cg.textAlign='center';
    for(const level of [300,350,400,450,500]) {
      const segments=paths.get(level);if(!segments||segments.length<20)continue;
      for(const k of [Math.floor(segments.length*.24),Math.floor(segments.length*.72)]) {
        const p=segments[k][0];cg.strokeStyle='#d5d9b3b0';cg.lineWidth=5;cg.strokeText(String(level),p.x,p.y);cg.fillStyle='#435c3c';cg.fillText(String(level),p.x,p.y);
      }
    }
    cg.restore();
  }
