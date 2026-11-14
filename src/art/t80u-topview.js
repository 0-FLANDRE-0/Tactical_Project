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
    olive:{barrel:'#899174',barrelLight:'#c2c5a6',body:'#596550',deck:'#69745b',roof:'#778067',edge:'#303e30',seam:'#404c39',light:'#a5aa87',shade:'#414e3d',era:'#7a8065',eraSide:'#535f49',rubber:'#292e29',grille:'#2b382f',rib:'#74806a',glass:'#263f43',metal:'#909880',gun:'#333d36',canvas:'#68725b',strap:'#434f3d',bolt:'#a1a58a'},
    sand:{barrel:'#c3b187',barrelLight:'#eddbb1',body:'#9d916d',deck:'#ac9e77',roof:'#b9aa80',edge:'#584f3a',seam:'#776a4c',light:'#ddcca1',shade:'#857551',era:'#b4a57b',eraSide:'#96865f',rubber:'#37372d',grille:'#514d3d',rib:'#a69c7c',glass:'#30484b',metal:'#c3b795',gun:'#41443a',canvas:'#938c6b',strap:'#665f48',bolt:'#d4c49b'},
    line:{barrel:'#f1f2e9',barrelLight:'#fff',body:'#e5e7df',deck:'#f3f3ed',roof:'#fafbf5',edge:'#343d34',seam:'#65705e',light:'#ffffff',shade:'#c8cfbd',era:'#e7eadf',eraSide:'#cbd1c1',rubber:'#636a60',grille:'#adb6a4',rib:'#d9dfce',glass:'#b5c8c5',metal:'#889780',gun:'#64705f',canvas:'#d5dacb',strap:'#85907a',bolt:'#5b6854'}
  };
  const layers={hull:[],turret:[],commander:[],mg:[]}; let target=layers.hull; let feature='';
  const n=v=>Number(v.toFixed(3));
  function add(d,fill='body',stroke='seam',w=2,lod=0){target.push(Object.freeze({d,fill,stroke,w,lod,feature}));}
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

  // HULL. Coordinates below are traced in the unmodified reference-image frame.
  feature='hull-outline';
  add('M390 520H1194Q1212 520 1228 536L1242 555V934L1225 951H1191V965H391Q374 965 374 948V878L393 864V624L375 618V536Q375 520 390 520Z','body','edge',2);
  // Complete glacis surface under the gun. The narrow centre strip is NOT an ERA gap.
  feature='glacis';
  add('M392 620H593L637 653L648 703V788L623 839L590 868H392Z','deck','edge',1.8);
  path('M399 625H589L628 657V837L589 860H399Z','light',1.5,1);
  // Actual irregular front ERA covers, continuous behind the main-gun layer.
  feature='hull-era';
  rect(413,630,149,62,'era',0);rect(414,806,150,53,'era',0);
  // Outer rectangular lids and central ribbed lids of the two larger packs.
  for(const [y,h] of [[636,51],[810,44]]){
    rect(468,y,38,h,'deck',1);rect(528,y,28,h,'deck',1);
    for(const x of [480,543]){rect(x,y-5,7,10,'metal',2);rect(x,y+h-5,7,10,'metal',2);}
    for(const yy of [y+10,y+h-15]){rect(508,yy,20,5,'light',2);for(const x of [511,517,523])bolt(x,yy+2);}
    for(const x of [477,495,536,550]){ellipse(x,y+h*.5,2.8,2.8,'edge',2);bolt(x,y+h*.5);}
  }
  // Three broad central cover rows continue below the forward-aligned gun.
  // The source hides y=734..757; that narrow continuation is inferred and documented.
  rect(400,697,158,102,'era',0);
  for(const [y,h] of [[698,29],[728,38],[767,31]]){
    rect(400,y,65,h,'era',1);rect(467,y,52,h,'era',1);rect(521,y,37,h,'eraSide',1);
    for(const x of [407,455,475,510]){path(`M${x-3} ${y+12}h6M${x} ${y+9}v6`,'edge',1.5,2);}
  }
  path('M397 694H562V802H397M397 728H558M397 767H558','light',1.5,1);
  // Front hull fixtures are asymmetric; do not mirror a generic set of boxes.
  panel(416,636,43,30,'body');rect(450,636,9,23,'metal',2);rect(452,640,4,14,'glass',2);
  panel(416,826,49,28,'body');rect(448,822,13,32,'shade',2);path('M452 825v26M457 825v26','metal',2,2);
  for(const y of [678,818]){ellipse(443,y,5,4,'metal',2);path(`M445 ${y}h18l2 -3h8v8h-8l-2 -3h-18`,'edge',2,2);}
  // Driver hatch, revealed when the turret is traversed.
  feature='driver';
  add('M579 702L604 706L632 732V761Q615 786 594 788Q570 787 559 768V723Z','body','edge',2,1);
  path('M583 709L601 712L625 735V759Q608 780 592 780Q570 778 566 764V727Z','light',1.4,2);
  poly([[563,704],[580,704],[569,717],[562,728]],'metal',2);
  poly([[560,768],[575,782],[588,789],[561,790]],'metal',2);
  for(const [x,y] of [[568,711],[572,784]])bolt(x,y);
  handle(599,755);
  // Central deck: only the portion hidden by the turret is an inferred completion.
  feature='hull-hidden';rect(637,620,355,249,'body',0);
  ellipse(...T,130,130,'shade',0,'edge',1.5);ellipse(...T,124,124,'deck',1,'metal',1.5);
  // Fender covers: large ribbed panels, with two actual forward stowage lids.
  feature='fenders';
  for(const [y,h] of [[521,99],[871,91]]){
    rect(396,y,799,h,'deck',0,'edge',2);
    rect(375,y+2,23,h-3,'rubber',0,'edge',1.5);
    path(`M398 ${y+3}v${h-6}M410 ${y+3}v${h-6}M430 ${y+3}v${h-6}M1189 ${y+3}v${h-6}`,'seam',1.5,1);
    for(const [x,w] of [[430,80],[513,131],[647,140],[791,172],[967,221]]){
      rect(x,y+8,w,h-15,'deck',1,'seam',1.6);
      path(`M${x+3} ${y+11}h${w-6}v${h-21}h${6-w}Z`,'light',1,2);
      for(const yy of [y+25,y+43,y+61]){
        add(`M${x+12} ${yy}h${w-24}q5 0 5 3q0 3-5 3H${x+12}q-5 0-5-3q0-3 5-3Z`,'shade',null,0,2);
        path(`M${x+12} ${yy+1}h${w-24}`,'light',1.4,2);
      }
    }
    // Rounded, strapped stowage lid at x529..621, not the old x449 rectangle.
    add(`M542 ${y+26}h65q15 0 15 15v22q0 14-15 14h-65q-13 0-13-14V${y+41}q0-15 13-15Z`,'body','edge',1.7,1);
    path(`M541 ${y+32}h67q8 0 8 10v19q0 10-8 10h-67q-7 0-7-10V${y+42}q0-10 7-10Z`,'light',1,2);
    for(const x of [548,575,603]){rect(x,y+23,5,57,'strap',2);rect(x-2,y+29,9,5,'metal',2);rect(x-2,y+68,9,5,'metal',2);}
    for(const x of [500,507])path(`M${x} ${y+17}v${h-29}`,'metal',2,2);
    for(const yy of [y+21,y+46,y+76]){rect(390,yy,6,12,'metal',2);rect(413,yy+2,7,8,'shade',2);}
    for(const x of [447,529,620,681,888,1135]){rect(x,y+3,17,5,'metal',2);bolt(x+8,y+5);}
    ellipse(444,y+h-13,7,8,'body',2,'edge',1.4);
  }
  // Thin skirt top edges and actual skirt attachment points.
  for(const y of [517,961]){
    path(`M431 ${y}H1194`,'edge',2,0);path(`M431 ${y+3}H1193`,'light',1,1);
    for(const x of [431,548,661,768,893,1031,1173]){
      const span=Math.min(109,1194-x);path(`M${x} ${y}v10h${span}V${y}`,'seam',1,2);
      for(const dx of [14,81].filter(d=>d+15<span)){path(`M${x+dx} ${y+6}l7 -3l8 3`,'metal',2,2);bolt(x+dx+7,y+3);}
    }
  }
  // Rear engine cover is ONE pressed rectangular plate; no twin oval covers/grille.
  feature='engine-deck';
  add('M1020 612H1186V869H1024L1007 638Z','deck','edge',2,0);
  path('M1027 620H1181V860H1032Z','light',1.5,1);
  path('M1050 694H1147V786H1056M1046 650L1113 681M1050 695L1036 661M1146 694L1173 669L1128 647M1054 788L1035 809M1148 788L1175 817M1059 642H1108M1114 625L1106 655M1123 651L1113 678M1036 629L1044 649M1051 813L1108 798M1114 800L1125 858M1123 795L1126 835M1154 842L1170 829','seam',1.8,1);
  for(const [x,y] of [[1050,635],[1044,813]]){ellipse(x,y,10,10,'body',1,'edge',1.6);ellipse(x,y,6,6,'deck',2,'metal',1);path(`M${x-13} ${y}h26M${x} ${y-13}v26`,'seam',1,2);}
  for(const y of [640,841]){ellipse(1155,y,4,5,'metal',2,'edge',1.5);}
  // Rear panel, central exhaust aperture and drum brackets, as seen from above.
  feature='rear-fixtures';
  add('M1190 617H1207Q1213 617 1213 625V660L1203 677V811L1215 827V862Q1215 869 1206 869H1190Z','body','edge',2,0);
  add('M1204 676H1240V816H1204Z','shade','edge',2,0);
  rect(1210,683,26,126,'deck',1);path('M1215 688H1232V802H1215Z','seam',1.3,2);
  for(const y of [695,786])rect(1207,y,6,11,'metal',2);
  for(const y of [557,584,617,821,857,894,930]){
    const wide=[557,584,894,930].includes(y),end=wide?1274:1236;
    rect(1213,y,end-1213,6,'body',1,'edge',1.5);path(`M1217 ${y+1}H${end-2}`,'light',1,2);
  }
  for(const y of [550,815]){
    path(`M1243 ${y}v115h34V${y}Z`,'shade',2,1);
    path(`M1255 ${y+4}v107M1267 ${y+4}v107`,'metal',1,2);
  }
  path('M1193 524Q1236 537 1246 593V653M1202 946Q1242 945 1247 922','metal',3,1);
  for(const [x,y] of [[1245,596],[1245,642],[1223,888]]){ellipse(x,y,7,5,'body',2,'edge',1.8);path(`M${x-4} ${y}h8`,'light',1,2);}

  target=layers.turret;
  // Front ERA carrier / underside follows the wide fan, NOT a ring of little tiles.
  feature='turret-carrier';
  add('M622 648L654 611L700 570L738 544L777 528L790 577L795 598L776 607L729 626L686 655L665 681L652 706L647 721L622 710Z','shade','edge',2,0);
  add('M647 774L663 817L696 856L743 887L788 901L778 960L730 946L690 918L660 886L624 842L606 797Z','shade','edge',2,0);
  // Cast shell and the broad sloping front shoulders beneath the ERA covers.
  feature='turret-cast';
  add('M650 704L657 677Q664 660 688 645Q726 617 789 596L807 582L935 626Q954 642 962 673L976 736L966 815Q958 846 931 865L875 891L805 909Q759 903 717 879Q674 854 656 808L647 778Z','body','edge',2.2);
  add('M684 674Q693 656 727 643L783 615L805 608L933 649L953 688L956 807L935 848L874 876L809 893Q764 885 726 862Q699 843 680 809Q670 783 675 751L681 724Z','roof','seam',1.7);
  path('M690 676Q709 651 757 632L789 620M682 786Q700 837 743 862M813 897L876 882','light',1.5,1);
  // ERA faces traced at their true size/angle with the edge rails between blocks.
  feature='turret-era';
  const era=[
    [[628,650],[653,624],[682,648],[663,674]],
    [[654,612],[696,575],[718,612],[683,644]],
    [[699,573],[738,546],[757,590],[720,611]],
    [[740,545],[778,530],[788,575],[758,589]],
    [[608,796],[645,786],[665,823],[631,842]],
    [[632,844],[665,825],[695,858],[664,884]],
    [[666,886],[696,860],[738,884],[720,922]],
    [[722,924],[740,886],[785,900],[777,956]]
  ];
  for(const p of era){poly(p,'era',0,'edge',1.6);path(`M${p[0][0]+2} ${p[0][1]+2}L${p[1][0]} ${p[1][1]+2}`,'light',1.8,1);}
  // Continuous fastening rail along the inner lower edge of the front ERA fan.
  path('M647 691L669 665L692 645L726 622L761 607L791 599M652 802L680 844L714 874L748 891L787 900','edge',5,1);
  path('M647 690L669 664L692 644L726 621L761 606L791 598M652 801L680 843L714 873L748 890L787 899','metal',2,1);
  for(const [x,y] of [[664,666],[689,645],[721,622],[756,608],[786,600],[676,840],[713,871],[749,890],[781,898]]){rect(x-2,y-5,4,10,'metal',2);bolt(x,y);}
  // Six roof ERA rows at left; irregular packs extend around/between both hatches.
  feature='roof-era';
  poly([[717,640],[739,650],[779,652],[780,703],[797,704],[797,778],[733,782],[718,788]],'era',0);
  for(const [x,y,w,h] of [[739,652,40,18],[739,671,40,19],[739,691,40,18],[739,710,40,19],[739,730,40,19],[739,750,40,18],[739,769,40,12],[780,706,17,71],[798,747,37,33],[808,730,50,16],[859,718,48,16],[843,747,46,17],[883,701,47,17],[913,652,29,14],[920,666,36,19],[920,686,36,18],[930,704,26,33],[911,787,44,18],[911,806,44,19],[911,826,44,14]]){
    rect(x,y,w,h,'era',1,'seam',1.2);
    if(w>25){path(`M${x+5} ${y+6}v5M${x+3} ${y+8}h4M${x+w-5} ${y+6}v5M${x+w-7} ${y+8}h4`,'edge',1,2);}
  }
  path('M726 646V782M733 649V782','light',1.1,1);
  // Rear stowage: exact outline and short oval on its lid (not an invented long tube).
  feature='turret-rear';
  poly([[936,640],[1009,620],[1040,786],[1060,828],[972,852],[955,785],[955,693]],'shade',0,'edge',2);
  poly([[943,651],[1002,634],[1027,748],[968,765]],'deck',1);
  poly([[970,778],[1031,760],[1048,819],[986,838]],'deck',1);
  path('M944 653L1003 636L1024 744L967 761ZM970 781L1031 764M955 691L974 780','light',1.2,2);
  add('M974 662Q989 648 997 671L1016 718Q1025 739 1011 747Q995 755 985 730L967 684Q963 670 974 662Z','canvas','edge',1.8,1);
  path('M978 665Q985 659 991 674L1010 721Q1016 738 1008 740Q1000 744 991 724L973 682Q969 670 978 665Z','light',1.3,2);
  path('M969 690L1006 680M984 730L1020 719','strap',2.5,2);
  for(const [x,y] of [[962,637],[984,810]]){
    poly([[x,y],[x+35,y-9],[x+43,y+17],[x+7,y+27]],'body',1);
    path(`M${x+4} ${y+3}l27 -7l6 18l-27 7Z`,'light',1.2,2);
  }
  path('M1019 625L1056 834L978 856M1025 625L1061 837L979 861','metal',2,2);
  for(const y of [627,818]){
    for(let i=0;i<6;i++)path(`M${1005+i*4} ${y}l15 23M${1005+i*4} ${y+23}l7 -23`,'seam',.8,3);
  }
  // Long side bins are individually aligned, not one generic mirrored array.
  feature='turret-bins';
  for(const p of [[[799,550],[837,564],[824,600],[787,585]],[[852,566],[940,595],[928,635],[839,603]],[[945,596],[974,605],[968,643],[933,634]],[[805,907],[841,893],[857,933],[820,949]],[[842,892],[907,868],[924,907],[858,934]],[[910,868],[979,839],[994,879],[932,907]]]){
    poly(p,'deck',0,'edge',1.7);path(`M${p[0][0]+3} ${p[0][1]+3}L${p[1][0]-3} ${p[1][1]+3}L${p[2][0]-3} ${p[2][1]-3}`,'light',1.2,1);
    const dx=p[3][0]-p[0][0],dy=p[3][1]-p[0][1];
    for(const f of [.15,.85]){const x=p[0][0]+(p[1][0]-p[0][0])*f,y=p[0][1]+(p[1][1]-p[0][1])*f;path(`M${x} ${y}l${dx} ${dy}`,'strap',3,2);}
  }
  // Commander and gunner hatches at measured centres, with the actual asymmetry.
  feature='hatches';
  ellipse(...C,49,48,'shade',0,'edge',1.8);ellipse(...C,46,45,'metal',1,'edge',1.1);
  ellipse(868,808,48,43,'shade',0,'edge',1.7);ellipse(868,808,44,39,'roof',1,'metal',1.3);
  path('M833 788Q856 767 879 774Q913 781 909 813Q905 844 877 847Q845 847 830 823','light',1.6,1);
  poly([[827,782],[842,787],[830,833],[816,828]],'body',1);path('M831 790L821 823M837 791L827 825','metal',3,2);
  for(const [x,y] of [[828,785],[817,826],[850,846]])localRect(x,y,-3,-7,8,14,17,'metal',2);
  ellipse(900,814,3,3,'edge',2);bolt(900,814);
  // Fixed gunner sight cover and periscopes, located aft/left of the mantlet.
  feature='turret-fittings';
  add('M724 791H749Q761 791 761 803V820Q761 830 749 830H724Z','deck','edge',1.7,1);
  rect(715,799,25,22,'body',1);path('M738 796V827','light',1.5,2);
  ellipse(798,807,11,11,'body',1,'edge',1.4);ellipse(811,837,18,16,'deck',1,'edge',1.6);ellipse(811,837,14,12,null,2,'light',1);
  poly([[803,861],[814,856],[816,875],[805,881]],'body',2);
  panel(903,747,30,29,'body');rect(899,746,4,6,'metal',2);
  add('M941 761h12v14h-9q-8 0-8-7q0-7 5-7Z','body','edge',1.5,1);
  for(const [x,y] of [[781,625],[798,731],[908,642],[941,714],[916,844],[809,931]]){
    ellipse(x,y,8,8,'body',1,'edge',1.3);ellipse(x,y,5,5,'deck',2,'metal',1);bolt(x,y);
  }
  // Four launcher tubes on each forward fan. Their bases and angle differ by side.
  feature='smoke';
  for(const [x,y,dx,dy] of [[663,614,22,2],[680,598,24,1],[695,582,26,1],[714,568,27,1],[668,871,22,0],[684,888,23,0],[699,902,26,0],[719,916,26,0]]){
    path(`M${x} ${y}l${dx} ${dy}`,'edge',12,1);path(`M${x+1} ${y-2}l${dx-3} ${dy}`,'rib',8,1);
    ellipse(x,y,4,6,'gun',2,'metal',1.2);path(`M${x+dx-6} ${y-5}v10`,'metal',1.5,2);
    path(`M${x+dx} ${y+2}l3 9l-7 -2`,'seam',2,2);
  }
  // Mantlet: traced contour, not the previous small angular shape.
  feature='mantlet';
  add('M623 729L640 724L650 714L674 710Q687 707 691 719Q695 741 694 764Q694 781 683 782L653 777L641 765L624 759Q620 754 620 744Q620 733 623 729Z','canvas','edge',1.8);
  path('M628 732L643 729L654 719L674 715Q684 713 687 723L689 763Q689 776 681 777L656 772L643 762L628 757','light',1.3,2);
  // Gun exterior envelope measured from the reference: 18..28px, not 12px.
  // 125mm is the bore, not the outer diameter. The diagram has a slight scan skew.
  feature='gun-shell';
  add('M50 737Q50 732 55 731H73V733H82V734H149V731H155V734H162L231 734V730H239L326 730L334 733L344 735L438 734V732H448V734L545 734V731H553L620 731V758H553V759H545V756L448 755V757H438V754L344 755L334 755L326 758L239 757H231V754L162 754V755H149V752H82V754H73V752H55Q50 751 50 747Z','barrel','edge',1.2);
  feature='gun-detail';
  add('M83 736H148V739H83ZM163 736L230 736V740L163 739ZM241 732L325 732V738L241 736ZM346 736L436 736V740L346 740ZM450 736H543V740H450ZM555 733H618V739H555Z','barrelLight',null,0,1);
  path('M83 750H148M165 751L229 751M242 754L324 755M347 752H436M451 753L543 754M556 755H618','shade',2.2,1);
  // Long narrow sleeve ribs are highlights INSIDE the envelope, not the tube outline.
  for(const [x,w,y] of [[87,54,742],[171,51,742],[354,78,743],[452,85,743]]){
    rect(x,y,w,3,'shade',2,null);path(`M${x+2} ${y}h${w-4}`,'light',.8,2);
  }
  for(const [x,top,bottom] of [[73,731,754],[80,732,754],[150,731,754],[157,733,755],[229,731,755],[235,730,757],[328,732,756],[335,734,756],[342,734,756],[440,733,756],[446,734,757],[546,731,758],[552,731,758]]){
    rect(x,top,3,bottom-top,'metal',1,'edge',.8);path(`M${x+1} ${top+2}V${bottom-2}`,'barrelLight',.8,2);
  }
  rect(51,738,2,9,'rubber',1,null);

  target=layers.commander;feature='commander';
  // All cupola geometry now uses the same trace coordinates as its pivot (no offsets).
  ellipse(...C,43,42,'body',0,'edge',1.3);ellipse(...C,39,38,'roof',1,'light',1.1);
  path('M829 636Q856 624 878 646Q890 660 883 685Q868 713 842 707L828 676Z','seam',1.2,1);
  poly([[830,642],[838,641],[848,702],[841,703]],'shade',1);
  path('M834 641L844 702','metal',2,2);
  // TKN sight housing projects forward from the hatch, as on the reference.
  rect(796,652,29,27,'body',0);rect(796,653,6,25,'glass',1);rect(805,654,15,24,'deck',1);
  rect(825,661,24,12,'body',1);rect(849,660,7,14,'metal',2);
  for(const [x,y,a] of [[850,638,15],[858,689,-15],[834,690,-26]])localRect(x,y,-6,-2,12,5,a,'glass',2);
  ellipse(880,672,3,3,'edge',2);bolt(880,672);
  // NSVT mount is a separate optional fitting: absent in the source's top view.
  feature='mg-mount';
  poly([[822,636],[835,647],[831,653],[802,634],[800,625]],'metal',1,'edge',1.2);
  ellipse(...G,7,7,'shade',1,'edge',1);
  target=layers.mg;feature='mg';
  rect(786,624,47,12,'gun',1,'edge',1);rect(816,620,17,7,'shade',2);
  rect(771,627,15,6,'metal',1);rect(711,628,60,4,'gun',1,null);rect(706,626,7,8,'gun',1);
  for(const x of [718,725,732])rect(x,627,2,6,'metal',3,null);
  rect(796,637,28,19,'body',1,'edge',1);path('M802 641h17v11h-17','light',1,2);
  path('M830 629l13 -4v12','gun',2,2);path('M795 621h22','metal',1.5,2);
  Object.values(layers).forEach(Object.freeze);Object.freeze(layers);

  const finite=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
  const angle=v=>{const a=finite(v);return ((a+180)%360+360)%360-180;};
  function normalize(p={}){return {heading:angle(p.heading),turret:angle(p.turret),commander:angle(p.commander),mg:angle(p.mg),lod:Math.max(0,Math.min(3,Math.round(finite(p.lod,3)))),palette:Object.hasOwn(palettes,p.palette)?p.palette:'olive',axes:!!p.axes,mgMounted:p.mgMounted!==false};}
  function rotate(p,c,a){const r=a*Math.PI/180,dx=p[0]-c[0],dy=p[1]-c[1];return [c[0]+dx*Math.cos(r)-dy*Math.sin(r),c[1]+dx*Math.sin(r)+dy*Math.cos(r)];}
  function worldPoint(point,part='hull',pose={}){
    const p=normalize(pose);let q=[...point];
    if(part==='mg')q=rotate(q,G,p.mg);
    if(part==='commander'||part==='mg')q=rotate(q,C,p.commander);
    if(part!=='hull')q=rotate(q,T,p.turret);
    q=[(H[0]-q[0])*S,(H[1]-q[1])*S];return rotate(q,[0,0],p.heading);
  }
  function landmarks(p){return {turretPivot:worldPoint(T,'hull',p),commanderPivot:worldPoint(C,'turret',p),mgPivot:worldPoint(G,'commander',p),muzzle:worldPoint(MODEL.muzzlePx,'turret',p),sight:worldPoint([796,665],'commander',p),mgMuzzle:worldPoint([706,630],'mg',p)};}
  const sourceMatrix=`matrix(${-S} 0 0 ${-S} ${H[0]*S} ${H[1]*S})`;
  const turn=(a,c)=>`rotate(${a} ${c[0]} ${c[1]})`;
  function svgBody(pose={}){
    const p=normalize(pose),c=palettes[p.palette];
    const render=k=>{const content=layers[k].filter(x=>x.lod<=p.lod&&(p.mgMounted||(x.feature!=='mg'&&x.feature!=='mg-mount'))).map(x=>`<path d="${x.d}" fill="${c[x.fill]||'none'}" stroke="${c[x.stroke]||'none'}" stroke-width="${x.w}" stroke-linejoin="round" stroke-linecap="round" data-feature="${x.feature}"/>`).join('');return content;};
    const axis=(pt,color)=>`<g stroke="${color}" fill="none" stroke-width="1.4"><circle cx="${pt[0]}" cy="${pt[1]}" r="12"/><path d="M${pt[0]-18} ${pt[1]}h36M${pt[0]} ${pt[1]-18}v36"/></g>`;
    return `<g data-part="hull" transform="rotate(${p.heading})"><g transform="${sourceMatrix}">${render('hull')}<g data-part="turret" transform="${turn(p.turret,T)}">${render('turret')}<g data-part="commander" transform="${turn(p.commander,C)}">${render('commander')}<g data-part="mg" transform="${turn(p.mg,G)}">${render('mg')}</g>${p.axes?axis(G,'#e6b67e'):''}</g>${p.axes?axis(C,'#9ed4e0'):''}</g>${p.axes?axis(T,'#e3dfab'):''}</g></g>`;
  }
  function toSVG(p={}){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6.6 -6.6 13.2 13.2" width="1200" height="1200" role="img" aria-label="T-80U exterior top view"><title>T-80U exterior art study</title>${svgBody(p)}</svg>`;}
  const pathCache=new Map();
  function draw(ctx,pose={},options={}){
    const p=normalize(pose),c=palettes[p.palette],scale=Math.max(.01,finite(options.pixelsPerMetre,50)),silhouette=!!options.silhouette;
    const paint=k=>{ctx.save();for(const x of layers[k]){if(!silhouette&&x.lod>p.lod||(!p.mgMounted&&(x.feature==='mg'||x.feature==='mg-mount'))||silhouette&&!x.fill)continue;let d=pathCache.get(x);if(!d){d=new Path2D(x.d);pathCache.set(x,d);}if(x.fill){ctx.fillStyle=silhouette?'#000000':c[x.fill];ctx.fill(d);}if(x.stroke&&!silhouette){ctx.strokeStyle=c[x.stroke];ctx.lineWidth=x.w;ctx.stroke(d);}}ctx.restore();};
    const spin=(a,q)=>{ctx.translate(...q);ctx.rotate(a*Math.PI/180);ctx.translate(-q[0],-q[1]);};
    ctx.save();ctx.translate(finite(options.x),finite(options.y));ctx.scale(scale,scale);ctx.rotate(p.heading*Math.PI/180);ctx.transform(-S,0,0,-S,H[0]*S,H[1]*S);ctx.lineJoin='round';ctx.lineCap='round';
    paint('hull');spin(p.turret,T);paint('turret');spin(p.commander,C);paint('commander');spin(p.mg,G);paint('mg');ctx.restore();
  }
  return Object.freeze({MODEL,layers,normalize,worldPoint,landmarks,svgBody,toSVG,draw,sourceMatrix});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=T80UTopView;
if(typeof window!=='undefined')window.T80UTopView=T80UTopView;
