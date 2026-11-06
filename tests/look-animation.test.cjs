const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../src/look-animation.js');
test('presentation reports actual turret and independent commander',()=>{const u={heading:1,turret:.3,commander:-.8};assert.deepEqual(create().view(u),{turret:.3,gaze:-.8});});
test('reduced motion cannot alter simulation directions',()=>{const u=Object.freeze({turret:1,commander:2}),a=create(),before=a.view(u);a.setReducedMotion(true);assert.deepEqual(a.view(u),before);a.setReducedMotion(false);assert.deepEqual(a.view(u),before);});
test('render reads have no private timer or commands and do not change state',()=>{const u=Object.freeze({turret:.4,commander:1}),a=create();for(let i=0;i<100;i++)assert.deepEqual(a.view(u),{turret:.4,gaze:1});assert.equal(a.advance,undefined);assert.equal(a.focus,undefined);});
