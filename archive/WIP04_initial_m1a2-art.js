'use strict';
/* Original vector artwork, metres. Layout reference: US Army/DVIDS photo
 * 3055956 (Erick Ritterby, 2016), plus public M1-family planform dimensions.
 * Hull, fender decks and turret are separate layers. No exposed upper track runs.
 * Exterior details are visual approximations, never an armour/collision model. */
const M1A2Art=(()=>{
  const hull=[],turret=[],compiled=new Map();let active=hull;
  const add=(d,fill='body',stroke='seam',w=.025,lod=0)=>active.push({d,fill,stroke,w,lod});
  const rect=(x,y,w,h,fill='deck',stroke='seam',line=.02,lod=1)=>add(`M${x} ${y}h${w}v${h}h${-w}Z`,fill,stroke,line,lod);
  const circle=(x,y,r,fill='deck',stroke='seam',w=.02,lod=1)=>add(`M${x+r} ${y}a${r} ${r} 0 1 0 ${-2*r} 0a${r} ${r} 0 1 0 ${2*r} 0Z`,fill,stroke,w,lod);
  const line=(d,color='seam',w=.025,lod=1)=>add(d,null,color,w,lod);
  function bolts(x,y,w,h,count=4){for(let i=0;i<count;i++){const xx=x+.08+(w-.16)*i/(count-1);circle(xx,y+.045,.022,'metal',null,0,3);circle(xx,y+h-.045,.022,'metal',null,0,3);}}
  function grille(x,y,w,h,vertical=false){
    rect(x,y,w,h,'grille','shadow',.025,1);
    if(vertical)for(let xx=x+.045;xx<x+w;xx+=.075)line(`M${xx} ${y+.025}v${h-.05}`,'rib',.028,2);
    else for(let yy=y+.045;yy<y+h;yy+=.075)line(`M${x+.025} ${yy}h${w-.05}`,'rib',.028,2);
    rect(x+.035,y+.035,w-.07,h-.07,null,'metal',.012,3);
  }
  function handle(x,y){add(`M${x} ${y+.05}v-.1q.06 -.06 .12 0v.1`,null,'shadow',.035,2);line(`M${x+.025} ${y+.04}v-.1h.07v.1`,'light',.018,3);}
  // Only the front/rear return tips can peek beyond the fender deck.
  for(const side of [-1,1]){
    const yy=side<0?-1.77:1.18;
    rect(-3.92,yy,7.82,.59,'rubber',null,0,0);
    for(const x of [-3.88,-3.78,3.68,3.78])line(`M${x} ${yy+.02}v.55`,'trackEdge',.045,2);
  }
  // Main upper hull. Rounded front corners leave tiny track-return tips visible.
  add('M-3.9624 -1.15L-3.66 -1.8288H3.48L3.9624 -1.12V1.12L3.48 1.8288H-3.66L-3.9624 1.15Z','body','shadow',.045);
  add('M-3.8 -1.15H2.12L3.90 -.99V.99L2.12 1.15H-3.8Z','deck','seam',.035);
  // Solid fender / skirt top decks cover the complete upper track runs.
  for(const s of [-1,1]){
    const y=s<0?-1.8288:1.17;
    add(`M-3.65 ${y}H3.48L3.72 ${y+.16}V${y+.48}L3.49 ${y+.6588}H-3.65Z`,'fender','seam',.028);
    for(const x of [-3.14,-2.04,-.91,.23,1.37,2.48]){
      line(`M${x} ${y+.04}v.57`,'seam',.025,1);rect(x+.04,y+.07,.16,.11,'deck','shadow',.018,2);
      circle(x+.15,y+.55,.028,'metal',null,0,3);
    }
    line(`M-3.59 ${y+.035}H3.42`,'light',.025,2);
    handle(2.72,y+.31);handle(-3.40,y+.31);
  }
  // Rear powerpack deck: access panels, intake grilles and panel fasteners.
  rect(-3.80,-1.10,2.34,2.20,'deck','shadow',.035,0);
  grille(-3.59,-.97,.83,.83,true);grille(-3.59,.14,.83,.83,true);
  rect(-2.66,-1.00,1.06,2.00,'body','seam',.028,1);
  grille(-2.53,-.83,.80,.54);grille(-2.53,.29,.80,.54);
  rect(-2.48,-.18,.71,.36,'deck','shadow',.02,2);handle(-2.20,.01);
  bolts(-3.77,-1.08,2.25,2.16,9);bolts(-2.66,-1.00,1.06,2.00,4);
  rect(-3.93,-.72,.13,1.44,'shadow',null,0,1);
  for(let y=-.65;y<.7;y+=.12)line(`M-3.90 ${y}h.095`,'rib',.025,2);
  // Front glacis and centred driver's station.
  add('M1.70 -1.13L3.87 -.99V.99L1.70 1.13Z','glacis','seam',.03,0);
  add('M2.04 -.76H3.48V.76H2.04Z','deck',null,0,1);
  add('M2.30 -.31L2.42 -.47H3.07L3.20 -.29V.29L3.07 .47H2.42L2.30 .31Z','body','shadow',.03,1);
  line('M2.47 -.35H3.00L3.10 -.24V.24L3.00 .35H2.47Z','light',.018,2);
  for(const yy of [-.31,0,.31])rect(3.18,yy-.10,.18,.20,'glass','shadow',.025,2);
  handle(2.57,.05);line('M3.56 -1.02V1.02','shadow',.035,1);
  for(const s of [-1,1]){
    rect(2.30,s<0?-.98:.66,.72,.28,'body','seam',.02,2);
    for(const x of [2.48,2.76,3.55])handle(x,s*.82);
    rect(3.57,s<0?-1.49:1.16,.20,.23,'shadow','seam',.025,1);
    rect(3.64,s<0?-1.45:1.21,.13,.12,'lamp','metal',.018,2);
  }
  // Turret race lies below the turret and is only visible during traversing.
  circle(.15,0,1.18,'shadow','seam',.04,0);circle(.15,0,1.08,'body','metal',.025,1);
  active=turret;
  // Rear bustle, blow-off-panel seams, stowage basket and side stowage boxes.
  rect(-2.30,-1.11,1.26,2.22,'bustle','shadow',.04,0);
  for(let i=0;i<3;i++){rect(-2.23,-1.04+i*.69,1.13,.62,'deck','seam',.025,1);bolts(-2.23,-1.04+i*.69,1.13,.62,4);handle(-1.72,-.73+i*.69);}
  rect(-2.55,-1.21,.33,2.42,'basket','shadow',.03,1);
  for(let y=-1.10;y<1.2;y+=.17)line(`M-2.52 ${y}h.27`,'metal',.018,2);
  line('M-2.58 -1.26V1.26M-2.53 -1.26H-1.96M-2.53 1.26H-1.96','metal',.035,1);
  for(const y of [-1.30,1.06]){rect(-1.68,y,.91,.24,'body','shadow',.028,1);handle(-1.35,y+.11);}
  // Faceted Abrams cheeks: broad flat armour faces, inset roof and bustle joins.
  add('M-1.30 -1.30L.68 -1.425L1.90 -.62V.62L.68 1.425L-1.30 1.30L-1.67 .83V-.83Z','body','shadow',.045,0);
  add('M-.88 -.92L.51 -1.00L1.31 -.43V.43L.51 1.00L-.88 .92L-1.19 .62V-.62Z','roof','seam',.025,0);
  add('M-.88 -.92L.51 -1L1.31 -.43L1.90 -.62L.68 -1.425L-1.30 -1.30Z','leftCheek','seam',.02,0);
  add('M-.88 .92L.51 1L1.31 .43L1.90 .62L.68 1.425L-1.30 1.30Z','rightCheek','seam',.02,0);
  line('M-1.23 -1.23L.64 -1.35L1.75 -.64M-1.23 1.23L.64 1.35L1.75 .64','light',.025,1);
  // Antenna bases are circles in plan view, not long whips laid on the roof.
  for(const y of [-1.00,1.00]){circle(-1.41,y,.10,'shadow','metal',.02,2);circle(-1.41,y,.035,'metal',null,0,2);}
  // Loader's hatch on left; commander's cupola and vision blocks on right.
  circle(-.55,-.59,.39,'shadow','seam',.03,1);circle(-.55,-.59,.33,'roof','light',.025,1);
  line('M-.82 -.62H-.28M-.55 -.88V-.31','seam',.022,2);handle(-.60,-.53);
  circle(-.48,.60,.46,'shadow','metal',.025,1);circle(-.48,.60,.34,'deck','seam',.025,1);
  circle(-.48,.60,.28,null,'light',.02,2);handle(-.54,.63);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,xx=-.48+Math.cos(a)*.40,yy=.60+Math.sin(a)*.40;rect(xx-.064,yy-.035,.128,.07,'glass','shadow',.015,2);}
  rect(-.78,.91,.26,.09,'body','seam',.025,2);
  // CITV's raised round head forward-left, GPS armoured sight housing forward-right.
  circle(.70,-.73,.28,'shadow','seam',.035,1);circle(.70,-.73,.22,'deck','metal',.022,1);
  rect(.84,-.89,.10,.31,'glass','shadow',.018,2);line('M.50 -.78H.75V-.59','light',.018,2);
  add('M.25 .41H.96L1.18 .60V.99H.25Z','deck','shadow',.035,1);
  rect(.91,.53,.19,.34,'glass','shadow',.025,2);rect(.30,.46,.51,.43,'roof','seam',.02,2);
  line('M.37 .46V.90M.73 .46V.90','light',.02,3);
  // Six smoke dischargers per side, shown as small angled tubes on brackets.
  for(const s of [-1,1]){
    add(`M-.10 ${s*1.18}L.48 ${s*1.29}L.43 ${s*1.46}L-.18 ${s*1.35}Z`,'shadow','seam',.025,1);
    for(let j=0;j<2;j++)for(let i=0;i<3;i++){const x=-.06+i*.18-j*.03,y=s*(1.23+j*.10);circle(x,y,.055,'rubber','metal',.018,2);}
  }
  // Conventional M1A2 weapon stations (no CROWS/TUSK installation).
  rect(-.25,.55,.58,.14,'shadow','seam',.02,2);rect(.06,.55,.22,.13,'metal','shadow',.015,2);
  line('M.25 .62H1.05','gunMetal',.065,2);rect(-.27,.75,.34,.19,'ammo','shadow',.02,2);circle(-.23,.68,.10,'shadow','metal',.02,2);
  line('M-.20 -.57H.53','gunMetal',.045,2);rect(-.32,-.64,.23,.15,'shadow','metal',.02,2);rect(-.39,-.84,.23,.17,'ammo','seam',.018,2);
  // Mantlet and M256 tube. All x-coordinates are turret-centred.
  add('M1.03 -.27L1.86 -.30L2.05 -.19V.19L1.86 .30L1.03 .27Z','shadow','seam',.025,0);
  rect(1.30,-.23,.76,.46,'body','seam',.03,0);line('M1.45 -.20V.20M1.89 -.18V.18','light',.025,2);
  add('M1.96 -.12H2.98L3.11 -.18H3.77L3.91 -.12H5.66L5.7174 -.08V.08L5.66 .12H3.91L3.77 .18H3.11L2.98 .12H1.96Z','barrel','shadow',.025,0);
  line('M2.08 -.055H5.60','barrelLight',.035,1);
  for(const x of [2.20,2.69,3.13,3.73,4.14,4.71,5.27])line(`M${x} -.13V.13`,'seam',.025,2);
  rect(5.34,-.19,.17,.10,'deck','shadow',.02,2);rect(5.68,-.075,.037,.15,'rubber',null,0,1);
  // Small fixed canvas rolls in the bustle basket, with visible retaining straps.
  for(const [x,y,w,h]of [[-2.40,-.96,.25,.55],[-2.43,-.28,.26,.51],[-2.40,.40,.26,.57]]){
    rect(x,y,w,h,'canvas','shadow',.025,2);line(`M${x+.05} ${y+.11}h${w-.08}M${x+.05} ${y+h-.12}h${w-.08}`,'strap',.035,2);
  }
  const palettes={
    olive:{body:'#69745a',deck:'#7b8468',fender:'#727d61',glacis:'#788366',roof:'#828b70',bustle:'#687258',leftCheek:'#7d886b',rightCheek:'#606d52',shadow:'#384633',seam:'#44503a',light:'#a0a98a',grille:'#293628',rib:'#66725a',rubber:'#232a23',trackEdge:'#697363',metal:'#9ba38e',glass:'#243b3d',lamp:'#d4d9bb',basket:'#56634b',gunMetal:'#2a3430',ammo:'#566048',barrel:'#778367',barrelLight:'#a8b091',canvas:'#6c735e',strap:'#454b3c'},
    sand:{body:'#ad9d78',deck:'#b9ac87',fender:'#ac9c77',glacis:'#bbad87',roof:'#c2b48f',bustle:'#a29372',leftCheek:'#c2b18b',rightCheek:'#a08f6c',shadow:'#625c46',seam:'#776d52',light:'#d9cba6',grille:'#4c4b3c',rib:'#9a8e6c',rubber:'#30332b',trackEdge:'#7f806b',metal:'#c8bea2',glass:'#2c4140',lamp:'#e3dfc6',basket:'#8c8265',gunMetal:'#333a33',ammo:'#8c8668',barrel:'#b6a57f',barrelLight:'#dfcca4',canvas:'#8e8b6c',strap:'#5a5c46'}
  };
  function drawLayer(g,items,palette,lod){
    for(const part of items){if(part.lod>lod)continue;
      let p=compiled.get(part);if(!p){p=new Path2D(part.d);compiled.set(part,p);}
      if(part.fill){g.fillStyle=palette[part.fill]||part.fill;g.fill(p);}
      if(part.stroke){g.strokeStyle=palette[part.stroke]||part.stroke;g.lineWidth=part.w;g.stroke(p);}
    }
  }
  function draw(g,u,zoom,model){
    const palette=palettes[u.team==='red'?'sand':'olive'],lod=zoom>16?3:zoom>6?2:zoom>2?1:0;
    g.save();g.scale(zoom,zoom);g.lineJoin='round';g.lineCap='round';
    g.save();g.rotate(u.heading);g.fillStyle='#17201745';g.fillRect(-model.hullLength/2+.14,-model.width/2+.18,model.hullLength,model.width);drawLayer(g,hull,palette,lod);g.restore();
    g.save();g.rotate(u.turret);g.translate(model.turretCenter,0);
    g.save();g.translate(.11,.13);g.fillStyle='#15201345';g.fill(new Path2D('M-2.4 -1.2H.7L1.9 -.6V.6L.7 1.42H-2.4Z'));g.restore();
    drawLayer(g,turret,palette,lod);g.restore();g.restore();
  }
  const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  function toSVG({heading=0,turretHeading=0,palette='olive'}={}){
    const colors=palettes[palette],layer=items=>items.map(p=>`<path d="${escape(p.d)}" fill="${p.fill?colors[p.fill]||p.fill:'none'}"${p.stroke?` stroke="${colors[p.stroke]||p.stroke}" stroke-width="${p.w}"`:' stroke="none"'}/>`).join('\n');
    const rotated=Math.abs(heading)+Math.abs(turretHeading)>.001,size=rotated?'width="1000" height="1000" viewBox="-6.5 -6.5 13 13"':'width="1440" height="720" viewBox="-5 -2.5 12 5"';
    return `<svg xmlns="http://www.w3.org/2000/svg" ${size} role="img" aria-label="M1A2 Abrams top view"><title>M1A2 Abrams · top view</title><desc>Original vector interpretation based on US Army DVIDS 3055956. Covered fender decks, rear engine deck, separate turret, CITV, GPS, hatches and M256. Exterior detail is approximate.</desc><g stroke-linejoin="round" stroke-linecap="round"><g transform="rotate(${heading*180/Math.PI})">${layer(hull)}</g><g transform="rotate(${turretHeading*180/Math.PI}) translate(.15 0)">${layer(turret)}</g></g></svg>`;
  }
  return {draw,toSVG,palettes,geometry:{hull,turret}};
})();
if(typeof module!=='undefined')module.exports=M1A2Art;
