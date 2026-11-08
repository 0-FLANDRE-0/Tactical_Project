const test=require('node:test'),assert=require('node:assert/strict'),{fixture}=require('./helpers/observation-core-fixture.cjs');
function ready(seed=17){const f=fixture('flat',{target:{x:1000,y:1000},seed});f.step(160);assert(f.C.designate(f.s,f.u,f.contact().key));f.step(80);assert(f.C.fireStatus(f.s,f.u).canFire);return f;}
function fireAndLand(f,{hide=false}={}){const key=f.contact().key,before=f.t.combat.hp;assert(f.C.requestFire(f.s,f.u,key).ok);assert.equal(f.t.combat.hp,before);f.step();const fired=f.C.fireEvents(f.s).find(e=>e.type==='fired'&&!f.__seen?.has(e.id));f.__seen??=new Set();f.__seen.add(fired.id);if(hide){f.u.turret+=Math.PI;f.u.commander+=Math.PI;}while(f.s.time<fired.impactAt+.051)f.step();return{before,after:f.t.combat.hp,impact:f.C.fireEvents(f.s).find(e=>e.type==='impact'&&e.id===fired.id),internal:f.C.fireDebugRecords(f.s).find(e=>e.id===fired.id)};}

test('V05 real core applies no launch damage and exactly one impact-time damage',()=>{
 const f=ready(),r=fireAndLand(f);assert.equal(r.internal.result,'hit');assert(r.after<r.before);assert.equal(r.impact.combat.damage,r.before-r.after);const hp=r.after;for(let i=0;i<20;i++){f.C.fireEvents(f.s);f.C.fireStatus(f.s,f.u);f.C.combatView(f.t);}assert.equal(f.t.combat.hp,hp);assert.equal(f.C.combatEvents(f.s).length,1);
});

test('V08 an unobserved resolved hit still damages internally without public armour or HP leakage',()=>{
 const f=ready(3),key=f.contact().key;f.t.combat.hp=1;const r=fireAndLand(f,{hide:true});assert.equal(r.internal.result,'hit');assert.equal(r.after,0);assert.equal(f.t.combat.status,'destroyed');assert.equal(r.impact.result,'unobserved');assert.equal(r.impact.zone,null);assert.equal(r.impact.combat,null);assert(!f.C.contacts(f.s).some(c=>c.wreck));assert.equal(f.C.designate(f.s,f.u,key),false);const publicText=JSON.stringify(f.C.fireEvents(f.s));assert(!publicText.includes('hpAfter'));assert(!publicText.includes('targetId'));
});

test('V09/V14 cumulative damage destroys once, rejects actions and leaves a blocking observed wreck',()=>{
 const f=ready(5),key=f.contact().key;let shots=0;while(f.t.combat.status!=='destroyed'&&shots<8){fireAndLand(f);shots++;if(f.t.combat.status!=='destroyed')f.step(44);}
 assert.equal(f.t.combat.status,'destroyed');assert.equal(f.t.combat.hp,0);assert.equal(f.C.combatStats(f.s).destroyed,1);assert.equal(f.t.state,'격파');assert.equal(f.t.speed,0);assert.equal(f.t.path.length,0);
 const wreck=f.C.contacts(f.s).find(c=>c.key===key);assert(wreck?.wreck&&wreck.destroyed);assert(!wreck.current);assert.equal(f.C.designate(f.s,f.u,key),false);assert.equal(f.C.requestFire(f.s,f.u,key).ok,false);assert.equal(f.C.passable(f.t.x,f.t.y,f.s.units,f.u),false);
 assert.equal(f.C.issueMove(f.t,{x:f.t.x+20,y:f.t.y},false,f.s.units).ok,false);assert.equal(f.C.guard(f.s,f.t,'gunner',{x:0,y:0}),false);assert.equal(f.C.resumeObservation(f.s,f.t,'gunner'),false);assert.equal(f.C.cancelDesignation(f.s,f.t),false);
 for(let i=0;i<30;i++)f.step();assert.equal(f.C.combatStats(f.s).destroyed,1);
});

test('V10 a round already in flight survives shooter destruction; later rounds against a wreck are safe',()=>{
 const f=ready(8),key=f.contact().key,before=f.t.combat.hp;assert(f.C.requestFire(f.s,f.u,key).ok);f.step();const fired=f.C.fireEvents(f.s)[0];f.u.combat.hp=0;f.u.combat.status='destroyed';f.u.state='격파';while(f.s.time<fired.impactAt+.051)f.step();assert(f.t.combat.hp<before);assert.equal(f.C.requestFire(f.s,f.u,key).reason,'destroyed');
 f.t.combat.hp=0;f.t.combat.status='destroyed';const stats=f.C.combatStats(f.s);assert(stats.applied>=1);
});

test('V12 fixed-step batching and repeated public/UI-style reads reproduce HP and records',()=>{
 function run(batch){const f=ready(31);for(let shot=0;shot<3;shot++){const key=f.contact().key;assert(f.C.requestFire(f.s,f.u,key).ok);for(let i=0;i<50;i+=batch){f.step(batch);for(let n=0;n<7;n++){f.C.contacts(f.s);f.C.fireEvents(f.s);f.C.fireStatus(f.s,f.u,key);f.C.combatView(f.t);}}}return{hp:f.t.combat.hp,status:f.t.combat.status,events:f.C.combatEvents(f.s),shots:f.C.fireEvents(f.s)};}
 assert.deepEqual(run(1),run(2));
});

test('V13 a fresh scenario/object with the same IDs inherits no HP, destruction, impacts or contacts',()=>{
 const a=ready();fireAndLand(a);assert(a.t.combat.hp<1450);const b=fixture('flat',{target:{x:1000,y:1000},seed:17});assert.equal(b.t.id,a.t.id);assert.equal(b.t.combat.hp,1450);assert.equal(b.t.combat.status,'alive');assert.deepEqual(b.C.combatEvents(b.s),[]);assert.deepEqual(b.C.fireEvents(b.s),[]);assert.equal(b.C.contacts(b.s).length,0);
});
