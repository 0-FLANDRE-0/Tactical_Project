/* Game adapter for the corrected drawing-space T80UTopView source.
 * Game headings are absolute world-frame radians. The source accepts degrees
 * relative to each parent, so conversion is kept in this single boundary. */
'use strict';
const T80UArt=(()=>{
  const Source=typeof T80UTopView!=='undefined'?T80UTopView:require('./art/t80u-topview.js');
  const degrees=v=>v*180/Math.PI;
  const relative=(a,b)=>degrees(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
  function sourcePose(u,zoom=1){
    return{heading:degrees(u.heading),turret:relative(u.turret,u.heading),commander:relative(u.commander??u.turret,u.turret),mg:0,
      lod:zoom<1?0:zoom<2?1:zoom<5?2:3,palette:u.team==='red'?'sand':'olive',mgMounted:false};
  }
  function draw(ctx,u,zoom,model,{silhouette=false}={}){
    Source.draw(ctx,sourcePose(u,zoom),{pixelsPerMetre:zoom,silhouette});
  }
  function landmarks(u){return Source.landmarks(sourcePose(u,8));}
  return Object.freeze({draw,landmarks,sourcePose,MODEL:Source.MODEL});
})();
if(typeof module!=='undefined')module.exports=T80UArt;
