'use strict';
/* Shared 2D game-art coordinates, metres and world-frame radians. No ballistics. */
const TacticalVehicleGeometry=(()=>{
  function turretFrame(model,pivot=model.turretPivot){
    const origin=model.turretOrigin??.15;
    return{origin,pivot:pivot??[model.turretCenter??.66,0]};
  }
  function turretPointWorld(u,model,point){
    const {origin,pivot:[px,py]}=turretFrame(model),h=u.heading,t=u.turret;
    const dx=point[0]+origin-px,dy=point[1]-py;
    return{x:u.x+Math.cos(h)*px-Math.sin(h)*py+Math.cos(t)*dx-Math.sin(t)*dy,
      y:u.y+Math.sin(h)*px+Math.cos(h)*py+Math.sin(t)*dx+Math.cos(t)*dy};
  }
  function muzzleWorld(u,model){
    const {origin}=turretFrame(model);
    return turretPointWorld(u,model,model.muzzleLocal??[model.barrelTip-origin,0]);
  }
  return Object.freeze({turretFrame,turretPointWorld,muzzleWorld});
})();
if(typeof module!=='undefined')module.exports=TacticalVehicleGeometry;
