const O=require('../../src/observation.js'),base=require('../../src/vehicle-profiles.js').M1A2;
function fixture({seed=7,distance=1000,bearing=0,visible=true,profile=null}={}){
 const p=profile||structuredClone(base),u={id:'observer',name:'ALLY',team:'blue',x:500,y:1500,heading:0,turret:0,commander:0},t={id:'SECRET-ID',name:'SECRET-NAME',team:'red',x:500+distance*Math.cos(bearing),y:1500+distance*Math.sin(bearing),heading:.8,turret:1.4,commander:2};
 O.init(u);O.init(t);let calls=0,blocked=!visible,forestDepth=0,hull=true,turret=true;
 const runtime=O.create({seed,profileOf:v=>v===u?p:base,exposure:(a,b)=>{calls++;return{samples:Array.from({length:9},(_,i)=>({x:b.x,y:b.y,part:i<6?'hull':'turret',visible:!blocked&&(i<6?hull:turret),forestDepth}))};}});
 const s={time:0,units:[u,t]},step=(seconds=.05)=>{const n=Math.round(seconds/.05);for(let i=0;i<n;i++){s.time+=.05;runtime.advance(s.units,.05,s.time);}};
 const guard=(ch='commander',point={x:t.x,y:t.y},duration=0)=>O.guard(u,ch,point,duration,s.time);
 return{O,p,u,t,s,runtime,step,guard,contacts:()=>runtime.contacts('blue'),calls:()=>calls,block:v=>blocked=v,forest:v=>forestDepth=v,parts:(h,t)=>{hull=h;turret=t;}};
}
module.exports={fixture,base,O};
