/* T-80U exterior art study. Original vector interpretation of BTVT's 219SB1 drawing.
 * Pixel trace frame: original 2000 x 1003 sheet, lower top view, front = left.
 * Public frame: metres, +X forward, +Y vehicle right; angles in degrees clockwise.
 * Pose angles are RELATIVE to their parent: heading -> turret -> commander -> mg.
 * Visual geometry only. No vehicle profile, observation, weapons or damage behavior.
 */
'use strict';
const T80UTopView = (() => {
  const S = 7.012 / 874;
  const H = Object.freeze([807, 741]), T = Object.freeze([810, 741]);
  const C = Object.freeze([846, 671]), G = Object.freeze([806, 630]);
  const MODEL = Object.freeze({id:'T80U_ART',metresPerPixel:S,hullOriginPx:H,
    turretPivotPx:T,commanderPivotPx:C,mgPivotPx:G,muzzlePx:Object.freeze([50,741]),
    hullLength:7.012,referenceWidth:3.628,
    note:'Drawing-derived visual approximations; pivot centres are inferred, not surveyed. No year-specific combat profile.'});
  const palettes = {
    olive:{body:'#596550',deck:'#69745b',roof:'#778067',edge:'#303e30',seam:'#404c39',light:'#a5aa87',shade:'#414e3d',era:'#7a8065',eraSide:'#535f49',rubber:'#292e29',grille:'#2b382f',rib:'#74806a',glass:'#263f43',metal:'#909880',gun:'#333d36',canvas:'#68725b',strap:'#434f3d',bolt:'#a1a58a'},
    sand:{body:'#9d916d',deck:'#ac9e77',roof:'#b9aa80',edge:'#584f3a',seam:'#776a4c',light:'#ddcca1',shade:'#857551',era:'#b4a57b',eraSide:'#96865f',rubber:'#37372d',grille:'#514d3d',rib:'#a69c7c',glass:'#30484b',metal:'#c3b795',gun:'#41443a',canvas:'#938c6b',strap:'#665f48',bolt:'#d4c49b'},
    line:{body:'#e5e7df',deck:'#f3f3ed',roof:'#fafbf5',edge:'#343d34',seam:'#65705e',light:'#ffffff',shade:'#c8cfbd',era:'#e7eadf',eraSide:'#cbd1c1',rubber:'#636a60',grille:'#adb6a4',rib:'#d9dfce',glass:'#b5c8c5',metal:'#889780',gun:'#64705f',canvas:'#d5dacb',strap:'#85907a',bolt:'#5b6854'}
  };
  const layers={hull:[],turret:[],commander:[],mg:[]}; let target=layers.hull;
  const n=v=>Number(v.toFixed(3));
  function add(d,fill='body',stroke='seam',w=2,lod=0){target.push(Object.freeze({d,fill,stroke,w,lod}));}
  function path(d,color='seam',w=2,lod=1){add(d,null,color,w,lod);}
  function rect(x,y,w,h,fill='deck',lod=1,stroke='seam',sw=2){add(`M${x} ${y}h${w}v${h}h${-w}Z`,fill,stroke,sw,lod);}
  function poly(p,fill='deck',lod=1,stroke='seam',w=2){add('M'+p.map(q=>q.join(' ')).join('L')+'Z',fill,stroke,w,lod);}
  function ellipse(x,y,rx,ry,fill='deck',lod=1,stroke='seam',w=2){add(`M${x-rx} ${y}a${rx} ${ry} 0 1 0 ${2*rx} 0a${rx} ${ry} 0 1 0 ${-2*rx} 0Z`,fill,stroke,w,lod);}
  function bolt(x,y){ellipse(x,y,1.7,1.7,'bolt',3,null,0);}
  function bolts(x,y,w,h){for(const p of [[x+6,y+6],[x+w-6,y+6],[x+6,y+h-6],[x+w-6,y+h-6]])bolt(...p);}
  function panel(x,y,w,h,fill='deck'){rect(x,y,w,h,fill,1);path(`M${x+3} ${y+h-3}V${y+3}H${x+w-3}`,'light',1,2);bolts(x,y,w,h);}
  function handle(x,y){path(`M${x-6} ${y+3}v-6h12v6`,'edge',3,2);path(`M${x-5} ${y-3}h10`,'light',1.2,3);}
  function grille(x,y,w,h){rect(x,y,w,h,'grille',1,'edge');for(let yy=y+4;yy<y+h-2;yy+=5)path(`M${x+2} ${yy}h${w-4}`,'rib',1.5,2);}
  function localRect(cx,cy,x,y,w,h,deg,fill,lod=2){const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([u,v])=>[n(cx+u*c-v*s),n(cy+u*s+v*c)]),fill,lod);}

  // HULL: closed fender/side-skirt silhouette. No exposed top track bands.
  add('M384 516H1190L1204 533V550H1232V589H1245V890H1232V929H1204V947L1190 966H385Q374 964 374 951V533Q374 519 384 516Z','body','edge',3.5);
  for(const y of [520,879]){
    rect(397,y,792,82,'shade',0,'edge',2);
    path(`M404 ${y+4}H1186`,'light',2,1);
    for(const [x,w] of [[400,111],[516,126],[646,111],[762,132],[898,139],[1041,144]]){
      panel(x,y+8,w,65,'deck');
      path(`M${x+8} ${y+19}h${w-16}M${x+8} ${y+56}h${w-16}`,'light',1.5,2);
      handle(x+w*.55,y+39);
    }
    // Raised fender stowage pressed lids, front rubber mudflap.
    rect(375,y+2,22,77,'rubber',0,'edge');
    path(`M384 ${y+7}v66`,'shade',2,2);
    panel(449,y+14,58,51,'body');
    path(`M456 ${y+22}h44v34h-44Z M465 ${y+22}v34 M493 ${y+22}v34`,'light',2,2);
    for(const x of [412,537,663,789,920,1070,1166]){rect(x,y-2,15,7,'metal',2);bolt(x+7,y+1);}
  }
  // Sloping glacis with two banks of Kontakt-5 covers.
  poly([[399,606],[581,606],[638,653],[638,829],[581,873],[399,873]],'deck',0);
  path('M404 611V867 M430 611V867','light',2,1);
  for(const [y,rows] of [[614,2],[769,2]])for(let j=0;j<rows;j++)for(let i=0;i<3;i++){
    const x=414+i*49,yy=y+j*43;panel(x,yy,44,38,'era');path(`M${x+4} ${yy+31}h36`,'shade',3,2);
  }
  // Driver opening visible when the turret turns away.
  add('M575 695Q556 699 552 716V766Q558 784 578 787L619 771V713Z','body','edge',2.5,1);
  path('M565 714L603 710V772L565 768Z','light',1.5,2);handle(579,746);
  rect(548,715,8,52,'glass',2);rect(557,696,22,9,'glass',2);rect(557,779,22,9,'glass',2);
  // Lamp cages and tow fittings at the nose; no visible tread drawn underneath.
  for(const y of [611,853]){ellipse(399,y,8,9,'metal',2,'edge');rect(401,y-17,24,11,'shade',2);path(`M398 ${y-20}h30v17h-30Z`,'edge',2,2);}
  // Turret race and otherwise hidden central deck are completed for all-angle rotation.
  rect(638,603,351,272,'body',0);
  ellipse(...T,130,130,'shade',0,'edge',2);ellipse(...T,122,122,'deck',1,'metal',2);
  // Engine deck, bolted access covers and louvers.
  panel(982,603,244,274,'deck');
  panel(999,614,213,108,'body');panel(999,759,213,106,'body');
  for(const y of [621,766]){
    path(`M1009 ${y}h176l16 14v65l-16 13h-176`,'light',2,2);
    path(`M1021 ${y+10}h143q18 0 18 18v35q0 18-18 18h-143`,'seam',2,2);
    for(const x of [1043,1156])handle(x,y+46);
  }
  grille(999,727,91,26);grille(1099,727,113,26);
  // Rear exhaust, tool rails and empty external drum brackets, matching the plan view.
  rect(1224,632,21,215,'shade',0,'edge');grille(1229,638,13,202);
  for(const y of [557,592,897,929]){
    path(`M1202 ${y}h69v8h-33`,'metal',3,1);
    rect(1245,y,26,7,'body',1);bolt(1266,y+3);
  }
  for(const y of [609,866]){path(`M1015 ${y}h183`,'metal',4,2);for(const x of [1033,1104,1182])rect(x,y-4,6,8,'strap',2);}

  target=layers.turret;
  // Rounded cast turret. Trace uses asymmetric front cheeks and the rear stowage outline.
  add('M625 654L656 610L706 565L777 528L799 580L824 588L953 619L1007 656L1030 796L996 861L901 916L777 963L720 942L668 899L623 841L645 791V705Z','shade','edge',3);
  add('M655 707Q648 679 667 645Q691 606 738 585Q778 563 838 563Q896 565 938 596Q970 624 981 670L997 710Q1004 758 985 811Q966 863 917 894Q865 922 805 918Q748 913 705 885Q671 862 656 827Q644 797 651 770L637 761V719Z','body','edge',3.5);
  add('M675 690Q689 626 750 600Q802 574 858 587Q925 596 948 653L963 708Q980 759 959 811Q935 873 878 890Q819 905 764 881Q701 862 680 811Q666 779 672 749Z','roof','seam',2.5);
  path('M692 685Q710 626 759 611Q815 587 860 601 M692 800Q709 860 766 878 M946 658Q977 730 953 809','light',2,1);
  // Rear turret bin and cylindrical deep-wading tube (stowed across rear turret).
  poly([[943,636],[977,627],[1028,681],[1020,820],[979,855],[953,838],[979,789],[980,711]],'shade',0,'edge',2.5);
  poly([[956,636],[977,634],[1013,685],[1009,821],[978,845],[965,835],[988,783],[986,710]],'deck',1);
  add('M944 669Q941 651 953 649Q966 647 973 665L1011 800Q1016 818 1004 824Q991 828 986 809Z','canvas','edge',2.5,0);
  path('M953 657L997 812','light',3,1);
  for(const y of [691,772]){const x=954+(y-665)*.29;path(`M${x-5} ${y+3}l24 -7`,'strap',5,1);}
  ellipse(956,662,10,7,'grille',2,'metal');
  // Forward cheek ERA blocks: independent trapezoids traced from the sheet.
  const era=[[[632,651],[655,628],[689,656],[666,683]],[[678,620],[713,598],[737,628],[705,650]],[[716,592],[752,576],[767,610],[739,625]],[[731,543],[779,529],[791,566],[742,581]],
    [[634,834],[659,813],[687,846],[660,867]],[[680,874],[708,852],[738,877],[714,901]],[[717,904],[745,879],[772,897],[752,927]],[[756,928],[779,895],[814,907],[804,944]]];
  for(const p of era){poly(p,'era',0,'edge',2);const q=p.map(([x,y])=>[x+3,y+3]);path(`M${q[0]}L${q[1]}L${q[2]}`,'light',2,1);const cx=p.reduce((a,v)=>a+v[0],0)/4,cy=p.reduce((a,v)=>a+v[1],0)/4;bolt(cx,cy);}
  // Slanted side stowage boxes and lids match the upper/lower plan outline.
  for(const p of [[[800,552],[836,563],[824,599],[791,586]],[[854,568],[946,596],[934,635],[842,604]],[[947,597],[978,609],[967,643],[936,633]],[[806,910],[840,899],[854,935],[820,949]],[[843,899],[919,869],[937,907],[858,940]],[[925,870],[978,848],[994,880],[944,907]]]){
    poly(p,'deck',0,'edge',2);path(`M${p[0][0]+4} ${p[0][1]+3}L${p[1][0]-4} ${p[1][1]+3}`,'light',2,1);
    const x=(p[0][0]+p[2][0])/2,y=(p[0][1]+p[2][1])/2;handle(x,y);
  }
  // Roof ERA panels ahead of crew hatches.
  for(const y of [682,744])for(let i=0;i<3;i++)panel(716+i*29,y,26,55,'era');
  // Fixed gunner hatch (vehicle left = lower half of original front-left plan).
  ellipse(864,807,49,43,'shade',1,'edge',2.5);ellipse(864,807,42,37,'roof',1,'light',2);
  path('M833 786Q864 771 897 795M830 820Q865 845 895 819','seam',2,2);handle(868,815);
  rect(871,852,20,10,'metal',2);rect(817,849,19,10,'metal',2);
  // 1G46 and night sight housings: attached to turret, not commander.
  poly([[674,756],[692,748],[709,774],[695,787],[674,781]],'deck',1,'edge');
  rect(663,756,11,25,'glass',2);panel(798,746,39,30,'deck');rect(796,752,6,18,'glass',2);
  panel(832,723,33,31,'body');handle(849,741);
  // Commander's fixed race. Moving cupola/sight follows as a separate child.
  ellipse(...C,49,48,'shade',0,'edge',2.5);ellipse(...C,44,43,'metal',1,'edge',1.5);
  // Smoke launchers: grouped tubes at both forward sides, never wheel/track details.
  for(const sign of [-1,1])for(let i=0;i<4;i++){
    const x=663+i*16,y=741+sign*(127+i*15);
    path(`M${x+26} ${y-sign*15}L${x} ${y}`,'edge',12,1);
    path(`M${x+24} ${y-sign*15}L${x} ${y}`,'rib',8,1);
    ellipse(x,y,5,6,'gun',2,'metal',1.5);
  }
  // Rear aerial bases, lifting eyes and grab rails.
  for(const [x,y] of [[925,613],[941,862]]){ellipse(x,y,7,7,'metal',1,'edge');ellipse(x,y,3,3,'rubber',2);}
  path('M883 587Q926 590 949 627 M886 903Q936 894 960 857','metal',3,2);
  for(const [x,y] of [[690,714],[690,773],[907,678],[919,807]]){ellipse(x,y,5,8,'body',2,'metal',2);}
  // Canvas mantlet and 125mm 2A46 thermal sleeve. Frontmost point = source pixel 50.
  add('M650 714Q685 703 690 719L694 763Q693 782 678 782L650 775L623 761V731L640 726Z','canvas','edge',2.5);
  path('M646 713L633 728V758L647 770M657 718L649 732V751L659 766','light',2,2);
  add('M623 731H550V735H448V733H438V735H345L334 730H233V735H163V733H150V735H82V733H72V730H55L50 734V748L55 752H72V749H82V747H150V750H163V748H233V757H334L345 751H438V754H448V751H550V755H623Z','body','edge',2.5);
  path('M615 736H553M540 740H451M433 740H348M327 735H239M228 740H166M146 740H86','light',2.6,1);
  for(const x of [72,82,150,163,233,327,334,345,438,448,546,550])path(`M${x} ${x>=233&&x<=334?731:734}v19`,'shade',2,2);
  rect(50,736,4,11,'rubber',1,null);rect(556,724,13,7,'metal',2);

  target=layers.commander;
  ellipse(854,652,41,40,'body',0,'edge',2);
  ellipse(854,652,33,32,'roof',1,'light',2);
  path('M832 631Q849 620 872 635L880 659Q861 683 835 669Z','seam',2,1);
  handle(860,657);rect(875,632,13,9,'metal',2);rect(875,671,13,9,'metal',2);
  // TKN-4S head at front of the cupola. No Abrams CITV geometry.
  panel(801,633,26,38,'body');rect(798,639,7,26,'glass',1,'edge');path('M805 636v31','light',2,2);
  for(const a of [65,145,215,295])localRect(854,652,34,-5,8,10,a,'glass',2);
  // Mount on the cupola carries the NSVT local azimuth pivot.
  poly([[822,617],[837,632],[832,640],[807,623],[804,608]],'metal',1,'edge');
  ellipse(814,611,9,9,'shade',1,'edge');

  target=layers.mg;
  // Manual NSVT station: separate yaw for art inspection, not a traverse mechanism simulation.
  rect(794,605,47,12,'gun',1,'edge');rect(824,601,17,7,'shade',2);
  rect(779,608,15,6,'metal',1);rect(719,609,60,4,'gun',1,null);rect(714,607,7,8,'gun',1);
  for(const x of [726,733,740])rect(x,608,2,6,'metal',3,null);
  rect(804,618,28,19,'body',1,'edge');path('M810 622h17v11h-17','light',1.5,2);
  path('M838 610l13 -4v12','gun',3,2);path('M803 602h22','metal',2,2);
  Object.values(layers).forEach(Object.freeze);Object.freeze(layers);

  const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  const angle=v=>{const a=finite(v);return ((a+180)%360+360)%360-180;};
  function normalize(p={}){return {heading:angle(p.heading),turret:angle(p.turret),commander:angle(p.commander),mg:angle(p.mg),lod:Math.max(0,Math.min(3,Math.round(finite(p.lod,3)))),palette:Object.hasOwn(palettes,p.palette)?p.palette:'olive',axes:!!p.axes};}
  function rotate(p,c,a){const r=a*Math.PI/180,dx=p[0]-c[0],dy=p[1]-c[1];return [c[0]+dx*Math.cos(r)-dy*Math.sin(r),c[1]+dx*Math.sin(r)+dy*Math.cos(r)];}
  function worldPoint(point,part='hull',pose={}){
    const p=normalize(pose);let q=[...point];
    if(part==='mg')q=rotate(q,G,p.mg);
    if(part==='commander'||part==='mg')q=rotate(q,C,p.commander);
    if(part!=='hull')q=rotate(q,T,p.turret);
    q=[(H[0]-q[0])*S,(H[1]-q[1])*S];return rotate(q,[0,0],p.heading);
  }
  function landmarks(p){return {turretPivot:worldPoint(T,'hull',p),commanderPivot:worldPoint(C,'turret',p),mgPivot:worldPoint(G,'commander',p),muzzle:worldPoint(MODEL.muzzlePx,'turret',p),sight:worldPoint([790,671],'commander',p),mgMuzzle:worldPoint([706,630],'mg',p)};}
  const sourceMatrix=`matrix(${-S} 0 0 ${-S} ${H[0]*S} ${H[1]*S})`;
  const turn=(a,c)=>`rotate(${a} ${c[0]} ${c[1]})`;
  function svgBody(pose={}){
    const p=normalize(pose),c=palettes[p.palette];
    const render=k=>{const content=layers[k].filter(x=>x.lod<=p.lod).map(x=>`<path d="${x.d}" fill="${c[x.fill]||'none'}" stroke="${c[x.stroke]||'none'}" stroke-width="${x.w}" stroke-linejoin="round" stroke-linecap="round"/>`).join('');return (k==='commander'||k==='mg')?`<g transform="translate(-8 19)">${content}</g>`:content;};
    const axis=(pt,color)=>`<g stroke="${color}" fill="none" stroke-width="1.4"><circle cx="${pt[0]}" cy="${pt[1]}" r="12"/><path d="M${pt[0]-18} ${pt[1]}h36M${pt[0]} ${pt[1]-18}v36"/></g>`;
    return `<g data-part="hull" transform="rotate(${p.heading})"><g transform="${sourceMatrix}">${render('hull')}<g data-part="turret" transform="${turn(p.turret,T)}">${render('turret')}<g data-part="commander" transform="${turn(p.commander,C)}">${render('commander')}<g data-part="mg" transform="${turn(p.mg,G)}">${render('mg')}</g>${p.axes?axis(G,'#e6b67e'):''}</g>${p.axes?axis(C,'#9ed4e0'):''}</g>${p.axes?axis(T,'#e3dfab'):''}</g></g>`;
  }
  function toSVG(p={}){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6.6 -6.6 13.2 13.2" width="1200" height="1200" role="img" aria-label="T-80U exterior top view"><title>T-80U exterior art study</title>${svgBody(p)}</svg>`;}
  const pathCache=new Map();
  function draw(ctx,pose={},options={}){
    const p=normalize(pose),c=palettes[p.palette],scale=Math.max(.01,finite(options.pixelsPerMetre,50));
    const paint=k=>{ctx.save();if(k==='commander'||k==='mg')ctx.translate(-8,19);for(const x of layers[k]){if(x.lod>p.lod)continue;let d=pathCache.get(x);if(!d){d=new Path2D(x.d);pathCache.set(x,d);}if(x.fill){ctx.fillStyle=c[x.fill];ctx.fill(d);}if(x.stroke){ctx.strokeStyle=c[x.stroke];ctx.lineWidth=x.w;ctx.stroke(d);}}ctx.restore();};
    const spin=(a,q)=>{ctx.translate(...q);ctx.rotate(a*Math.PI/180);ctx.translate(-q[0],-q[1]);};
    ctx.save();ctx.translate(finite(options.x),finite(options.y));ctx.scale(scale,scale);ctx.rotate(p.heading*Math.PI/180);ctx.transform(-S,0,0,-S,H[0]*S,H[1]*S);ctx.lineJoin='round';ctx.lineCap='round';
    paint('hull');spin(p.turret,T);paint('turret');spin(p.commander,C);paint('commander');spin(p.mg,G);paint('mg');ctx.restore();
  }
  return Object.freeze({MODEL,layers,normalize,worldPoint,landmarks,svgBody,toSVG,draw,sourceMatrix});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=T80UTopView;
if(typeof window!=='undefined')window.T80UTopView=T80UTopView;
