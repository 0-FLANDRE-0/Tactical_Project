// Isolated DOM adapter checks: real input handlers with a fake renderer/DOM.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
class El{
 constructor(id=''){this.id=id;this.handlers={};this.children=[];this.attrs={};this.style={};this.dataset={};this.textContent='';this._classes=new Set();this.classList={add:n=>this._classes.add(n),remove:n=>this._classes.delete(n),contains:n=>this._classes.has(n),toggle:(n,v)=>{v=v===undefined?!this._classes.has(n):!!v;v?this._classes.add(n):this._classes.delete(n);return v}}}
 addEventListener(n,fn){(this.handlers[n]??=[]).push(fn)}
 fire(type,props={}){const e={type,preventDefault(){},button:0,pointerType:'touch',...props};for(const fn of this.handlers[type]||[])fn(e)}
 getAttribute(k){return this.attrs[k]??null}
 setAttribute(k,v){this.attrs[k]=String(v)}
 appendChild(x){this.children.push(x)}
 querySelector(){return this.child??=new El()}
 remove(){this.removed=true}
 setPointerCapture(){}
 getBoundingClientRect(){return {left:0,top:0,width:651,height:322}}
 getContext(){return {}}
}
const els=new Map(),get=id=>{if(!els.has(id))els.set(id,new El(id));return els.get(id)};
const document=new El('document');Object.assign(document,{hidden:false,getElementById:get,createElement:()=>new El(),documentElement:new El('html')});
const window=new El('window'),context={document,window,console,Math,Buffer,DataView,performance:{now:()=>100},devicePixelRatio:1,requestAnimationFrame(){},ResizeObserver:class{observe(){}},HTMLButtonElement:El,setTimeout:()=>{},TacticalRenderer:class{},CONTOUR_DATA:{},TacticalVisibility:{},TacticalVisibilityClient:class{cancel(){}},module:{exports:{}}};
vm.createContext(context);vm.runInContext(html.match(/<script id="battlefield-data">([\s\S]*?)<\/script>/)[1],context);vm.runInContext(html.match(/<script id="vehicle-profiles">([\s\S]*?)<\/script>/)[1],context);vm.runInContext(html.match(/<script id="sim-core">([\s\S]*?)<\/script>/)[1],context);
vm.runInContext(html.match(/<script id="ui-cache">([\s\S]*?)<\/script>/)[1],context);
// Geometry rendering is orthogonal to event semantics; renderer class is stubbed.
const app=html.match(/<script id="app-code">([\s\S]*?)<\/script>/)[1];
vm.runInContext(app,context);const api=window.__TACTICAL__,sight=get('sight'),canvas=get('map');let passed=0;
function test(name,fn){get('reset').onclick();fn();passed++;console.log('PASS '+name)}
function held(v){assert.equal(api.snapshot().sightHeld,v);assert.equal(sight.attrs['aria-pressed'],String(v));assert.equal(get('mapWrap').classList.contains('sight-on'),v)}
test('hold shows observation and release hides it',()=>{sight.fire('pointerdown',{pointerId:1});held(true);sight.fire('pointerup',{pointerId:1});held(false)});
for(const event of ['pointercancel','lostpointercapture'])test(event+' cannot leave observation stuck',()=>{sight.fire('pointerdown',{pointerId:3});held(true);sight.fire(event,{pointerId:3});held(false)});
test('unrelated pointer release does not release active hold',()=>{sight.fire('pointerdown',{pointerId:4});sight.fire('pointerup',{pointerId:5});held(true);sight.fire('pointerup',{pointerId:4});held(false)});
test('V key supports press and release',()=>{window.fire('keydown',{code:'KeyV',target:document});held(true);window.fire('keyup',{code:'KeyV'});held(false)});
test('keyboard hold survives pointer release',()=>{window.fire('keydown',{code:'KeyV',target:document});sight.fire('pointerdown',{pointerId:6});sight.fire('pointerup',{pointerId:6});held(true);window.fire('keyup',{code:'KeyV'});held(false)});
test('focused sight button supports space without toggling pause',()=>{sight.fire('keydown',{code:'Space'});held(true);assert(!api.snapshot().paused);sight.fire('keyup',{code:'Space'});held(false)});
for(const event of ['blur','visibilitychange'])test(event+' clears held observation',()=>{sight.fire('pointerdown',{pointerId:7});held(true);(event==='blur'?window:document).fire(event);held(false)});
test('reset clears observation and routes',()=>{sight.fire('pointerdown',{pointerId:8});api.command(1350,2400);get('reset').onclick();held(false);assert.equal(api.snapshot().units[0].path.length,0)});
test('tap issues a continuous world destination',()=>{const p=api.worldToScreen(3200,3000);canvas.fire('pointerdown',{pointerId:10,clientX:p.x,clientY:p.y});canvas.fire('pointerup',{pointerId:10,clientX:p.x,clientY:p.y});assert(api.snapshot().units[0].path.length>0);assert(Math.abs(api.snapshot().units[0].goal.x-3200)<1e-6)});
test('map drag does not issue a move command',()=>{canvas.fire('pointerdown',{pointerId:11,clientX:300,clientY:120});canvas.fire('pointermove',{pointerId:11,clientX:440,clientY:150});canvas.fire('pointerup',{pointerId:11,clientX:440,clientY:150});assert.equal(api.snapshot().units[0].path.length,0)});
test('pinch end does not issue an accidental move',()=>{canvas.fire('pointerdown',{pointerId:12,clientX:220,clientY:120});canvas.fire('pointerdown',{pointerId:13,clientX:320,clientY:120});canvas.fire('pointermove',{pointerId:13,clientX:380,clientY:120});canvas.fire('pointerup',{pointerId:13,clientX:380,clientY:120});canvas.fire('pointerup',{pointerId:12,clientX:220,clientY:120});assert.equal(api.snapshot().units[0].path.length,0)});
test('tiny overview model keeps a 24 CSS pixel selection target',()=>{const u=api.snapshot().units.find(u=>u.id==='A12'),p=api.worldToScreen(u.x,u.y);canvas.fire('pointerdown',{pointerId:21,clientX:p.x+18,clientY:p.y+10});canvas.fire('pointerup',{pointerId:21,clientX:p.x+18,clientY:p.y+10});assert.equal(api.snapshot().selected,'A12');assert.equal(api.snapshot().units[0].path.length,0)});
test('close inspection zoom does not change world model dimensions',()=>{for(let i=0;i<25;i++)get('zoomIn').onclick();assert.equal(api.snapshot().camera.zoom,32);assert.equal(api.core.VEHICLE.model.hullLength,7.924799999999999);assert.equal(api.core.VEHICLE.model.width,3.6576);assert.equal(api.core.VEHICLE.radius,4.62)});
test('zoomed hull remains selectable more than 24px away from its centre',()=>{get('roster').children[1].onclick();for(let i=0;i<20;i++)get('zoomIn').onclick();api.select('A11');const u=api.snapshot().units.find(u=>u.id==='A12'),p=api.worldToScreen(u.x+Math.cos(u.heading)*3.1,u.y+Math.sin(u.heading)*3.1),centre=api.worldToScreen(u.x,u.y);assert(Math.hypot(p.x-centre.x,p.y-centre.y)>90);canvas.fire('pointerdown',{pointerId:31,clientX:p.x,clientY:p.y});canvas.fire('pointerup',{pointerId:31,clientX:p.x,clientY:p.y});assert.equal(api.snapshot().selected,'A12');assert.equal(api.snapshot().units[0].path.length,0)});
console.log(JSON.stringify({passed,failed:0,version:'0.4-WIP05'}));
