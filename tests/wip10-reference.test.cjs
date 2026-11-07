const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {F,P,pose,exposure}=require('./helpers/hit-fixture.cjs'),reference=require('./releases/WIP10-reference.json');
const near=(a,b,e=.00011)=>assert(Math.abs(a-b)<=e,`${a} != ${b} (tolerance ${e})`);
const full=exposure(),hidden=Array(6).fill(false),upper=[false,true,false,true,false,true];

function preview(name,range){
 const observer={x:0,y:0,speed:name.includes('자차')?10:0},target=pose(range,0,name.startsWith('측면')?Math.PI/2:0),shown=name.includes('포탑만')?exposure(hidden):name.includes('상단만')?exposure(upper):full;
 return F.estimate(observer,target,shown,{...P.fireControl,maxRange:4000},{x:0,y:name.includes('횡단')?10:0},name.includes('3s')?3:1.2);
}
function impactCase(row){
 const stationary=row.case.startsWith('정지 표적'),vcross=stationary?0:10,firePose=pose(2000,0,Math.PI/2),initial=F.estimate({x:0,y:0,speed:0},firePose,full,P.fireControl,{x:0,y:vcross},1.2);
 const shot={shooterId:'A',number:1,origin:{x:0,y:0},beta:0,predicted:{x:2000,y:0},pose:firePose,fireControl:P.fireControl,fireExposure:full,aim:initial.breakdown.aim,sigma:initial.breakdown.sigma};
 const actual={...firePose,x:2000+row.dR,y:row.bias_x},evaluation=F.impactEvaluation(shot,{...full,presented:P.fireControl.presented,pose:actual});
 return{initial,evaluation};
}

test('unchanged supplied WIP10 Python generated all 46 reference rows',()=>{
 const source=fs.readFileSync(path.join(__dirname,'fixtures/wip10_hit_reference.py'));
 assert.equal(crypto.createHash('sha256').update(source).digest('hex'),'142e5001ee9bd4042a88e6011a1342a2b96cc94eb093f9b0faec069c6aaf6dc6');
 assert.deepEqual(Object.fromEntries(Object.entries(reference).map(([key,rows])=>[key,rows.length])),{preview:24,impact:6,zones:11,drop:5});
});
test('WIP10 launch preview matches all Python rows after removing sigma-man',()=>{
 for(const row of reference.preview){const result=preview(row.case,row.range),b=result.breakdown;near(result.hitChance,row.hit);near(b.pHull,row.hull);near(b.pTurret,row.turret);near(b.sigma.x,row.sigmaX);near(b.sigma.z,row.sigmaZ);near(b.tof,row.tof,.00051);assert(!('man' in b.sigma));}
});
test('impact-time lateral/radial bias and final masses match all Python rows',()=>{
 for(const row of reference.impact){const{evaluation:e}=impactCase(row);near(e.bias.lateral,row.bias_x,.00011);near(e.bias.radial,row.dR,.00011);near(e.finalHitChance,row.hit,.0006);near(e.pHull,row.hull,.0006);near(e.pTurret,row.turret,.0006);}
});
test('box projection and independent side hand match all Python rows',()=>{
 for(const row of reference.zones){const angle=row.angle*Math.PI/180,observer={x:Math.cos(angle)*100,y:Math.sin(angle)*100},target={x:0,y:0,heading:0,turret:0,model:P.model};for(const [part,expected] of [['hull',row.hull],['turret',row.turret]]){const masses=part==='hull'?{pHull:1,pTurret:0}:{pHull:0,pTurret:1},q=F.distribution(observer,target,masses);near(q[part+'Front'],expected.front,.00011);near(q[part+'Side'],expected.side,.00011);near(q[part+'Rear'],expected.rear,.00011);assert.equal(F.sideFor(observer,target,part+'Side'),expected.sideHand);}near(Object.values(F.distribution(observer,target,{pHull:.6,pTurret:.4})).reduce((a,b)=>a+b),1,1e-9);}
});
test('parabolic height relative to chord matches every Python row',()=>{
 const speed=P.fireControl.muzzleVelocity*P.fireControl.velocityRetention;for(const row of reference.drop)near(F.pathHeight(0,0,row.s,row.R1,speed),row.offsetFromChord,.00011);
});
test('1000 seeds keep hit points inside selected part and misses outside every rectangle',()=>{
 const firePose=pose(1000),initial=F.estimate({x:0,y:0},firePose,full,P.fireControl,{x:0,y:0},1.2),shot={shooterId:'A',number:1,origin:{x:0,y:0},beta:0,predicted:{x:1000,y:0},pose:firePose,fireControl:P.fireControl,fireExposure:full,aim:initial.breakdown.aim,sigma:initial.breakdown.sigma},e=F.impactEvaluation(shot,{...full,presented:P.fireControl.presented,pose:firePose}),hull=e.rects.find(r=>r.part==='hull'),inside=(p,r)=>p.x>=r.x1&&p.x<=r.x2&&p.z>=r.z1&&p.z<=r.z2;
 for(let seed=0;seed<1000;seed++){const hit=F.sampleImpactPlane(shot,e,{hit:true,zone:'hullFront'},seed),miss=F.sampleImpactPlane(shot,e,{hit:false,zone:null},seed);assert(inside(hit,hull));assert(e.rects.every(r=>!inside(miss,r)));}
 const forced=F.sampleImpactPlane({...shot,fireControl:{...P.fireControl,impact:{...P.fireControl.impact,rejectionAttempts:0}}},e,{hit:true,zone:'hullFront'},1);assert(forced.fallback);assert(inside(forced,hull));
});
test('flat and building marches distinguish short, long and building impacts',()=>{
 const shot={origin:{x:0,y:100},fireEye:2.2,beta:0,fireControl:P.fireControl},pose1={x:1000,y:100},flat={heightAt:()=>0,buildingAt:()=>null,world:{w:5000,h:5000}};
 const long=F.marchImpact(shot,pose1,{x:0,z:3},flat),short=F.marchImpact(shot,pose1,{x:0,z:-1},flat);assert.equal(long.kind,'ground');assert(long.beyond>0);assert.equal(short.kind,'ground');assert(short.beyond<0);
 const wall={...flat,buildingAt:(x,y)=>x>=490&&x<=510&&Math.abs(y-100)<10?{roof:10}:null},building=F.marchImpact(shot,pose1,{x:0,z:3},wall);assert.equal(building.kind,'building');assert(building.x>=489&&building.x<=511);
});
