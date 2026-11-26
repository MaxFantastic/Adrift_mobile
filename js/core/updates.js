export class Updates {
  constructor(version,save,onChange) {
    this.version=version;this.save=save;this.changed=onChange;this.registration=null;this.waiting=false;
    this.message='正在准备离线资源';this.reloading=false;
  }
  status(text){this.message=text;this.changed();}
  async init() {
    if(!('serviceWorker' in navigator)){this.status('当前环境不支持离线缓存');return;}
    try{
      navigator.serviceWorker.addEventListener('controllerchange',()=>{if(this.reloading)location.reload();});
      this.registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
      const inspect=()=>{
        if(this.registration.waiting&&navigator.serviceWorker.controller){this.waiting=true;this.status('新版本已准备好，可保存并更新');}
      };
      const watch=w=>{
        if(!w)return;
        w.addEventListener('statechange',()=>{
          if(w.state==='installed')setTimeout(inspect,0);
          if(w.state==='redundant'&&!this.waiting)this.status('离线资源下载未完成，可重新检查');
        });
      };
      this.registration.addEventListener('updatefound',()=>watch(this.registration.installing));
      watch(this.registration.installing);inspect();
      navigator.serviceWorker.ready.then(()=>{if(!this.waiting)this.status('离线资源已就绪');});
    }catch{this.status('离线缓存未就绪，网页仍可游玩');}
  }
  async check() {
    if(navigator.onLine===false){this.status('无法联网检查更新');return;}
    let remote;
    try{
      const r=await fetch('./version.json',{cache:'no-store'});
      if(!r.ok)throw new Error();remote=(await r.json()).version;
      if(!/^\d+\.\d+\.\d+$/.test(remote))throw new Error();
    }catch{this.status('无法联网检查更新');return;}
    if(!this.registration){this.status(remote===this.version?'当前已是最新版本':'检测到新版，联网重新打开可更新');return;}
    try{
      await this.registration.update();
      if(this.registration.waiting){this.waiting=true;this.status('新版本已准备好，可保存并更新');}
      else this.status(remote===this.version?'当前已是最新版本':'新版资源正在准备，完成后可更新');
    }catch{this.status('更新检查未完成，可稍后重试');}
  }
  async activate(){
    const worker=this.registration?.waiting;if(!worker || this.reloading)return;
    if(!await this.save()){this.status('请先导出备份，存档成功后再更新');return;}
    const channel=new MessageChannel();
    this.reloading=true;
    channel.port1.onmessage=e=>{
      channel.port1.close();
      if(!e.data.ok){this.reloading=false;this.status('请关闭本游戏的其他标签页，再保存并更新');}
    };
    worker.postMessage({type:'activate'},[channel.port2]);
  }
}
