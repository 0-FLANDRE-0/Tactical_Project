const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');

test('standalone optimized LOS comparison loads the current map contract without ambient globals',()=>{
 const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'tactical-wip17-los-worker-')),output=path.join(dir,'los.json');
 try{
  const result=spawnSync(process.execPath,['scripts/benchmark_los_shared_compare.cjs','--worker','optimized',output],{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  assert.equal(result.status,0,result.stderr||result.stdout);const report=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.equal(report.variant,'optimized');assert.equal(report.cases.length,4);assert.deepEqual(report.summary,{tileMetres:32,tiles:15625,summaryBytes:265625});assert(report.diagnostics);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
