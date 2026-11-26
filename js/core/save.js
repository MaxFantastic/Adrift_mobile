import {connected,foundation,key} from '../systems/building.js';

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const natural = n => Number.isSafeInteger(n) && n >= 0;
const clone = v => JSON.parse(JSON.stringify(v));
const migrations = new Map(); // schema 1 is the first published format.
function requireValue(condition,message) { if (!condition) throw new Error(message); }
export function validate(input,cfg) {
  requireValue(object(input),'存档应为 JSON 对象');
  let s=input;
  while (migrations.has(s.schemaVersion)) s=migrations.get(s.schemaVersion)(s);
  requireValue(s.schemaVersion===cfg.version.schemaVersion,'无法读取这个存档结构版本');
  requireValue(typeof s.gameVersion==='string' && /^\d+\.\d+\.\d+$/.test(s.gameVersion),'游戏版本字段无效');
  requireValue(typeof s.savedAt==='string' && Number.isFinite(Date.parse(s.savedAt)),'保存时间无效');
  const elapsed=s.clock?.elapsedSeconds;
  requireValue(Number.isFinite(elapsed) && elapsed>=0 && elapsed<Number.MAX_SAFE_INTEGER,'游戏时间无效');
  const resources=Object.keys(cfg.items.resources);
  requireValue(object(s.inventory) && Object.keys(s.inventory).length===resources.length &&
    resources.every(k=>natural(s.inventory[k]) && s.inventory[k] < Number.MAX_SAFE_INTEGER-1000),'库存无效');
  const tiles=s.raft?.tiles;
  requireValue(Array.isArray(tiles)&&tiles.length>=4&&tiles.length<=cfg.balance.maxTiles,'甲板数量无效');
  const seen=new Set();
  const cleaned=tiles.map(t=>{
    requireValue(object(t)&&[t.x,t.y].every(n=>Number.isInteger(n)&&Math.abs(n)<=cfg.balance.coordinateLimit),'甲板坐标无效');
    const k=key(t.x,t.y);
    requireValue(!seen.has(k),'甲板坐标重复');seen.add(k);
    requireValue(t.foundation===foundation(t.x,t.y),'初始甲板标记无效');
    requireValue(t.buildingId===null || (typeof t.buildingId==='string' && t.buildingId!=='deck' && Object.hasOwn(cfg.buildings,t.buildingId)),'设施类型无效');
    return {x:t.x,y:t.y,foundation:t.foundation,buildingId:t.buildingId};
  });
  requireValue(cleaned.filter(t=>t.foundation).length===4&&connected(cleaned),'木筏不完整或不连通');
  const step=s.tutorial?.step;
  requireValue(natural(step)&&step<=3&&s.tutorial.completed===(step===3),'引导进度无效');
  requireValue(Array.isArray(s.log)&&s.log.length<=cfg.balance.maxLog&&s.log.every(l=>object(l)&&natural(l.time)&&l.time<=elapsed&&typeof l.text==='string'&&l.text.length<=220),'日志记录无效');
  return {schemaVersion:s.schemaVersion,gameVersion:cfg.version.version,savedAt:s.savedAt,clock:{elapsedSeconds:elapsed},
    inventory:Object.fromEntries(resources.map(k=>[k,s.inventory[k]])),raft:{tiles:cleaned},tutorial:{step,completed:step===3},
    log:s.log.map(({time,text})=>({time,text}))};
}

export function parseSave(raw,cfg) {
  requireValue(typeof raw==='string' && new Blob([raw]).size<=cfg.balance.maxImportBytes,'存档文件过大');
  return validate(JSON.parse(raw),cfg);
}

function requestResult(req) {
  return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
}
function transactionDone(tx) {
  return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}
function openDatabase(name) {
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(name,1);
    let expired=false;
    const timeout=setTimeout(()=>{expired=true;reject(new Error('数据库没有响应'));},1600);
    req.onupgradeneeded=()=>req.result.createObjectStore('game');
    req.onsuccess=()=>{clearTimeout(timeout);if(expired){req.result.close();return;}req.result.onversionchange=()=>req.result.close();resolve(req.result);};
    req.onerror=()=>{clearTimeout(timeout);reject(req.error);};
  });
}
export class Saves {
  constructor(cfg,prefix,onWarning) {
    this.cfg=cfg;this.prefix=prefix;this.warn=onWarning;this.db=null;
    this.queue=Promise.resolve();this.mode='尚未保存';this.stamp=0;this.knownTime=0;
  }
  localRead() {
    const raw=localStorage.getItem(this.prefix+'slots');
    return raw ? JSON.parse(raw) : {};
  }
  async load() {
    const candidates=[]; let invalid=false, localOK=false;
    const inspect=slots=>{
      for(const k of ['current','backup']){
        if(slots?.[k])try{candidates.push(validate(slots[k],this.cfg));}catch{invalid=true;}
      }
    };
    try {
      this.db=await openDatabase(this.prefix+'saves');
      inspect(await requestResult(this.db.transaction('game').objectStore('game').get('slots')));
    } catch {this.db=null;}
    try {inspect(this.localRead());localOK=true;}catch{invalid=true;}
    candidates.sort((a,b)=>Date.parse(b.savedAt)-Date.parse(a.savedAt));
    this.stamp=candidates.length?Date.parse(candidates[0].savedAt):0;
    this.knownTime=this.stamp;
    this.mode=this.db?'IndexedDB':localOK?'LocalStorage':'不可用';
    if(!this.db&&!localOK)this.warn('本地存储不可用，请在设置中导出备份');
    else if (invalid) this.warn(candidates.length?'检测到损坏记录，已读取有效存档':'未能读取本地存档，可在设置中导入备份');
    else if(!this.db)this.warn(localOK?'已启用本地轻量存档':'本地存储不可用，请导出备份');
    return candidates[0]||null;
  }
  snapshot(state) {
    this.stamp=Math.max(Date.now(),this.stamp+1);
    const copy=clone(state);copy.savedAt=new Date(this.stamp).toISOString();return copy;
  }
  save(state,replace=false) {
    const snapshot=this.snapshot(state);
    this.queue=this.queue.catch(()=>{}).then(()=>this.write(snapshot,replace));
    return this.queue;
  }
  slots(snapshot,old,replace) {
    let backup=null;
    if(!replace)for(const k of ['current','backup']){
      if(old?.[k])try {backup=validate(old[k],this.cfg);break;}catch{}
    }
    return {current:snapshot,backup};
  }
  newerRecord(slots,replace){
    if(replace||!slots?.current||Date.parse(slots.current.savedAt)<=this.knownTime)return false;
    try{validate(slots.current,this.cfg);return true;}catch{return false;}
  }
  conflict(){
    this.mode='其他标签页已保存';
    this.warn('另一页已保存较新进度。可导出本页，或刷新读取最新存档。');
    return false;
  }
  async write(snapshot,replace) {
    if(this.db)try{
      const tx=this.db.transaction('game','readwrite'), store=tx.objectStore('game');
      const done=transactionDone(tx), get=store.get('slots');
      let conflict=false;
      get.onsuccess=()=>{
        conflict=this.newerRecord(get.result,replace);
        if(!conflict)store.put(this.slots(snapshot,get.result,replace),'slots');
      };
      await done;
      if(conflict)return this.conflict();
      this.knownTime=Date.parse(snapshot.savedAt);this.mode='IndexedDB';
      if(replace)try{localStorage.removeItem(this.prefix+'slots');}catch{}
      return true;
    }catch{this.db=null;this.warn('数据库暂不可用，正在使用轻量存档');}
    try{
      let old;try{old=this.localRead();}catch{}
      if(this.newerRecord(old,replace))return this.conflict();
      localStorage.setItem(this.prefix+'slots',JSON.stringify(this.slots(snapshot,old,replace)));
      this.knownTime=Date.parse(snapshot.savedAt);this.mode='LocalStorage';return true;
    }catch{this.mode='保存失败';this.warn('保存失败，请在设置中导出 JSON 备份');return false;}
  }
}
