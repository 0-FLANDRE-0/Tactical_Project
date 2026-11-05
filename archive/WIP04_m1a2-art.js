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
  // M1-family rear deck: broad rear access panels and a transverse intake strip,
  // rather than two exposed square fan grilles of a generic tank.
  rect(-3.84,-1.10,1.23,2.20,'deck','shadow',.035,0);
  for(const y of [-1.02,.06]){rect(-3.74,y,.91,.96,'body','seam',.03,1);bolts(-3.74,y,.91,.96,4);handle(-3.38,y+.47);}
  grille(-2.78,-1.14,.43,2.28);
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
  // Ratios rechecked against USMC A-3 planform and the actual M1A2 aerial photo.
  // The broad, long turret has parallel rear sides and swept FRONT cheeks.
  // Rear basket first; main bustle and broad roof sit above it.
  rect(-3.03,-1.42,.58,2.84,'basket','shadow',.035,1);
  for(let y=-1.34;y<1.4;y+=.15)line(`M-2.99 ${y}h.49`,'metal',.018,2);
  for(let x=-2.96;x<-2.45;x+=.12)line(`M${x} -1.36V1.36`,'seam',.016,2);
  line('M-3.07 -1.49V1.49M-3.02 -1.49H-2.28M-3.02 1.49H-2.28','metal',.04,1);
  add('M-2.55 -1.45L.82 -1.60L2.35 -.66V.66L.82 1.60L-2.55 1.45Z','body','shadow',.045,0);
  add('M-2.45 -1.34L.72 -1.44L1.81 -.61V.61L.72 1.44L-2.45 1.34Z','roof','seam',.025,0);
  add('M.63 -1.44L1.81 -.61L2.35 -.66L.82 -1.60L-1.07 -1.52L-1.07 -1.38Z','leftCheek','seam',.025,0);
  add('M.63 1.44L1.81 .61L2.35 .66L.82 1.60L-1.07 1.52L-1.07 1.38Z','rightCheek','seam',.025,0);
  line('M-2.44 -1.37L.78 -1.53L2.20 -.67M-2.44 1.37L.78 1.53L2.20 .67','light',.025,1);
  // Two large bustle roof / ammunition blow-off panels, not three narrow panels.
  for(const y of [-1.25,.05]){
    rect(-2.40,y,1.33,1.20,'deck','seam',.03,1);bolts(-2.40,y,1.33,1.20,5);
    for(const yy of [y+.29,y+.90])circle(-2.08,yy,.072,'roof','light',.015,2);
    handle(-1.35,y+.58);
  }
  // Long side stowage boxes reinforce the Abrams' rectangular rear silhouette.
  for(const y of [-1.72,1.49]){rect(-2.34,y,2.50,.23,'body','shadow',.028,0);handle(-1.75,y+.11);handle(-.63,y+.11);}
  for(const y of [-1.25,1.25]){circle(-2.40,y,.10,'shadow','metal',.02,2);circle(-2.40,y,.035,'metal',null,0,2);}
  // Loader's hatch to the left; commander's cupola to the right.
  circle(-.52,-.67,.43,'shadow','seam',.03,1);circle(-.52,-.67,.36,'roof','light',.025,1);
  line('M-.82 -.70H-.23M-.52 -.98V-.35','seam',.022,2);handle(-.57,-.61);
  circle(-.50,.68,.50,'shadow','metal',.025,1);circle(-.50,.68,.38,'deck','seam',.025,1);
  circle(-.50,.68,.31,null,'light',.02,2);handle(-.56,.71);
  for(let i=0;i<8;i++){const a=i*Math.PI/4,xx=-.50+Math.cos(a)*.435,yy=.68+Math.sin(a)*.435;rect(xx-.068,yy-.038,.136,.076,'glass','shadow',.015,2);}
  rect(-.81,1.01,.28,.09,'body','seam',.025,2);
  // CITV ahead of loader; gunner's armoured primary sight ahead of commander.
  circle(.76,-.94,.30,'shadow','seam',.035,1);circle(.76,-.94,.24,'deck','metal',.022,1);
  rect(.92,-1.11,.10,.33,'glass','shadow',.018,2);line('M.55 -.99H.82V-.79','light',.018,2);
  add('M.32 .53H1.10L1.31 .74V1.12H.32Z','deck','shadow',.035,1);
  rect(1.04,.64,.19,.36,'glass','shadow',.025,2);rect(.38,.59,.56,.43,'roof','seam',.02,2);
  line('M.45 .59V1.02M.85 .59V1.02','light',.02,3);
  for(const side of [-1,1]){
    add(`M.28 ${side*1.46}L.99 ${side*1.50}L.93 ${side*1.70}L.23 ${side*1.64}Z`,'shadow','seam',.025,1);
    for(let j=0;j<2;j++)for(let i=0;i<3;i++)circle(.36+i*.20-j*.03,side*(1.53+j*.10),.058,'rubber','metal',.018,2);
  }
  // Conventional M1A2 roof weapons: no CROWS station is inferred from SEP imagery.
  rect(-.20,.62,.61,.15,'shadow','seam',.02,2);rect(.13,.62,.23,.14,'metal','shadow',.015,2);
  line('M.34 .69H1.20','gunMetal',.065,2);rect(-.24,.85,.37,.20,'ammo','shadow',.02,2);circle(-.20,.77,.11,'shadow','metal',.02,2);
  line('M-.16 -.65H.62','gunMetal',.045,2);rect(-.29,-.72,.24,.16,'shadow','metal',.02,2);rect(-.38,-.94,.24,.18,'ammo','seam',.018,2);
  // Mantlet is farther forward on the enlarged cheeks; muzzle stays at the
  // published 9.8298m overall length, so the entire gun is NOT scaled with turret.
  add('M1.37 -.34L2.30 -.35L2.56 -.22V.22L2.30 .35L1.37 .34Z','shadow','seam',.025,0);
  rect(1.58,-.28,.94,.56,'body','seam',.03,0);line('M1.74 -.25V.25M2.32 -.23V.23','light',.025,2);
  add('M2.45 -.12H3.43L3.58 -.18H4.14L4.28 -.12H5.66L5.7174 -.08V.08L5.66 .12H4.28L4.14 .18H3.58L3.43 .12H2.45Z','barrel','shadow',.025,0);
  line('M2.53 -.055H5.60','barrelLight',.035,1);
  for(const x of [2.73,3.19,3.60,4.12,4.51,4.94,5.37])line(`M${x} -.13V.13`,'seam',.025,2);
  rect(5.34,-.19,.17,.10,'deck','shadow',.02,2);rect(5.68,-.075,.037,.15,'rubber',null,0,1);
  for(const [x,y,w,h]of [[-2.93,-1.25,.30,.64],[-2.95,-.34,.30,.62],[-2.93,.61,.30,.64]]){
    rect(x,y,w,h,'canvas','shadow',.025,2);line(`M${x+.05} ${y+.13}h${w-.08}M${x+.05} ${y+h-.14}h${w-.08}`,'strap',.035,2);
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
    g.save();g.translate(.11,.13);g.fillStyle='#15201345';g.fill(new Path2D('M-3 -1.4H.82L2.35 -.66V.66L.82 1.60H-3Z'));g.restore();
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
