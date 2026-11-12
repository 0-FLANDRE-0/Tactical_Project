'use strict';
/* Allocation-free dimensional validation shared by the page, Worker and Node. */
const TacticalMapSpec=(()=>{
  const VERSION=1;
  const LIMITS=Object.freeze({maxWidth:8000,maxHeight:8000,maxHeightCells:16000000,maxSurfaceCells:4000000,maxNavigationCells:250000});
  const integer=(value,name)=>{if(!Number.isSafeInteger(value)||value<=0)throw Error(name+' must be a positive safe integer');return value;};
  const finite=(value,name)=>{if(!Number.isFinite(value))throw Error(name+' must be finite');return value;};
  const base64Length=bytes=>Math.ceil(bytes/3)*4;
  function encoded(value,name,minBytes,maxBytes=minBytes){if(typeof value!=='string'||value.length<base64Length(minBytes)||value.length>base64Length(maxBytes)||value.length%4)throw Error(name+' encoded length is invalid');}
  function product(a,b,name,limit){const value=a*b;if(!Number.isSafeInteger(value)||value>limit)throw Error(name+' is too large');return value;}
  function grid(layer,worldWidth,worldHeight,spacing,name,limit){
    if(!layer||typeof layer!=='object')throw Error(name+' metadata is missing');
    if(layer.spacing!==spacing)throw Error(name+' spacing must be '+spacing+'m');
    if(worldWidth%spacing||worldHeight%spacing)throw Error('map dimensions must be divisible by '+spacing+'m');
    const columns=integer(layer.columns,name+'.columns'),rows=integer(layer.rows,name+'.rows');
    if(columns!==worldWidth/spacing||rows!==worldHeight/spacing)throw Error(name+' dimensions do not match the map');
    return Object.freeze({columns,rows,spacing,cells:product(columns,rows,name+' cells',limit)});
  }
  function validate(map,options={}){
    if(!map||typeof map!=='object'||!map.meta)throw Error('map metadata is missing');
    const width=integer(map.meta.width,'map width'),height=integer(map.meta.height,'map height');
    if(width>LIMITS.maxWidth||height>LIMITS.maxHeight)throw Error('map dimensions exceed the WIP17 limit');
    if(width%16||height%16)throw Error('map dimensions must be divisible by the 16m navigation grid');
    if(typeof map.meta.id!=='string'||!map.meta.id.trim())throw Error('map id is missing');
    if(typeof map.meta.mapHash!=='string'||!map.meta.mapHash.trim())throw Error('map source hash is missing');
    const heightmap=grid(map.heightmap,width,height,2,'heightmap',LIMITS.maxHeightCells);
    if(map.heightmap.sampleOrigin!==1)throw Error('heightmap sample origin must be 1m');
    if(map.heightmap.encoding!=='row-delta-zigzag-varint-base64')throw Error('unsupported heightmap encoding');
    finite(map.heightmap.scale,'heightmap scale');if(map.heightmap.scale<=0)throw Error('heightmap scale must be positive');
    encoded(map.heightmap.data,'heightmap',heightmap.cells,heightmap.cells*5);
    const terrain=grid(map.terrain,width,height,4,'terrain',LIMITS.maxSurfaceCells);
    encoded(map.terrain.data,'terrain',terrain.cells);
    if(!map.features||typeof map.features!=='object')throw Error('map features are missing');
    for(const key of ['roads','forests','fields','water','waterways','trees','labels','buildings'])if(!Array.isArray(map.features[key]))throw Error('map feature '+key+' is missing');
    const navigation=Object.freeze({columns:width/16,rows:height/16,spacing:16,cells:product(width/16,height/16,'navigation cells',LIMITS.maxNavigationCells)});
    if(map.navigation){
      const n=map.navigation;
      if(n.sourceHash!==map.meta.mapHash)throw Error('navigation source hash does not match the map');
      if(n.cols!==navigation.columns||n.rows!==navigation.rows)throw Error('navigation dimensions do not match the map');
      if(options.navigationContract&&n.contract!==options.navigationContract)throw Error('navigation contract does not match the vehicle profile');
      encoded(n.costs,'navigation costs',navigation.cells*4);encoded(n.edges,'navigation edges',navigation.cells);
    }else if(options.requireNavigation)throw Error('navigation cache is required');
    return Object.freeze({version:VERSION,id:map.meta.id,hash:map.meta.mapHash,width,height,heightmap,terrain,navigation});
  }
  function signature(spec){return Object.freeze({version:VERSION,width:spec.width,height:spec.height,heightColumns:spec.heightmap.columns,heightRows:spec.heightmap.rows,heightSpacing:spec.heightmap.spacing,surfaceColumns:spec.terrain.columns,surfaceRows:spec.terrain.rows,surfaceSpacing:spec.terrain.spacing,navigationColumns:spec.navigation.columns,navigationRows:spec.navigation.rows,navigationSpacing:spec.navigation.spacing});}
  function sameSignature(value,spec){const expected=signature(spec);return !!value&&Object.keys(expected).every(key=>value[key]===expected[key]);}
  function validateDerived(spec,data,kind,{optional=false}={}){
    if(data==null){if(optional)return false;throw Error(kind+' data is missing');}
    if(data.sourceMapHash!==spec.hash)throw Error(kind+' source hash does not match the map');
    if(!sameSignature(data.mapSpec,spec))throw Error(kind+' dimensions do not match the map');
    return true;
  }
  return{VERSION,LIMITS,validate,signature,sameSignature,validateDerived};
})();
if(typeof globalThis!=='undefined'&&!globalThis.TacticalMapSpec)globalThis.TacticalMapSpec=TacticalMapSpec;
if(typeof module!=='undefined')module.exports=TacticalMapSpec;
