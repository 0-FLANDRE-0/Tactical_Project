/* CPU fixture, not whole-game FPS. Kept identical across isolated comparisons. */
const fs=require('fs'),os=require('os'),C=require('../tests/load.cjs')(),{run}=require('./observation-benchmark-fixture.cjs');
const cases=run(C),result={version:'0.4-WIP10',date:'2026-11-07',node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,mapHash:C.MAP.meta.mapHash,seed:407,
 fixture:'legalNear grid x=200+(i%10)*360,y=300+floor(i/10)*320; heading=(i%8)*pi/4; alternating teams; both teams sense',
 trajectory:'phase=hash(i,407)*2pi; x=origin.x+12*(sin(t*0.4+phase)-sin(phase)); y=origin.y+8*(cos(t*0.3+phase)-cos(phase)); static passability checked; blocked endpoint stays; generation excluded from timing',
 warmupSteps:20,stepSeconds:.05,queryHz:10,summary:C.losAccelerationInfo(),notes:'100 timed fixed steps after 20 warmup. Includes idle mobility, actual slew, spatial filters, exact LOS, bounded ray reuse, observation rules and team merge. CPU step time, not whole-game FPS. No tactical AI/pathfinding benchmark.',cases};
fs.writeFileSync('tests/releases/WIP10-benchmark.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,cases:cases.map(({origins,...c})=>c)},null,2));
