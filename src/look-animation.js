'use strict';
/* WIP07: presentation adapter only. No private clock, commands, or pose sway.
 * Reduced motion never changes simulated directions or observation quality. */
const TacticalLookAnimation=(()=>{
  function create(){return Object.freeze({view:u=>Object.freeze({turret:u.turret,gaze:u.commander??u.turret}),setReducedMotion(){}});}
  return Object.freeze({create});
})();
if(typeof module!=='undefined')module.exports=TacticalLookAnimation;
