'use strict';
/* A polar line-of-sight sweep. Each ray retains the terrain/roof horizon and
 * height-dependent foliage depth. Vector isolines can contain holes and islands:
 * a distant hillside can become visible again above a nearer obstruction. */
const TacticalVisibility=(()=>{
  const TAU=Math.PI*2;
  function rayIntervals(b,o,dx,dy,range){
    const hits=[];
    for(const ring of b.rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[j],z=ring[i],ex=z[0]-a[0],ey=z[1]-a[1],den=dx*ey-dy*ex;
      if(Math.abs(den)<1e-10)continue;
      const ax=a[0]-o.x,ay=a[1]-o.y,t=(ax*ey-ay*ex)/den,u=(ax*dy-ay*dx)/den;
      if(t>1e-7&&t<=range&&u>=0&&u<1)hits.push(t);
    }
    hits.sort((a,b)=>a-b);
    let inside=false;
    for(const ring of b.rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],z=ring[j];
      if((a[1]>o.y)!==(z[1]>o.y)&&o.x<(z[0]-a[0])*(o.y-a[1])/(z[1]-a[1])+a[0])inside=!inside;
    }
    if(inside)hits.unshift(0);
    if(hits.length%2)hits.push(range);
    const intervals=[];for(let i=0;i+1<hits.length;i+=2)intervals.push({enter:hits[i],exit:hits[i+1],roof:b.roof});
    return intervals;
  }
  function compute(C,o,options={}){
    const sensor=C.profileOf?.(o)?.sensors;
    const range=options.range||sensor?.observationLimit||C.VEHICLE.range,radialStep=options.radialStep||4,scanStep=2,targetHeight=options.targetHeight??1.5;
    const baseRays=options.rays||720,angles=Array.from({length:baseRays},(_,i)=>i*TAU/baseRays);
    const nearby=(C.buildings||[]).filter(b=>Math.hypot(Math.max(b.minX-o.x,0,o.x-b.maxX),Math.max(b.minY-o.y,0,o.y-b.maxY))<range);
    // Extra rays at building silhouettes make straight wall shadows precise.
    // Bound their count in dense towns so holding sight stays responsive.
    const corners=[];
    for(const b of nearby){
      const cx=(b.minX+b.maxX)/2-o.x,cy=(b.minY+b.maxY)/2-o.y,center=Math.atan2(cy,cx),distance=Math.hypot(cx,cy);
      const points=b.rings.flat().map(([x,y])=>({angle:center+Math.atan2(Math.sin(Math.atan2(y-o.y,x-o.x)-center),Math.cos(Math.atan2(y-o.y,x-o.x)-center)),distance}));
      points.sort((a,b)=>a.angle-b.angle);
      if(distance<80)corners.push(...points);else corners.push(points[0],points[points.length-1]);
    }
    corners.sort((a,b)=>a.distance-b.distance);
    for(const p of corners.slice(0,420))for(const e of [-.00003,0,.00003])angles.push((p.angle+e+TAU)%TAU);
    angles.sort((a,b)=>a-b);
    const aa=angles.filter((a,i)=>!i||a-angles[i-1]>1e-7),n=aa.length,steps=Math.ceil(range/radialStep),cols=steps+2;
    const values=new Float32Array(n*cols),eye=C.heightAt(o.x,o.y)+(sensor?.eyeHeight??C.VEHICLE.eye),bins=8192,tree=new Float32Array(bins+2);
    const bin=s=>Math.max(0,Math.min(bins-1,Math.floor((Math.atan(s)/Math.PI+.5)*bins)));
    const add=(i,v)=>{for(i++;i<tree.length;i+=i&-i)tree[i]+=v;};
    const query=i=>{let s=0;for(i++;i>0;i-=i&-i)s+=tree[i];return s;};
    for(let a=0;a<n;a++){
      const dx=Math.cos(aa[a]),dy=Math.sin(aa[a]),events=[];
      for(const b of nearby){
        // Ray / AABB rejection before polygon intersections.
        let lo=0,hi=range;
        for(const [p,d,min,max]of [[o.x,dx,b.minX,b.maxX],[o.y,dy,b.minY,b.maxY]]){
          if(Math.abs(d)<1e-10){if(p<min||p>max)hi=-1;}
          else{const t0=(min-p)/d,t1=(max-p)/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));}
        }
        if(hi>=lo)events.push(...rayIntervals(b,o,dx,dy,range));
      }
      events.sort((a,b)=>a.enter-b.enter);
      tree.fill(0);let foliage=false,horizon=-Infinity,event=0,sample=1;
      values[a*cols]=1;
      for(let d=scanStep;d<=range;d+=scanStep){
        const x=o.x+dx*d,y=o.y+dy*d,ground=C.heightAt(x,y);
        if(x<0||y<0||x>C.WORLD.w||y>C.WORLD.h){for(;sample<=steps;sample++)values[a*cols+sample]=-4;break;}
        while(event<events.length&&events[event].enter<d-.01){
          const b=events[event++];
          horizon=Math.max(horizon,(b.roof-eye)/Math.max(.05,b.enter),(b.roof-eye)/Math.max(.05,b.exit));
        }
        if(d>=Math.min(range,sample*radialStep)-.01){
          const target=ground+targetHeight,slope=(target-eye)/d;
          const optical=foliage?query(bin(slope)):0;
          let margin=Math.min(target-eye-horizon*d,(1-optical)*4);
          if(x<0||y<0||x>C.WORLD.w||y>C.WORLD.h)margin=-1;
          values[a*cols+sample]=margin;sample++;
        }
        // Endpoint is not itself an intervening obstruction.
        horizon=Math.max(horizon,(ground-.06-eye)/d);
        const density=C.forestAt(x,y);
        if(density){
          const lo=bin((ground-eye)/d),hi=bin((ground+15-eye)/d),depth=density*scanStep/85;
          add(lo,depth);add(hi+1,-depth);foliage=true;
        }
      }
      values[a*cols+steps+1]=-4; // range boundary, located at exactly range
    }
    const loops=isolines(aa,values,cols,radialStep,range,o);
    return {origin:{x:o.x,y:o.y},range,targetHeight,loops,rayCount:n,radialStep};
  }
  function isolines(angles,values,cols,step,range,o){
    const n=angles.length,nodes=new Map(),segments=[];
    const radius=j=>Math.min(j*step,range);
    const xy=(a,j)=>[o.x+Math.cos(angles[a])*radius(j),o.y+Math.sin(angles[a])*radius(j)];
    const basic={1:[[3,0]],2:[[0,1]],3:[[3,1]],4:[[1,2]],6:[[0,2]],7:[[3,2]],8:[[2,3]],9:[[0,2]],11:[[1,2]],12:[[1,3]],13:[[0,1]],14:[[3,0]]};
    for(let a=0;a<n;a++)for(let j=0;j<cols-1;j++){
      const b=(a+1)%n,vs=[values[a*cols+j],values[b*cols+j],values[b*cols+j+1],values[a*cols+j+1]];
      const mask=(vs[0]>0?1:0)|(vs[1]>0?2:0)|(vs[2]>0?4:0)|(vs[3]>0?8:0);
      if(mask===0||mask===15)continue;
      let pairs=basic[mask];
      if(mask===5)pairs=vs.reduce((s,v)=>s+v,0)>0?[[0,1],[2,3]]:[[3,0],[1,2]];
      if(mask===10)pairs=vs.reduce((s,v)=>s+v,0)>0?[[3,0],[1,2]]:[[0,1],[2,3]];
      const edge=e=>{
        const ids=['A'+a+':'+j,'R'+b+':'+j,'A'+a+':'+(j+1),'R'+a+':'+j],id=ids[e];
        if(!nodes.has(id)){
          const corners=[[a,j],[b,j],[b,j+1],[a,j+1]],i=e,k=(e+1)%4,p=xy(...corners[i]),q=xy(...corners[k]),t=vs[i]/(vs[i]-vs[k]);
          nodes.set(id,{p:[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t],edges:[]});
        }
        return id;
      };
      for(const pair of pairs){const from=edge(pair[0]),to=edge(pair[1]),index=segments.length;segments.push([from,to]);nodes.get(from).edges.push(index);nodes.get(to).edges.push(index);}
    }
    const used=new Uint8Array(segments.length),loops=[];
    for(let i=0;i<segments.length;i++){
      if(used[i])continue;
      const first=segments[i][0],points=[];let node=first,current=i,closed=false;
      for(let guard=0;guard<=segments.length;guard++){
        points.push(nodes.get(node).p);used[current]=1;
        const edge=segments[current];node=edge[0]===node?edge[1]:edge[0];
        if(node===first){closed=true;break;}
        current=nodes.get(node).edges.find(e=>!used[e]);if(current===undefined)break;
      }
      if(closed&&points.length>=3)loops.push(points);
    }
    return loops;
  }
  function contains(result,x,y){
    let inside=false;
    for(const ring of result.loops)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    return inside;
  }
  return {compute,contains,rayIntervals};
})();
if(typeof module!=='undefined')module.exports=TacticalVisibility;
