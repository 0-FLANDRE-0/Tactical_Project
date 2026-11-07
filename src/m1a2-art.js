// WIP08A: M1A2 vector geometry from the user-supplied Top View Lab.
// Original HTML and checksum: data/vehicles/references/M1_Abrams_TopView.html.
/* AbramsTopView — M1 Abrams family top-view vector art (metres, +x = hull front, +y = vehicle right).
 * Original vector interpretation. Planform traced at scale from USMC MCWP 3-12 Appendix A-3
 * (M1A1 planform); M1A2 roof fittings from US Army DVIDS photo 3055956. Exterior detail is
 * approximate and visual only — never an armour or collision model.
 * Layers: hull (rotates with heading), turret (art origin +0.15 m, ring pivot +0.66 m), citv (M1A2 only,
 * independent rotation about its own base). Same draw(g,u,zoom,model,opts) call as M1A2Art. */
const M1A2Art=(()=>{
  'use strict';
  const G=typeof TacticalVehicleGeometry!=='undefined'?TacticalVehicleGeometry:require('./vehicle-geometry.js');
  const r3=v=>Math.round(v*1000)/1000;
  const HX=3.9624,HY=1.8288;
  // turretOrigin: where the turret art's local origin sits on the hull centreline at 0 deg traverse
// (the outline is traced in hull coordinates, so this never moves). turretPivot: turret ring centre /
// rotation axis in hull coordinates — independent of the art. Default 0.66 m ahead of hull centre on the
// centreline, supplied reference describes this as measured from an M1A2 hull plan (7916 mm dimension) whose concentric ring circles
// include the published 85 in (2.16 m) race, centre 3.30 m behind the hull front.
// This source claim has not been independently verified. Values are visual approximations.
// citvPivot is in turret-art coordinates.
const MODEL={hullLength:7.9248,width:3.6576,turretOrigin:.15,turretPivot:[.66,0],turretRingDiameter:2.159,citvPivot:[.424,-.673],driverHatchRear:[2.05,0],overallLength:9.8298};
  const VARIANTS={
    M1A2:{id:'M1A2',label:'M1A2',citv:true,station:'cs',
      note:'CITV(전차장 독립 열상 조준경) 장착, 전차장 스테이션은 잠망경 8개 해치 + 수동 M2.'},
    M1A1:{id:'M1A1',label:'M1A1',citv:false,station:'cws',
      note:'CITV 자리는 볼트 덮개판, 전차장 큐폴라는 잠망경 6개 CWS + M2 거치대.'},
    M1A1HA:{id:'M1A1HA',label:'M1A1 HA',citv:false,station:'cws',
      note:'외형은 M1A1과 동일. HA의 차이(포탑 전면 열화우라늄 장갑)는 내부라 위에서 안 보임.'}
  };
  const palettes={
    olive:{body:'#69745a',deck:'#7b8468',fender:'#727d61',glacis:'#788366',roof:'#828b70',bustle:'#687258',leftCheek:'#7d886b',rightCheek:'#606d52',shadow:'#384633',seam:'#44503a',light:'#a0a98a',grille:'#293628',rib:'#66725a',rubber:'#232a23',metal:'#9ba38e',glass:'#243b3d',lamp:'#d4d9bb',tail:'#7c3a2c',basket:'#56634b',gunMetal:'#2a3430',ammo:'#566048',barrel:'#778367',barrelLight:'#a8b091',canvas:'#6c735e',strap:'#454b3c',mesh:'#2c3828'},
    sand:{body:'#ad9d78',deck:'#b9ac87',fender:'#ac9c77',glacis:'#bbad87',roof:'#c2b48f',bustle:'#a29372',leftCheek:'#c2b18b',rightCheek:'#a08f6c',shadow:'#625c46',seam:'#776d52',light:'#d9cba6',grille:'#4c4b3c',rib:'#9a8e6c',rubber:'#30332b',metal:'#c8bea2',glass:'#2c4140',lamp:'#e3dfc6',tail:'#8a3b2b',basket:'#8c8265',gunMetal:'#333a33',ammo:'#8c8668',barrel:'#b6a57f',barrelLight:'#dfcca4',canvas:'#8e8b6c',strap:'#5a5c46',mesh:'#5a5543'},
    line:{body:'#e8e8e2',deck:'#f6f6f2',fender:'#eeeee8',glacis:'#f1f1ec',roof:'#fbfbf8',bustle:'#e6e6df',leftCheek:'#f0f0ea',rightCheek:'#d9d9d2',shadow:'#1f1f1f',seam:'#3d3d3d',light:'#8c8c8c',grille:'#bcbcb4',rib:'#6a6a6a',rubber:'#555555',metal:'#5a5a5a',glass:'#a7b9bb',lamp:'#ffffff',tail:'#c46a5a',basket:'#dcdcd4',gunMetal:'#444444',ammo:'#9c9c94',barrel:'#e3e3dc',barrelLight:'#ffffff',canvas:'#cfcfc6',strap:'#888888',mesh:'#7a7a7a'}
  };

  function build(variantId){
    const V=VARIANTS[variantId]||VARIANTS.M1A2;
    const L={hull:[],turret:[],citv:[]};let active=L.hull;
    const add=(d,fill='body',stroke='seam',w=.025,lod=0)=>active.push({d,fill,stroke,w,lod});
    const rect=(x,y,w,h,fill='deck',stroke='seam',line=.02,lod=1)=>add(`M${r3(x)} ${r3(y)}h${r3(w)}v${r3(h)}h${r3(-w)}Z`,fill,stroke,line,lod);
    const box=(x0,y0,x1,y1,fill='deck',stroke='seam',line=.02,lod=1)=>rect(Math.min(x0,x1),Math.min(y0,y1),Math.abs(x1-x0),Math.abs(y1-y0),fill,stroke,line,lod);
    const ell=(x,y,rx,ry,fill='deck',stroke='seam',w=.02,lod=1)=>add(`M${r3(x+rx)} ${r3(y)}a${rx} ${ry} 0 1 0 ${r3(-2*rx)} 0a${rx} ${ry} 0 1 0 ${r3(2*rx)} 0Z`,fill,stroke,w,lod);
    const circle=(x,y,r,fill,stroke,w,lod)=>ell(x,y,r,r,fill,stroke,w,lod);
    const line=(d,color='seam',w=.025,lod=1)=>add(d,null,color,w,lod);
    const poly=(pts,fill,stroke='seam',w=.025,lod=0)=>add('M'+pts.map(p=>r3(p[0])+' '+r3(p[1])).join('L')+'Z',fill,stroke,w,lod);
    // Polygon with every corner rounded by r (quadratic corner, r clamped to half the edge).
    const roundPoly=(pts,r,fill,stroke='seam',w=.025,lod=0)=>{const n=pts.length,P=(a)=>r3(a[0])+' '+r3(a[1]);
      const off=(v,t,k)=>{const dx=t[0]-v[0],dy=t[1]-v[1],L=Math.hypot(dx,dy),q=Math.min(k,L/2)/L;return [v[0]+dx*q,v[1]+dy*q];};
      let d='';for(let i=0;i<n;i++){const v=pts[i],pr=pts[(i+n-1)%n],nx=pts[(i+1)%n],a=off(v,pr,r),b=off(v,nx,r);d+=(i?'L':'M')+P(a)+'Q'+P(v)+' '+P(b);}
      add(d+'Z',fill,stroke,w,lod);};
    const dots=(pts,r=.022,fill='metal',lod=3)=>add(pts.map(([x,y])=>`M${r3(x+r)} ${r3(y)}a${r} ${r} 0 1 0 ${r3(-2*r)} 0a${r} ${r} 0 1 0 ${r3(2*r)} 0Z`).join(''),fill,null,0,lod);
    function bolts(x,y,w,h,count=4){const p=[];for(let i=0;i<count;i++){const xx=x+.08+(w-.16)*i/(count-1);p.push([xx,y+.045],[xx,y+h-.045]);}dots(p);}
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
    function handle(x,y){add(`M${r3(x)} ${r3(y+.05)}v-.1q.06 -.06 .12 0v.1`,null,'shadow',.035,2);line(`M${r3(x+.025)} ${r3(y+.04)}v-.1h.07v.1`,'light',.018,3);}
    function visionBlocks(cx,cy,n,rad,hw,hl,phase){let d='';for(let i=0;i<n;i++){const a=i*2*Math.PI/n+phase,ox=cx+Math.cos(a)*rad,oy=cy+Math.sin(a)*rad,ca=Math.cos(a),sa=Math.sin(a),p=(u,v)=>`${r3(ox+u*ca-v*sa)} ${r3(oy+u*sa+v*ca)}`;d+=`M${p(-hw,-hl)}L${p(hw,-hl)}L${p(hw,hl)}L${p(-hw,hl)}Z`;}add(d,'glass','shadow',.012,2);}

    // ================= HULL =================
    // Hull 7.9248 x 3.6576 m. Rear: fender ends stop at -3.80; the centre plate
    // (exhaust grille) runs to the full -3.9624 between y = +/-1.13 (USMC A-3).
    add(`M-3.8 ${-HY}H${HX-.04}Q${HX} ${-HY} ${HX} ${-HY+.04}V${HY-.04}Q${HX} ${HY} ${HX-.04} ${HY}H-3.8V1.13H${-HX}V-1.13H-3.8Z`,'body','shadow',.045,0);
    for(const s of [-1,1]){
      // Side skirt tops / fenders with skirt-panel seams.
      box(-3.78,s*1.05,2.40,s*1.80,'fender','seam',.028,0);
      line(`M-3.74 ${s*1.765}H2.36`,'light',.022,2);
      line([1.42,.30,-.82,-1.94,-3.06].map(x=>`M${x} ${s*1.07}V${s*1.79}`).join(''),'seam',.022,1);
      // Front fender box 1: rubber lip, D-plate with X, inner panel lines, front rivets.
      box(3.02,s*1.04,3.89,s*1.81,'deck','shadow',.03,0);
      box(3.89,s*1.05,3.96,s*1.80,'rubber','shadow',.015,1);
      line(`M3.82 ${s*1.13}H3.20M3.13 ${s*1.12}V${s*1.72}`,'seam',.02,2);
      ell(3.56,s*1.63,.17,.13,'body','shadow',.022,1);
      line(`M3.46 ${s*1.55}L3.66 ${s*1.71}M3.46 ${s*1.71}L3.66 ${s*1.55}`,'light',.02,2);
      dots([1.16,1.28,1.40,1.52,1.64,1.76].map(y=>[3.855,s*y]));
      // Front fender box 2 with the vertical grab bar on its forward edge.
      box(2.40,s*1.06,3.02,s*1.78,'deck','seam',.025,1);
      line(`M2.45 ${s*1.10}V${s*1.74}`,'seam',.018,2);
      line(`M3.00 ${s*1.10}V${s*1.70}`,'metal',.03,2);dots([[3.00,s*1.10],[3.00,s*1.70]],.032,'metal',2);
      // Fender support bracket behind the front boxes.
      line(`M2.30 ${s*1.82}V${s*1.66}M2.24 ${s*1.66}H2.36`,'shadow',.03,2);
    }
    // Left front fuel filler cap.
    line('M2.55 -1.52L2.66 -1.62','shadow',.07,2);line('M2.55 -1.52L2.66 -1.62','metal',.035,3);
    // Front glacis between the fender boxes; glacis break line and driver's station.
    box(2.40,-1.04,3.93,1.04,'glacis','seam',.03,0);
    line('M3.44 -1.0V1.0','light',.025,1);line('M3.90 -.70V.70','shadow',.03,1);
    // Driver's hatch sits at the rear of the upper glacis, against the turret ring, under the
    // gun shield: with the turret forward only the periscope heads peek out ahead of the mantlet.
    // At ~45 deg traverse the cheek overhang covers it (crews report the hatch is blocked there).
    // Hatch plan (hull-plan drawing with the 7916 mm dimension): right isosceles triangle with
    // heavily rounded corners, right-angle apex forward, base (0.85 m) facing the turret ring.
    // Three periscopes fan forward: centre at the apex, one on each front leg at +/-45 deg.
    roundPoly([[2.50,0],[2.05,.425],[2.05,-.425]],.15,'body','shadow',.03,1);
    roundPoly([[2.42,0],[2.10,.32],[2.10,-.32]],.10,null,'light',.018,2);
    {let d='';const peri=(cx,cy,a)=>{const c=Math.cos(a),sn=Math.sin(a),P=(u,v)=>`${r3(cx+u*c-v*sn)} ${r3(cy+u*sn+v*c)}`;d+=`M${P(-.05,-.075)}L${P(.05,-.075)}L${P(.05,.075)}L${P(-.05,.075)}Z`;};
     peri(2.39,0,0);peri(2.28,.21,Math.PI/4);peri(2.28,-.21,-Math.PI/4);add(d,'glass','shadow',.02,2);}
    handle(2.12,.05);
    // Front fuel-tank filler caps either side of the driver (hull plan with 7916 mm dimension).
    for(const sy of [-1,1]){circle(2.19,sy*.83,.09,'deck','shadow',.02,1);circle(2.19,sy*.83,.04,null,'metal',.014,2);}
    for(const s of [-1,1]){
      // Headlight cluster with front tow eye, inboard of each fender box.
      box(3.75,s*.72,3.96,s*1.03,'shadow','seam',.02,1);
      line([3.79,3.83,3.87].map(x=>`M${x} ${s*.75}V${s*1.0}`).join(''),'light',.014,2);
      box(3.92,s*.76,3.96,s*.99,'lamp',null,0,2);
      box(3.55,s*.72,3.62,s*1.01,'body','seam',.018,2);
      circle(3.68,s*.87,.075,'body','shadow',.02,1);circle(3.68,s*.87,.04,null,'metal',.015,2);
    }
    // Centre deck under the turret.
    box(-3.74,-1.05,2.40,1.05,'deck','seam',.03,0);
    line('M-.98 -1.03V1.03','seam',.022,1);
    // Engine-deck intake grilles (centre pair, left pair) per DVIDS 3055956 —
    // under the bustle with the gun forward, exposed when the turret traverses.
    grille(-2.55,-.56,-1.88,-.03);grille(-2.55,.03,-1.88,.56);
    grille(-2.78,-1.00,-2.10,-.62);
    // Left-side turbine air inlet grille alongside the turret.
    box(-2.27,-1.45,-1.10,-1.74,'grille','shadow',.025,1);mesh(-2.25,-1.47,-1.12,-1.72,.06,2,'rib');
    // Rear deck plate, access doors, rivets.
    line('M-2.84 -1.12H-3.76V1.12H-2.84Z','seam',.022,1);
    for(const s of [-1,1]){
      box(-3.64,s*.59,-3.27,s*1.02,'body','seam',.025,1);handle(-3.52,s*.82);dots([[-3.32,s*.80]],.02,'metal',3);
      dots([[-2.93,s*1.775],[-3.40,s*1.775],[-3.72,s*1.775],[-3.72,s*1.17]]);
      // Tow shackles at the rear corners.
      circle(-3.52,s*1.57,.11,'shadow','metal',.02,1);circle(-3.52,s*1.57,.06,null,'metal',.016,2);
      line(`M-3.60 ${s*1.49}L-3.44 ${s*1.65}`,'metal',.03,2);
      // Tail-light brackets protruding past the fender ends.
      box(-3.96,s*1.52,-3.80,s*1.75,'shadow','seam',.02,1);box(-3.95,s*1.56,-3.90,s*1.71,'tail',null,0,2);
    }
    // Stowage rail with clamps on the right rear deck edge.
    line('M-2.86 1.41H-3.78','metal',.035,1);box(-3.17,1.36,-3.13,1.47,'shadow',null,0,2);box(-3.49,1.36,-3.45,1.47,'shadow',null,0,2);
    // Transverse exhaust grille in two sections.
    grille(-3.96,-1.12,-3.76,-.33,true,.11,0);grille(-3.96,-.29,-3.76,1.05,true,.11,0);
    // (Turret race is drawn at the live pivot by draw()/svgBody(), not baked into the hull.)

    // ================= TURRET (art origin +0.15 m; separate ring pivot) =================
    active=L.turret;
    // Bustle rack (drawn first; the turret body overlaps its front), dividers, stowage.
    add('M-2.25 -1.43H-2.79Q-2.97 -1.43 -2.97 -1.25V1.40Q-2.97 1.58 -2.79 1.58H-2.25Z','basket','shadow',.03,0);
    mesh(-2.95,-1.40,-2.40,1.55,.10,2);
    line('M-2.25 -1.43H-2.79Q-2.97 -1.43 -2.97 -1.25V1.40Q-2.97 1.58 -2.79 1.58H-2.25M-2.95 -.92H-2.42M-2.95 -.25H-2.42M-2.95 .08H-2.42M-2.95 .57H-2.42M-2.95 1.06H-2.42','metal',.03,1);
    box(-2.95,-.90,-2.45,-.27,'bustle','shadow',.022,1);line('M-2.90 -.585H-2.50','seam',.018,2);
    for(const [x0,y0,x1,y1] of [[-2.90,.62,-2.58,1.42],[-2.88,-.20,-2.52,.50]]){
      box(x0,y0,x1,y1,'canvas','shadow',.022,2);line(`M${x0+.04} ${r3(y0+.13)}H${x1-.04}M${x0+.04} ${r3(y1-.13)}H${x1-.04}`,'strap',.032,2);
    }
    const OUT=[[2.13,.31],[2.04,.78],[1.65,1.67],[.06,1.71],[-2.29,1.60],[-2.42,1.42],[-2.42,-1.30],[-2.29,-1.43],[-1.25,-1.57],[1.31,-1.56],[2.06,-.66],[2.13,-.31]];
    poly(OUT,'body','shadow',.045,0);
    poly([[2.13,.31],[2.04,.78],[1.65,1.67],[1.44,1.33],[1.87,.31]],'rightCheek','seam',.022,0);
    poly([[2.13,-.31],[2.06,-.66],[1.31,-1.56],[1.10,-1.21],[1.87,-.31]],'leftCheek','seam',.022,0);
    poly([[1.87,.31],[1.44,1.33],[-1.24,1.29],[-2.28,1.24],[-2.28,-1.12],[-.20,-1.21],[1.10,-1.21],[1.87,-.31]],'roof','seam',.025,0);
    line('M1.84 .40L1.46 1.29M1.84 -.40L1.13 -1.17','light',.022,1);
    // Side stowage bins.
    poly([[.06,1.335],[.06,1.70],[-1.95,1.625],[-1.95,1.275]],'bustle','shadow',.028,0);
    poly([[.06,-1.215],[.06,-1.565],[-1.25,-1.57],[-1.95,-1.476],[-1.95,-1.155]],'bustle','shadow',.028,0);
    line('M-.62 1.33V1.68M-1.30 1.30V1.65M-.62 -1.21V-1.57M-1.30 -1.19V-1.55','seam',.022,1);
    line('M.02 1.645L-1.91 1.575M.02 -1.515H-1.25L-1.91 -1.43','light',.018,2);
    dots([.0,-.3,-.6,-.9,-1.2,-1.5,-1.8].map(x=>[x,1.685-(.06-x)*.037]).concat([.0,-.3,-.6,-.9,-1.2].map(x=>[x,-1.55])));
    for(const [x,y] of [[-.38,1.50],[-1.06,1.47],[-1.68,1.45],[-.38,-1.39],[-1.06,-1.38],[-1.68,-1.33]])handle(x,y);
    // M250 smoke grenade launchers (2 x 3 tubes) behind each cheek corner.
    for(const s of [-1,1]){
      const y0=s>0?1.36:-1.21;
      box(.27,y0,.61,y0+s*.32,'shadow','seam',.022,1);
      let d='';for(let j=0;j<2;j++)for(let i=0;i<3;i++){const cx=r3(.34+i*.10+j*.04),cy=r3(y0+s*(.09+j*.14));d+=`M${r3(cx+.045)} ${cy}a.045 .045 0 1 0 -.09 0a.045 .045 0 1 0 .09 0Z`;}
      add(d,'rubber','metal',.014,2);
    }
    // Bustle roof ammunition blow-off panels.
    for(const [y0,y1] of [[-.75,.045],[.075,.90]]){
      box(-2.22,y0,-1.115,y1,'deck','seam',.03,1);bolts(-2.22,y0,1.105,y1-y0,5);
      circle(-1.88,y0+.22,.07,'roof','light',.015,2);circle(-1.88,y1-.22,.07,'roof','light',.015,2);
      handle(-1.42,(y0+y1)/2);
    }
    // Crosswind sensor mast (right rear roof) and antenna base (left rear roof).
    circle(-2.29,1.19,.085,'shadow','metal',.018,1);line('M-2.35 1.19H-2.23M-2.29 1.13V1.25','metal',.016,2);
    circle(-2.29,-1.03,.08,'shadow','metal',.018,1);circle(-2.29,-1.03,.04,'body','metal',.012,2);
    // Rack-front box on the bustle wall.
    box(-2.59,.08,-2.36,.26,'body','shadow',.018,2);circle(-2.50,.17,.055,'deck','shadow',.012,2);
    // Loader's hatch (left).
    circle(-.46,-.406,.42,'shadow','seam',.03,1);circle(-.46,-.406,.35,'roof','light',.025,1);
    line('M-.76 -.43H-.16M-.46 -.70V-.11','seam',.022,2);handle(-.52,-.35);
    // Commander's station (right).
    if(V.station==='cs'){
      // M1A2 commander's station: low hatch ring with 8 periscopes, manual M2 mount.
      circle(-.525,.534,.52,'shadow','metal',.025,1);circle(-.525,.534,.46,'body','seam',.02,1);circle(-.525,.534,.35,'deck','seam',.025,1);
      circle(-.525,.534,.28,null,'light',.02,2);handle(-.585,.56);
      visionBlocks(-.525,.534,8,.405,.03,.065,Math.PI/8);
      box(-.12,.40,.36,.56,'gunMetal','shadow',.015,2);line('M.36 .48H1.38','gunMetal',.05,2);box(-.08,.58,.20,.74,'ammo','shadow',.015,2);
    }else{
      // M1/M1A1 commander's weapon station (CWS): raised cupola, 6 periscopes, M2 cradle.
      circle(-.525,.534,.52,'shadow','metal',.025,1);circle(-.525,.534,.47,'body','seam',.03,1);
      visionBlocks(-.525,.534,6,.41,.04,.075,Math.PI/6);
      circle(-.525,.534,.31,'deck','seam',.025,1);circle(-.525,.534,.25,null,'light',.02,2);handle(-.585,.56);
      box(-.24,.33,.10,.63,'body','shadow',.02,1);
      box(-.16,.40,.30,.56,'gunMetal','shadow',.015,2);line('M.30 .48H1.36','gunMetal',.05,2);box(-.21,.62,.05,.78,'ammo','shadow',.015,2);
    }
    // Loader's M240 on the skate mount.
    box(-.34,-1.05,.02,-.92,'gunMetal','shadow',.015,2);line('M.02 -.985H.46','gunMetal',.04,2);box(-.28,-1.17,-.04,-1.05,'ammo','shadow',.015,3);
    // Gunner's primary sight doghouse with ballistic doors; window faces forward.
    box(.31,.44,.80,1.16,'deck','shadow',.035,1);box(.37,.50,.70,1.10,'roof','seam',.02,2);
    line('M.62 .50V1.10M.37 .80H.70','seam',.016,2);dots([[.66,.62],[.66,.98]],.02,'metal',3);
    box(.72,.56,.84,1.04,'glass','shadow',.022,2);line('M.45 .50V1.10','light',.016,3);
    // CITV mount: M1A2 has the rotating viewer; M1/M1A1 keep a bolted cover plate.
    if(V.citv){
      circle(.424,-.673,.27,'shadow','seam',.03,1);circle(.424,-.673,.21,'deck','metal',.02,1);
    }else{
      circle(.424,-.673,.26,'deck','shadow',.025,1);circle(.424,-.673,.05,'metal',null,0,2);
      dots(Array.from({length:8},(_,i)=>[.424+Math.cos(i*Math.PI/4)*.205,-.673+Math.sin(i*Math.PI/4)*.205]),.02,'metal',2);
    }
    // Gun shield: roof box with bolt rows and lift lugs, mantlet face, gun collar.
    box(1.78,-.31,2.33,.31,'body','shadow',.03,0);box(1.83,-.26,2.10,.26,'deck','seam',.02,1);
    dots([1.88,1.94,2.00,2.06].flatMap(x=>[[x,.285],[x,-.285]]));
    box(1.80,.215,1.86,.265,'metal','shadow',.012,2);box(1.80,-.145,1.86,-.095,'metal','shadow',.012,2);
    box(2.13,-.29,2.33,.29,'roof','seam',.02,1);
    add('M2.13 -.17H2.25Q2.33 -.17 2.33 0Q2.33 .17 2.25 .17H2.13Z','body','shadow',.018,2);
    // Coaxial M240 muzzle stub on the right of the main gun.
    box(2.30,.235,2.36,.305,'shadow',null,0,2);line('M2.33 .27H2.70','gunMetal',.04,2);
    // M256 120mm: rear tube, thermal-sleeve clamp rings, bore evacuator, sleeved front
    // tube, muzzle collar and muzzle reference sensor; muzzle at 5.8674 m ahead of hull centre.
    add('M2.30 -.117H3.03L3.12 -.165H3.85L3.94 -.105H5.30V-.122H5.37V-.092H5.717V.092H5.37V.122H5.30V.105H3.94L3.85 .165H3.12L3.03 .117H2.30Z','barrel','shadow',.025,0);
    line('M2.36 -.05H3.08M3.16 -.085H3.82M3.98 -.045H5.68','barrelLight',.035,1);
    line('M2.72 -.125V.125M2.77 -.125V.125M2.82 -.125V.125','shadow',.02,2);
    line('M3.12 -.16V.16M3.85 -.16V.16M4.45 -.10V.10M4.95 -.10V.10','seam',.022,2);
    box(5.43,-.06,5.56,.06,'deck','shadow',.015,2);box(5.70,-.07,5.717,.07,'rubber',null,0,1);
    if(V.citv){
      active=L.citv;
      add('M.30 -.82H.56Q.64 -.82 .64 -.74V-.60Q.64 -.53 .56 -.53H.30Z','body','shadow',.022,1);
      line('M.36 -.80V-.55','seam',.016,2);
      box(.60,-.78,.68,-.57,'glass','shadow',.018,2);
    }
    return L;
  }

  const cache=new Map();
  const layers=v=>{const k=VARIANTS[v]?v:'M1A2';if(!cache.has(k))cache.set(k,build(k));return cache.get(k);};
  const TURRET_SHADOW_D='M2.33 -.31H2.13L2.06 -.66L1.31 -1.56L-1.25 -1.57L-2.29 -1.43H-2.97V1.58H-2.29L.06 1.71L1.65 1.67L2.04 .78L2.13 .31H2.33ZM2.33 -.12H5.72V.12H2.33Z';
  const HULL_SHADOW_D=`M-3.8 ${-HY}H${HX}V${HY}H-3.8V1.13H${-HX}V-1.13H-3.8Z`;
  const lodFor=zoom=>zoom>16?3:zoom>6?2:zoom>2?1:0;

  // ---- Canvas (game) ----
  const compiled=new WeakMap();let turretShadow=null,hullShadow=null;
  function drawLayer(g,items,palette,lod,silhouette){
    for(const part of items){if(silhouette){if(!part.fill)continue;}else if(part.lod>lod)continue;
      let p=compiled.get(part);if(!p){p=new Path2D(part.d);compiled.set(part,p);}
      if(part.fill){g.fillStyle=silhouette?'#000000':palette[part.fill]||part.fill;g.fill(p);}
      if(part.stroke&&!silhouette){g.strokeStyle=palette[part.stroke]||part.stroke;g.lineWidth=part.w;g.stroke(p);}
    }
  }
  /** g: 2D context already translated to the hull centre; u: {heading, turret, commander?, team?, variant?}
   *  (radians, world frame); zoom: px per metre. opts.pivot = [x,y] hull-frame rotation axis (metres). */
  function draw(g,u,zoom,model=MODEL,{silhouette=false,palette,pivot}={}){
    const L=layers('M1A2'),pal=palettes[palette||(u.team==='red'?'sand':'olive')]||palettes.olive,lod=lodFor(zoom);
    const {pivot:[px,py],origin}=G.turretFrame(model,pivot),ringR=(model.turretRingDiameter??MODEL.turretRingDiameter)/2;
    turretShadow||=new Path2D(TURRET_SHADOW_D);hullShadow||=new Path2D(HULL_SHADOW_D);
    g.save();g.scale(zoom,zoom);g.lineJoin='round';g.lineCap='round';
    g.save();g.rotate(u.heading);if(!silhouette){g.save();g.translate(.14,.18);g.fillStyle='#17201745';g.fill(hullShadow);g.restore();}drawLayer(g,L.hull,pal,lod,silhouette);
    if(!silhouette){g.beginPath();g.arc(px,py,ringR+.1,0,Math.PI*2);g.fillStyle=pal.shadow;g.fill();g.strokeStyle=pal.seam;g.lineWidth=.04;g.stroke();
      if(lod>=1){g.beginPath();g.arc(px,py,ringR,0,Math.PI*2);g.fillStyle=pal.body;g.fill();g.strokeStyle=pal.metal;g.lineWidth=.025;g.stroke();}}
    // Turret: rotate about the pivot; the art keeps its traced 0-deg placement.
    g.translate(px,py);g.rotate(u.turret-u.heading);g.translate(origin-px,-py);
    if(!silhouette){g.save();g.translate(.11,.13);g.fillStyle='#15201345';g.fill(turretShadow);g.restore();}
    drawLayer(g,L.turret,pal,lod,silhouette);
    if(L.citv.length){const [cx,cy]=MODEL.citvPivot;g.translate(cx,cy);g.rotate((u.commander??u.turret)-u.turret);g.translate(-cx,-cy);drawLayer(g,L.citv,pal,lod,silhouette);}
    g.restore();g.restore();
  }
  /** Hull-frame position of a turret-art point for a given traverse (degrees) and pivot. */
  function turretToHull(x,y,turretDeg=0,pivot=MODEL.turretPivot){
    const a=turretDeg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=x+MODEL.turretOrigin-pivot[0],dy=y-pivot[1];
    return [pivot[0]+dx*c-dy*s,pivot[1]+dx*s+dy*c];
  }

  // ---- SVG ----
  const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  function layerSVG(items,palette='olive',lod=3){
    const c=palettes[palette]||palettes.olive;
    return items.filter(p=>p.lod<=lod).map(p=>`<path d="${esc(p.d)}" fill="${p.fill?c[p.fill]||p.fill:'none'}"${p.stroke?` stroke="${c[p.stroke]||p.stroke}" stroke-width="${p.w}"`:''}/>`).join('');
  }
  /** Angles in degrees: heading (hull), turret (relative to hull), citv (relative to turret). */
  function turretTransform(turret,pivot=MODEL.turretPivot){
    const [px,py]=pivot;return `translate(${r3(px)} ${r3(py)}) rotate(${r3(turret)}) translate(${r3(MODEL.turretOrigin-px)} ${r3(-py)})`;
  }
  function svgBody({variant='M1A2',heading=0,turret=0,citv=0,palette='olive',lod=3,shadow=true,pivot=MODEL.turretPivot}={}){
    const L=layers(variant),[px,py]=MODEL.citvPivot,c=palettes[palette]||palettes.olive,R=MODEL.turretRingDiameter/2;
    const sh=shadow&&palette!=='line';
    const race=`<g class="race" transform="translate(${r3(pivot[0])} ${r3(pivot[1])})"><circle r="${r3(R+.1)}" fill="${c.shadow}" stroke="${c.seam}" stroke-width=".04"/>${lod>=1?`<circle r="${r3(R)}" fill="${c.body}" stroke="${c.metal}" stroke-width=".025"/>`:''}</g>`;
    return `<g stroke-linejoin="round" stroke-linecap="round" transform="rotate(${r3(heading)})">`+
      (sh?`<path d="${HULL_SHADOW_D}" transform="translate(.14 .18)" fill="#17201745"/>`:'')+
      `<g class="hull">${layerSVG(L.hull,palette,lod)}</g>`+race+
      `<g class="turret" transform="${turretTransform(turret,pivot)}">`+
      (sh?`<path d="${TURRET_SHADOW_D}" transform="translate(.11 .13)" fill="#15201345"/>`:'')+
      layerSVG(L.turret,palette,lod)+
      (L.citv.length?`<g class="citv" transform="rotate(${r3(citv)} ${px} ${py})">${layerSVG(L.citv,palette,lod)}</g>`:'')+
      `</g></g>`;
  }
  function toLabSVG(opts={}){
    const v=VARIANTS[opts.variant]||VARIANTS.M1A2;
    const vb=opts.viewBox||'-5 -2.5 12 5',[,, w,h]=vb.split(/\s+/).map(Number);
    const W=opts.width||1440,H=opts.height||Math.round(W*h/w);
    const bg=opts.background?`<rect x="${vb.split(/\s+/)[0]}" y="${vb.split(/\s+/)[1]}" width="${w}" height="${h}" fill="${esc(opts.background)}"/>`:'';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${vb}" role="img" aria-label="${v.label} Abrams top view"><title>${v.label} Abrams · top view</title><desc>Original vector interpretation. Planform traced from USMC MCWP 3-12 A-3; M1A2 fittings from US Army DVIDS 3055956. Exterior detail is approximate.</desc>${bg}${svgBody(opts)}</svg>`;
  }
  // Keep the game's existing SVG API in world-frame radians. The lab's
  // internal SVG helpers retain their explicit relative-degree convention.
  function toSVG({heading=0,turretHeading=0,commanderHeading=turretHeading,model=MODEL,...opts}={}){
    const rotated=Math.abs(heading)+Math.abs(turretHeading)>.001;
    return toLabSVG({width:rotated?1000:1440,height:rotated?1000:720,viewBox:rotated?'-6.5 -6.5 13 13':'-5 -2.5 12 5',...opts,
      variant:'M1A2',heading:heading*180/Math.PI,turret:(turretHeading-heading)*180/Math.PI,citv:(commanderHeading-turretHeading)*180/Math.PI,pivot:G.turretFrame(model).pivot});
  }
  return {MODEL,palettes,draw,toSVG,geometry:layers('M1A2'),lodFor};
})();
if(typeof module!=='undefined')module.exports=M1A2Art;
