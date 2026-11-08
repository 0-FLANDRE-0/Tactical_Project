'use strict';
/* WIP12 display-only effects. Frozen public events are converted to particles
 * with a visual-only seed. No result, damage, collision or unit lookup occurs. */
const TacticalEffects=(()=>{
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function rng(seed){let n=seed>>>0;return()=>{n+=0x6d2b79f5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function create({source=typeof TACTICAL_EFFECT_ATLAS!=='undefined'?TACTICAL_EFFECT_ATLAS:'',particleLimit=384,seenLimit=1024}={}){
    if(!Number.isInteger(particleLimit)||particleLimit<32)throw Error('effect particle limit');
    const image=typeof Image!=='undefined'?new Image():null,particles=[],seen=new Set(),seenQueue=[];let ready=false,error=false,maxParticles=0,dropped=0,particleNumber=0;
    if(image){image.onload=()=>{ready=image.naturalWidth===256&&image.naturalHeight===64;error=!ready;};image.onerror=()=>{error=true;};image.src=source;}
    const cell={muzzle:0,smoke:1,spark:2,tracer:3};
    function push(p){if(particles.length>=particleLimit){particles.shift();dropped++;}particles.push({...p,visualIndex:particleNumber++});maxParticles=Math.max(maxParticles,particles.length);}
    function remember(id){seen.add(id);seenQueue.push(id);if(seenQueue.length>seenLimit)seen.delete(seenQueue.shift());}
    function ingest(event){
      if(!event||seen.has(event.id))return;remember(event.id);const random=rng(event.visualSeed),jitter=()=>random()*2-1;
      if(event.kind==='fire'){
        push({kind:'muzzle',x:event.origin.x,y:event.origin.y,start:event.time,duration:.16,size:25,angle:event.heading,aux:false});
        push({kind:'tracer',x:event.origin.x,y:event.origin.y,start:event.time,duration:Math.max(.05,event.duration),size:28,angle:event.heading,distance:event.distanceM,aux:false});
        for(let i=0;i<3;i++)push({kind:'smoke',x:event.origin.x+jitter()*1.5,y:event.origin.y+jitter()*1.5,start:event.time+.03*i,duration:.65+random()*.3,size:15+random()*12,angle:random()*Math.PI*2,driftX:jitter()*3,driftY:jitter()*3,aux:true});
      }else if(event.kind==='impact'){
        const ricochet=event.effectClass==='ricochet',penetration=event.effectClass==='penetration';
        push({kind:'spark',x:event.position.x,y:event.position.y,start:event.time,duration:ricochet?.34:.26,size:ricochet?29:penetration?25:22,angle:random()*Math.PI*2,aux:false});
        if(ricochet)push({kind:'tracer',x:event.position.x,y:event.position.y,start:event.time,duration:.34,size:23,angle:event.outgoingHeading,distance:85+random()*45,aux:false,ricochet:true});
        const count=ricochet?5:penetration?3:7;
        for(let i=0;i<count;i++)push({kind:i%2?'spark':'smoke',x:event.position.x+jitter()*2,y:event.position.y+jitter()*2,start:event.time+random()*.08,duration:.45+random()*.75,size:10+random()*18,angle:random()*Math.PI*2,driftX:jitter()*7,driftY:jitter()*7,aux:true});
      }
    }
    function sync(events){for(const event of events)ingest(event);}
    function advance(now){for(let i=particles.length-1;i>=0;i--)if(now-particles[i].start>particles[i].duration)particles.splice(i,1);}
    function sprite(ctx,p,x,y,size,alpha,angle=0){
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);
      if(ready)ctx.drawImage(image,cell[p.kind]*64,0,64,64,-size/2,-size/2,size,size);
      else{ctx.fillStyle=p.kind==='smoke'?'#938a76':p.kind==='tracer'?'#fff0a4':'#ffd36b';ctx.beginPath();ctx.arc(0,0,Math.max(1,size/5),0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
    function draw(ctx,now,toScreen,zoom,{reducedMotion=false,quality=1}={}){
      advance(now);
      const q=clamp(quality,.25,1),scale=clamp(Math.sqrt(Math.max(.08,zoom)),.65,1.6);
      for(const p of particles){
        if(reducedMotion&&p.aux)continue;if(p.aux&&q<1&&(p.visualIndex%4)/4>=q)continue;
        const age=now-p.start;if(age<0||age>p.duration)continue;const t=age/p.duration,alpha=p.kind==='tracer'?Math.sin(Math.PI*clamp(t,0,1)):Math.max(0,1-t);
        if(p.kind==='tracer'){
          const distance=p.distance*clamp(t,0,1),head={x:p.x+Math.cos(p.angle)*distance,y:p.y+Math.sin(p.angle)*distance},tailDistance=Math.max(0,distance-clamp(18/Math.max(.01,zoom),8,90)),tail={x:p.x+Math.cos(p.angle)*tailDistance,y:p.y+Math.sin(p.angle)*tailDistance},a=toScreen(tail.x,tail.y),b=toScreen(head.x,head.y);
          ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=p.ricochet?'#ffca73':'#fff1b0';ctx.lineWidth=clamp(2.4*scale,1.2,4);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();
          sprite(ctx,p,b.x,b.y,clamp(p.size*scale,12,42),alpha,p.angle);
        }else{
          const w={x:p.x+(p.driftX||0)*age,y:p.y+(p.driftY||0)*age},s=toScreen(w.x,w.y),growth=p.kind==='smoke'?1+t*.8:1+t*.25;
          sprite(ctx,p,s.x,s.y,clamp(p.size*scale*growth,8,54),alpha,p.angle);
        }
      }
    }
    function reset(){particles.length=0;seen.clear();seenQueue.length=0;maxParticles=0;dropped=0;particleNumber=0;}
    return Object.freeze({sync,advance,draw,reset,stats:()=>({ready,error,particles:particles.length,particleLimit,seen:seen.size,seenLimit,maxParticles,dropped})});
  }
  return Object.freeze({create});
})();
if(typeof module!=='undefined')module.exports=TacticalEffects;
