'use strict';
/* Keep longer M1A2 observation sweeps off the input/render thread. The worker
 * lives inside the offline HTML and decodes its own copy of the frozen map. */
class TacticalVisibilityClient {
  constructor(C,V,source,platform={Worker:globalThis.Worker,Blob:globalThis.Blob,URL:globalThis.URL}){
    this.C=C;this.V=V;this.seq=0;this.pending=null;this.worker=null;this.platform=platform;
    if(!platform.Worker)return;
    try{
      const workerCode=source()+`\nself.onmessage=e=>{const {id,observer,options}=e.data;try{self.postMessage({id,result:TacticalVisibility.compute(TacticalCore,observer,options)});}catch(error){self.postMessage({id,error:String(error)});}};self.postMessage({ready:true});`;
      this.url=platform.URL.createObjectURL(new platform.Blob([workerCode],{type:'text/javascript'}));
      this.worker=new platform.Worker(this.url);
      this.worker.onmessage=e=>{
        if(e.data.ready){this.releaseURL();return;}
        const p=this.pending;if(!p||p.id!==e.data.id)return;
        if(e.data.error){this.fallback();return;}
        this.pending=null;p.resolve(e.data.result);
      };
      this.worker.onerror=()=>this.fallback();
    }catch{this.fallback();}
  }
  releaseURL(){if(this.url){this.platform.URL.revokeObjectURL(this.url);this.url=null;}}
  cancel(){if(this.pending){this.pending.resolve(null);this.pending=null;}}
  fallback(){
    this.worker?.terminate();this.worker=null;this.releaseURL();
    const p=this.pending;if(!p)return;this.pending=null;
    try{p.resolve(this.V.compute(this.C,p.observer,p.options));}catch(error){p.reject(error);}
  }
  request(observer,options={}){
    this.cancel();
    return new Promise((resolve,reject)=>{
      this.pending={id:++this.seq,observer:{...observer},options,resolve,reject};
      if(this.worker){try{this.worker.postMessage({id:this.seq,observer:{...observer},options});}catch{this.fallback();}}
      else this.fallback();
    });
  }
}
if(typeof module!=='undefined')module.exports=TacticalVisibilityClient;
