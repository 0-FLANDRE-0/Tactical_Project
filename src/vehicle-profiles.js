'use strict';
/* Public M1A2 baseline. Metres / seconds / kg. No SEP v2/v3 armour assumptions.
 * Values labelled estimate or tuning in data/vehicles/M1A2.json are deliberate
 * modelling choices, not measured or manufacturer-certified specifications. */
const VEHICLE_PROFILES=(()=>{
  const mph=v=>v*.44704,inch=v=>v*.0254;
  const M1A2={
    id:'M1A2',name:'M1A2 Abrams',variant:'M1A2 기본형',crew:4,
    massKg:69.54*907.18474,engineHp:1500,
    model:{hullLength:inch(312),width:inch(144),overallLength:inch(387),roofHeight:inch(93.5),groundClearance:inch(19),barrelTip:inch(387)-inch(312)/2,turretLength:4.75,turretWidth:3.28,turretCenter:.15},
    mobility:{roadSpeed:mph(42),crossCountrySpeed:mph(30),reverseSpeed:mph(25),accelerationReferenceSpeed:mph(20),accelerationReferenceSeconds:7.2,brakeDeceleration:3,maxLongitudinalGrade:.60,maxSideGrade:.40,pivotRate:Math.PI/6,turretRate:40*Math.PI/180,
      gradeSpeedPoints:[[0,mph(42)],[.10,mph(17)],[.60,mph(4.1)]],
      surfaceSpeed:{forest:6.5,scrub:8,stream:6/3.6}},
    sensors:{name:'CITV',eyeHeight:2.65,observationLimit:4000,targetReferenceHeight:1.5},
    weapons:{mainGun:{name:'M256',calibreMm:120,ammunitionCapacity:42,referenceEngagementRange:3000,enabled:false},coax:{name:'M240',calibreMm:7.62},commander:{name:'M2',calibreMm:12.7}},
    exposure:{hullAlong:[-2.8,0,2.8],hullHeights:[.80,1.40],turretAlong:[-1,0,1],turretHeight:2.20},
    navigation:{clearanceMargin:.25,contract:'nav16-M1A2-r4.62-long0.60-side0.40-v2'}
  };
  M1A2.navigation.radius=Math.ceil((Math.hypot(M1A2.model.hullLength/2,M1A2.model.width/2)+M1A2.navigation.clearanceMargin)*100)/100;
  function freeze(o){for(const v of Object.values(o))if(v&&typeof v==='object')freeze(v);return Object.freeze(o);}
  return freeze({M1A2});
})();
if(typeof module!=='undefined')module.exports=VEHICLE_PROFILES;
