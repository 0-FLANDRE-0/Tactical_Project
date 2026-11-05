'use strict';
/* Original vector artwork, metres. Layout reference: US Army/DVIDS photo
 * 3055956 (Erick Ritterby, 2016), plus public M1-family planform dimensions.
 * Hull, fender decks and turret are separate layers. No exposed upper track runs.
 * Exterior details are visual approximations, never an armour/collision model. */
const M1A2Art=(()=>{
  const hull=[],turret=[],compiled=new Map();let active=hull;
  const add=(d,fill='body',stroke='seam',w=.025,lod=0)=>active.push({d,fill,stroke,w,lod});
  const rect=(x,y,w,h,fill='deck',stroke='seam',line=.02,lod=1)=>add(`M${x} ${y}h${w}v${h}h${-w}Z`,fill,stroke,line,lod);
  // Corner form: box(x0,y0,x1,y1) avoids sign mistakes on mirrored (+y/-y) parts.
  const box=(x0,y0,x1,y1,fill='deck',stroke='seam',line=.02,lod=1)=>rect(Math.min(x0,x1),Math.min(y0,y1),Math.abs(x1-x0),Math.abs(y1-y0),fill,stroke,line,lod);
  const circle=(x,y,r,fill='deck',stroke='seam',w=.02,lod=1)=>add(`M${x+r} ${y}a${r} ${r} 0 1 0 ${-2*r} 0a${r} ${r} 0 1 0 ${2*r} 0Z`,fill,stroke,w,lod);
  const line=(d,color='seam',w=.025,lod=1)=>add(d,null,color,w,lod);
  const poly=(pts,fill,stroke='seam',w=.025,lod=0)=>add('M'+pts.map(p=>p[0]+' '+p[1]).join('L')+'Z',fill,stroke,w,lod);
  const r3=v=>Math.round(v*1000)/1000;
  function bolts(x,y,w,h,count=4){let d='';for(let i=0;i<count;i++){const xx=r3(x+.08+(w-.16)*i/(count-1));for(const yy of [y+.045,y+h-.045])d+=`M${r3(xx+.022)} ${r3(yy)}a.022 .022 0 1 0 -.044 0a.022 .022 0 1 0 .044 0Z`;}add(d,'metal',null,0,3);}
  // One Path2D per grille: ribs are merged so dense details stay cheap to draw.
  function grille(x0,y0,x1,y1,alongX=false,step=.07,lod=1){
    const x=Math.min(x0,x1),y=Math.min(y0,y1),w=Math.abs(x1-x0),h=Math.abs(y1-y0);let d='';
    if(alongX)for(let yy=y+step/2;yy<y+h-.01;yy+=step)d+=`M${r3(x+.03)} ${r3(yy)}h${r3(w-.06)}`;
    else for(let xx=x+step/2;xx<x+w-.01;xx+=step)d+=`M${r3(xx)} ${r3(y+.03)}v${r3(h-.06)}`;
    rect(x,y,w,h,'grille','shadow',.025,lod);line(d,'rib',.026,lod+1);rect(x+.025,y+.025,w-.05,h-.05,null,'metal',.012,3);
  }
  function mesh(x0,y0,x1,y1,step=.11,lod=2,color='mesh'){
    const x=Math.min(x0,x1),y=Math.min(y0,y1),w=Math.abs(x1-x0),h=Math.abs(y1-y0);let d='';
    for(let k=-h;k<w;k+=step){const a=Math.max(0,k),b=Math.min(w,k+h);if(b-a<.01)continue;d+=`M${r3(x+a)} ${r3(y+a-k)}L${r3(x+b)} ${r3(y+b-k)}M${r3(x+a)} ${r3(y+h-(a-k))}L${r3(x+b)} ${r3(y+h-(b-k))}`;}
    line(d,color,.014,lod);
  }
  function handle(x,y){add(`M${x} ${y+.05}v-.1q.06 -.06 .12 0v.1`,null,'shadow',.035,2);line(`M${x+.025} ${y+.04}v-.1h.07v.1`,'light',.018,3);}
  const HX=3.9624,HY=1.8288;
  // ---------------- HULL ----------------
  // Planform traced from USMC MCWP 3-12 A-3 (M1 family), hull scaled to 7.9248 x 3.6576m.
  // Upper track runs are fully hidden by the side skirts / fenders seen from above.
  add(`M${-HX} ${-HY+.04}Q${-HX} ${-HY} ${-HX+.04} ${-HY}H${HX-.04}Q${HX} ${-HY} ${HX} ${-HY+.04}V${HY-.04}Q${HX} ${HY} ${HX-.04} ${HY}H${-HX+.04}Q${-HX} ${HY} ${-HX} ${HY-.04}Z`,'body','shadow',.045,0);
  // Long skirt tops / fenders, full length, with skirt-panel seams.
  for(const s of [-1,1]){
    box(-3.92,s*1.05,2.40,s*1.80,'fender','seam',.028,0);
    line(`M-3.88 ${s*1.765}H2.36`,'light',.022,2);
    line([1.42,.30,-.82,-1.94,-3.06].map(x=>`M${x} ${s*1.07}V${s*1.79}`).join(''),'seam',.022,1);
    // Front fender stowage boxes (outer box carries the front light guard).
    box(3.02,s*1.04,3.93,s*1.81,'deck','shadow',.03,0);
    box(3.08,s*1.10,3.87,s*1.38,null,'seam',.018,2);
    circle(3.55,s*1.60,.15,'body','shadow',.025,1);line(`M3.46 ${s*1.51}L3.64 ${s*1.69}M3.46 ${s*1.69}L3.64 ${s*1.51}`,'light',.02,2);
    box(3.80,s*1.10,3.94,s*1.34,'shadow','seam',.018,1);box(3.84,s*1.14,3.93,s*1.30,'lamp','metal',.012,2);
    box(2.40,s*1.06,3.00,s*1.78,'deck','seam',.025,1);line(`M2.95 ${s*1.12}V${s*1.72}`,'shadow',.03,2);handle(2.60,s*1.42);
  }
  // Front glacis between the fender boxes; glacis break line and driver's station.
  box(2.40,-1.04,3.93,1.04,'glacis','seam',.03,0);
  line('M3.44 -1.0V1.0','light',.025,1);line('M3.90 -1.02V1.02','shadow',.03,1);
  add('M2.36 -.31L2.48 -.47H3.07L3.20 -.29V.29L3.07 .47H2.48L2.36 .31Z','body','shadow',.03,1);
  line('M2.53 -.35H3.00L3.10 -.24V.24L3.00 .35H2.53Z','light',.018,2);
  for(const yy of [-.31,0,.31])box(3.20,yy-.10,3.38,yy+.10,'glass','shadow',.025,2);
  handle(2.62,.05);
  // Centre deck under the turret; rear engine deck runs to the transverse exhaust grille.
  box(-3.74,-1.05,2.40,1.05,'deck','seam',.03,0);
  line('M-2.84 -1.03V1.03M-.98 -1.03V1.03','seam',.022,1);
  // Engine-deck intake grilles (centre pair and left pair) per DVIDS 3055956.
  // They sit under the bustle with the gun forward and show when the turret traverses.
  grille(-2.55,-.56,-1.88,-.03);grille(-2.55,.03,-1.88,.56);
  grille(-2.78,-1.00,-2.10,-.62);
  // Left-side turbine air inlet grille alongside the turret (USMC A-3 hatched area).
  box(-2.27,-1.45,-1.10,-1.74,'grille','shadow',.025,1);mesh(-2.25,-1.47,-1.12,-1.72,.06,2,'rib');
  // Rear deck access doors, tow shackles and transverse exhaust grille.
  for(const s of [-1,1]){
    box(-3.65,s*.60,-3.26,s*1.03,'body','seam',.025,1);handle(-3.52,s*.82);
    circle(-3.49,s*1.57,.10,'shadow','metal',.02,1);circle(-3.49,s*1.57,.045,'metal',null,0,2);
  }
  grille(-3.96,-1.10,-3.74,1.10,true,.11,0);
  // Turret race lies below the turret and is only visible during traversing.
  circle(.15,0,1.18,'shadow','seam',.04,0);circle(.15,0,1.08,'body','metal',.025,1);
  active=turret;
  // ---------------- TURRET (local frame, +.15m from hull centre) ----------------
  // Outline traced from USMC A-3: blunt, near-transverse face beside the gun shield,
  // short swept cheeks reaching full width ~0.5m behind the face, flat slab sides,
  // long bustle and a rear bustle rack. The left (loader) cheek sweeps further back
  // than the right (gunner/GPS) cheek, as drawn in the reference planform.
  // Bustle rack first: the turret body overlaps its front.
  add('M-2.25 -1.43H-2.79Q-2.97 -1.43 -2.97 -1.25V1.40Q-2.97 1.58 -2.79 1.58H-2.25Z','basket','shadow',.03,0);
  mesh(-2.95,-1.40,-2.40,1.55,.10,2);
  line('M-2.25 -1.43H-2.79Q-2.97 -1.43 -2.97 -1.25V1.40Q-2.97 1.58 -2.79 1.58H-2.25M-2.94 -.95H-2.42M-2.94 -.20H-2.42M-2.94 .55H-2.42M-2.94 1.20H-2.42','metal',.03,1);
  for(const [x0,y0,x1,y1]of [[-2.90,-1.30,-2.55,-.70],[-2.88,-.55,-2.52,.15],[-2.90,.62,-2.58,1.42]]){
    box(x0,y0,x1,y1,'canvas','shadow',.022,2);line(`M${x0+.04} ${y0+.13}H${x1-.04}M${x0+.04} ${y1-.13}H${x1-.04}`,'strap',.032,2);
  }
  const OUT=[[2.13,.31],[2.04,.78],[1.65,1.67],[.06,1.71],[-2.29,1.60],[-2.42,1.42],[-2.42,-1.30],[-2.29,-1.43],[-1.25,-1.57],[1.31,-1.56],[2.06,-.66],[2.13,-.31]];
  poly(OUT,'body','shadow',.045,0);
  // Sloped cheek / side faces (lit and shaded) around the flat roof.
  poly([[2.13,.31],[2.04,.78],[1.65,1.67],[1.44,1.33],[1.87,.31]],'rightCheek','seam',.022,0);
  poly([[2.13,-.31],[2.06,-.66],[1.31,-1.56],[1.10,-1.21],[1.87,-.31]],'leftCheek','seam',.022,0);
  const ROOF=[[1.87,.31],[1.44,1.33],[-1.24,1.29],[-2.28,1.24],[-2.28,-1.12],[-.20,-1.21],[1.10,-1.21],[1.87,-.31]];
  poly(ROOF,'roof','seam',.025,0);
  line('M1.84 .40L1.46 1.29M1.84 -.40L1.13 -1.17','light',.022,1);
  // Side stowage bins on the bustle flanks.
  poly([[.06,1.335],[.06,1.70],[-1.95,1.625],[-1.95,1.275]],'bustle','shadow',.028,0);
  poly([[.06,-1.215],[.06,-1.565],[-1.25,-1.57],[-1.95,-1.476],[-1.95,-1.155]],'bustle','shadow',.028,0);
  line('M-.62 1.33V1.68M-1.30 1.30V1.65M-.62 -1.21V-1.57M-1.30 -1.19V-1.55','seam',.022,1);
  line('M.02 1.645L-1.91 1.575M.02 -1.515H-1.25L-1.91 -1.43','light',.018,2);
  for(const [x,y] of [[-.38,1.50],[-1.06,1.47],[-1.68,1.45],[-.38,-1.39],[-1.06,-1.38],[-1.68,-1.33]])handle(x,y);
  // Smoke grenade launchers (2 x 3 tubes) just behind each cheek corner.
  for(const s of [-1,1]){
    const y0=s>0?1.36:-1.21;
    box(.27,y0,.61,y0+s*.32,'shadow','seam',.022,1);
    let d='';for(let j=0;j<2;j++)for(let i=0;i<3;i++){const cx=r3(.34+i*.10+j*.04),cy=r3(y0+s*(.09+j*.14));d+=`M${r3(cx+.045)} ${cy}a.045 .045 0 1 0 -.09 0a.045 .045 0 1 0 .09 0Z`;}
    add(d,'rubber','metal',.014,2);
  }
  // Two bustle roof (ammunition blow-off) panels.
  for(const [y0,y1] of [[-.75,.045],[.075,.90]]){
    box(-2.22,y0,-1.115,y1,'deck','seam',.03,1);bolts(-2.22,y0,1.105,y1-y0,5);
    circle(-1.88,y0+.22,.07,'roof','light',.015,2);circle(-1.88,y1-.22,.07,'roof','light',.015,2);
    handle(-1.42,(y0+y1)/2);
  }
  // Antenna bases at the bustle rear corners.
  for(const y of [-1.02,1.12]){circle(-2.15,y,.09,'shadow','metal',.02,2);circle(-2.15,y,.032,'metal',null,0,2);}
  // Loader's hatch (left) and commander's station (right), touching as drawn in A-3.
  circle(-.46,-.406,.42,'shadow','seam',.03,1);circle(-.46,-.406,.35,'roof','light',.025,1);
  line('M-.76 -.43H-.16M-.46 -.70V-.11','seam',.022,2);handle(-.52,-.35);
  circle(-.525,.534,.52,'shadow','metal',.025,1);circle(-.525,.534,.46,'body','seam',.02,1);circle(-.525,.534,.35,'deck','seam',.025,1);
  circle(-.525,.534,.28,null,'light',.02,2);handle(-.585,.56);
  {let d='';for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8,cx=-.525+Math.cos(a)*.405,cy=.534+Math.sin(a)*.405,ca=Math.cos(a),sa=Math.sin(a),p=(u,v)=>`${r3(cx+u*ca-v*sa)} ${r3(cy+u*sa+v*ca)}`;d+=`M${p(-.03,-.065)}L${p(.03,-.065)}L${p(.03,.065)}L${p(-.03,.065)}Z`;}add(d,'glass','shadow',.012,2);}
  // Gunner's primary sight "doghouse" ahead of the commander, window facing forward.
  box(.31,.44,.80,1.16,'deck','shadow',.035,1);box(.37,.50,.70,1.10,'roof','seam',.02,2);
  box(.72,.56,.84,1.04,'glass','shadow',.022,2);line('M.45 .50V1.10M.58 .50V1.10','light',.016,3);
  // M1A2 Commander's Independent Thermal Viewer ahead of the loader's hatch.
  circle(.424,-.673,.27,'shadow','seam',.03,1);circle(.424,-.673,.21,'deck','metal',.02,1);
  add('M.30 -.82H.56Q.64 -.82 .64 -.74V-.60Q.64 -.53 .56 -.53H.30Z','body','shadow',.022,1);
  box(.60,-.78,.68,-.57,'glass','shadow',.018,2);
  // Roof weapons: commander's M2 over the GPS, loader's M240 beside the hatch.
  box(-.12,.40,.36,.56,'gunMetal','shadow',.015,2);line('M.36 .48H1.38','gunMetal',.05,2);box(-.08,.58,.20,.74,'ammo','shadow',.015,2);
  box(-.34,-1.05,.02,-.92,'gunMetal','shadow',.015,2);line('M.02 -.985H.46','gunMetal',.04,2);box(-.28,-1.17,-.04,-1.05,'ammo','shadow',.015,3);
  // Gun shield / mantlet between the cheeks.
  box(1.78,-.31,2.33,.31,'body','shadow',.03,0);box(1.83,-.26,2.10,.26,'deck','seam',.02,1);
  box(2.13,-.29,2.33,.29,'roof','seam',.02,1);circle(2.23,-.19,.03,'metal',null,0,3);circle(2.23,.19,.03,'metal',null,0,3);
  rect(2.16,.14,.10,.07,'shadow',null,0,2);
  // M256 120mm: rear tube, thermal-sleeve clamp rings, bore evacuator, sleeved
  // front tube, muzzle collar and muzzle reference sensor. Muzzle stays at the
  // published 9.8298m overall length (5.8674m ahead of hull centre).
  add('M2.30 -.117H3.03L3.12 -.165H3.85L3.94 -.105H5.30V-.122H5.37V-.092H5.717V.092H5.37V.122H5.30V.105H3.94L3.85 .165H3.12L3.03 .117H2.30Z','barrel','shadow',.025,0);
  line('M2.36 -.05H3.08M3.16 -.085H3.82M3.98 -.045H5.68','barrelLight',.035,1);
  line('M2.72 -.125V.125M2.77 -.125V.125M2.82 -.125V.125','shadow',.02,2);
  line('M3.12 -.16V.16M3.85 -.16V.16M4.45 -.10V.10M4.95 -.10V.10','seam',.022,2);
  box(5.43,-.06,5.56,.06,'deck','shadow',.015,2);box(5.70,-.07,5.717,.07,'rubber',null,0,1);
  const palettes={
    olive:{body:'#69745a',deck:'#7b8468',fender:'#727d61',glacis:'#788366',roof:'#828b70',bustle:'#687258',leftCheek:'#7d886b',rightCheek:'#606d52',shadow:'#384633',seam:'#44503a',light:'#a0a98a',grille:'#293628',rib:'#66725a',rubber:'#232a23',trackEdge:'#697363',metal:'#9ba38e',glass:'#243b3d',lamp:'#d4d9bb',basket:'#56634b',gunMetal:'#2a3430',ammo:'#566048',barrel:'#778367',barrelLight:'#a8b091',canvas:'#6c735e',strap:'#454b3c',mesh:'#2c3828'},
    sand:{body:'#ad9d78',deck:'#b9ac87',fender:'#ac9c77',glacis:'#bbad87',roof:'#c2b48f',bustle:'#a29372',leftCheek:'#c2b18b',rightCheek:'#a08f6c',shadow:'#625c46',seam:'#776d52',light:'#d9cba6',grille:'#4c4b3c',rib:'#9a8e6c',rubber:'#30332b',trackEdge:'#7f806b',metal:'#c8bea2',glass:'#2c4140',lamp:'#e3dfc6',basket:'#8c8265',gunMetal:'#333a33',ammo:'#8c8668',barrel:'#b6a57f',barrelLight:'#dfcca4',canvas:'#8e8b6c',strap:'#5a5c46',mesh:'#5a5543'}
  };
  function drawLayer(g,items,palette,lod){
    for(const part of items){if(part.lod>lod)continue;
      let p=compiled.get(part);if(!p){p=new Path2D(part.d);compiled.set(part,p);}
      if(part.fill){g.fillStyle=palette[part.fill]||part.fill;g.fill(p);}
      if(part.stroke){g.strokeStyle=palette[part.stroke]||part.stroke;g.lineWidth=part.w;g.stroke(p);}
    }
  }
  const TURRET_SHADOW=typeof Path2D!=='undefined'?new Path2D('M2.33 -.31H2.13L2.06 -.66L1.31 -1.56L-1.25 -1.57L-2.29 -1.43H-2.97V1.58H-2.29L.06 1.71L1.65 1.67L2.04 .78L2.13 .31H2.33ZM2.33 -.12H5.72V.12H2.33Z'):null;
  function draw(g,u,zoom,model){
    const palette=palettes[u.team==='red'?'sand':'olive'],lod=zoom>16?3:zoom>6?2:zoom>2?1:0;
    g.save();g.scale(zoom,zoom);g.lineJoin='round';g.lineCap='round';
    g.save();g.rotate(u.heading);g.fillStyle='#17201745';g.fillRect(-model.hullLength/2+.14,-model.width/2+.18,model.hullLength,model.width);drawLayer(g,hull,palette,lod);g.restore();
    g.save();g.rotate(u.turret);g.translate(model.turretCenter,0);
    g.save();g.translate(.11,.13);g.fillStyle='#15201345';g.fill(TURRET_SHADOW);g.restore();
    drawLayer(g,turret,palette,lod);g.restore();g.restore();
  }
  const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  function toSVG({heading=0,turretHeading=0,palette='olive'}={}){
    const colors=palettes[palette],layer=items=>items.map(p=>`<path d="${escape(p.d)}" fill="${p.fill?colors[p.fill]||p.fill:'none'}"${p.stroke?` stroke="${colors[p.stroke]||p.stroke}" stroke-width="${p.w}"`:' stroke="none"'}/>`).join('\n');
    const rotated=Math.abs(heading)+Math.abs(turretHeading)>.001,size=rotated?'width="1000" height="1000" viewBox="-6.5 -6.5 13 13"':'width="1440" height="720" viewBox="-5 -2.5 12 5"';
    return `<svg xmlns="http://www.w3.org/2000/svg" ${size} role="img" aria-label="M1A2 Abrams top view"><title>M1A2 Abrams · top view</title><desc>Original vector interpretation based on US Army DVIDS 3055956. Planform traced from USMC MCWP 3-12 A-3; blunt turret face, bustle rack, side skirts, engine-deck grilles, CITV, GPS, hatches and M256. Exterior detail is approximate.</desc><g stroke-linejoin="round" stroke-linecap="round"><g transform="rotate(${heading*180/Math.PI})">${layer(hull)}</g><g transform="rotate(${turretHeading*180/Math.PI}) translate(.15 0)">${layer(turret)}</g></g></svg>`;
  }
  return {draw,toSVG,palettes,geometry:{hull,turret}};
})();
if(typeof module!=='undefined')module.exports=M1A2Art;
