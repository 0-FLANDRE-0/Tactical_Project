'use strict';
// Offline build. Source photographs stay in the review HTML, never in the vector asset.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),A=require('../src/art/t80u-topview.js');
const read=f=>fs.readFileSync(path.join(root,f));
let html=read('src/art/t80u-lab.html').toString();
for(const [key,value] of Object.entries({__MODEL__:read('src/art/t80u-topview.js').toString(),__PLAN__:'data:image/jpeg;base64,'+read('data/vehicles/references/t80u/plan.jpg').toString('base64'),__PHOTO__:'data:image/jpeg;base64,'+read('data/vehicles/references/t80u/roof-photo.jpg').toString('base64')}))html=html.replace(key,()=>value);
fs.mkdirSync(path.join(root,'dist/qa'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/qa/T80U_TopView.html'),html);
fs.writeFileSync(path.join(root,'data/vehicles/T80U_top_view.svg'),A.toSVG({heading:-90}));
let comparison=read('src/art/t80u-reference-check.html').toString().replace('__MODEL__',()=>read('src/art/t80u-topview.js').toString()).replace('__PLAN__',()=> 'data:image/jpeg;base64,'+read('data/vehicles/references/t80u/plan.jpg').toString('base64'));
fs.writeFileSync(path.join(root,'dist/qa/T80U_ReferenceCheck.html'),comparison);
// Deterministic ZIP; opens directly after extraction, no server or network required.
cp.execFileSync('python',['-c',`import zipfile,pathlib
r=pathlib.Path(${JSON.stringify(root)})
info=zipfile.ZipInfo('T80U_TopView.html',(2026,11,14,0,0,0))
info.compress_type=zipfile.ZIP_DEFLATED
info.external_attr=0o644 << 16
with zipfile.ZipFile(r/'T80U_TopView.zip','w') as z:
 z.writestr(info,(r/'dist/qa/T80U_TopView.html').read_bytes())
 review=zipfile.ZipInfo('T80U_ReferenceCheck.html',(2026,11,14,0,0,0))
 review.compress_type=zipfile.ZIP_DEFLATED
 review.external_attr=0o644 << 16
 z.writestr(review,(r/'dist/qa/T80U_ReferenceCheck.html').read_bytes())
`]);
console.log('Built dist/qa/T80U_TopView.html, data/vehicles/T80U_top_view.svg and T80U_TopView.zip');
