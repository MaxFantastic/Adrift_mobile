import {Camera} from './render/camera.js';
import {Scene} from './render/scene.js';
import {Drift} from './systems/resource.js';
import {placement,removal,refund,tileAt,candidates} from './systems/building.js';
import {initialState,record} from './core/state.js';
import {checkRain,consume,finishTask,navForJob,planTask,remainingTime,startTask} from './systems/survival.js';
import {paletteAt,timeOfDay} from './core/clock.js';
import {Engine} from './core/engine.js';
import {Saves,parseSave} from './core/save.js';
import {Updates} from './core/updates.js';
import {Chimes} from './core/audio.js';
import {Panels,el} from './ui/panels.js';
import {bindGestures} from './ui/touch.js';
import {icon} from './ui/icons.js';

const prefix='adrift:'+new URL('.',document.baseURI).pathname+':';
const glyphs={gather:'wave',hunt:'fish',bench:'bench',lighthouse:'lighthouse',bag:'bag',build:'build'};
for(const e of document.querySelectorAll('[data-icon]'))e.innerHTML=icon(e.dataset.icon);
function tips(text) {
  const e=el('toast');e.textContent=text;e.hidden=false;
  clearTimeout(tips.timer);tips.timer=setTimeout(()=>e.hidden=true,3400);
}
async function config(){
  const keys=['balance','items','buildings','version'];
  const definitions=await Promise.all(keys.map(async k=>{
    const r=await fetch(k==='version'?'./data/release.json':'./data/'+k+'.json');
    if(!r.ok)throw new Error('无法加载 '+k);return r.json();
  }));
  return Object.fromEntries(keys.map((k,i)=>[k,definitions[i]]));
}
class Game {
  constructor(cfg) {
    this.cfg=cfg;this.state=initialState(cfg);this.dayPalette=paletteAt(0,cfg.balance);this.playing=false;this.tool=null;
    this.prefs={muted:false,motion:null};
    try{const p=JSON.parse(localStorage.getItem(prefix+'settings'));if(p){this.prefs.muted=p.muted===true;this.prefs.motion=typeof p.motion==='boolean'?p.motion:null;}}catch{}
    this.reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
    this.audio=new Chimes();this.audio.muted=this.prefs.muted;
    this.saves=new Saves(cfg,prefix,tips);
    this.camera=new Camera(cfg.balance.zoomRange);
    this.scene=new Scene(el('sea'),this.camera,cfg);
    this.drift=new Drift(cfg);
    this.panels=new Panels(this);
    this.updates=new Updates(cfg.version.version,()=>this.persist(),()=>{
      if(this.panels.kind==='settings')this.panels.open('settings');
      else if(this.updates.waiting)tips('新版已准备好，可在设置中保存并更新');
    });
    this.lastDay='';this.observer=new ResizeObserver(()=>this.scene.resize());this.observer.observe(el('sea'));
  }
  motion(){return this.prefs.motion??!this.reduce.matches;}
  async init(){
    this.connect();this.setSoundIcon();
    const recovered=await this.saves.load();
    if(recovered)this.enter(recovered);
    else{el('start-label').textContent='开始漂流';el('start').disabled=false;}
    el('release').textContent='v'+this.cfg.version.version;
    this.engine=new Engine({frame:dt=>this.frame(dt),save:()=>this.persist(),interval:this.cfg.balance.autosaveSeconds});
    this.frame(0);
    this.engine.run();this.updates.init();
  }
  connect(){
    el('start').onclick=()=>{this.audio.unlock();this.audio.play('build');this.newGame();};
    el('settings').onclick=()=>{this.audio.unlock();this.panels.open('settings');};
    el('sound').onclick=()=>this.preference('sound');
    el('home').onclick=()=>this.camera.reset(this.state.raft.tiles);
    el('back').onclick=()=>this.cancel();
    el('confirm').onclick=()=>this.confirm();
    el('depart').onclick=()=>{
      this.audio.unlock();
      const task=this.state.survival.task;
      if(task) this.panels.open(navForJob[task.id]);
      else if(!this.startAction('gather')) this.panels.open('bag');
    };
    const syncAudio=()=>this.audio.setActive(!document.hidden);
    document.addEventListener('visibilitychange',syncAudio);
    window.addEventListener('pagehide',()=>this.audio.setActive(false));
    window.addEventListener('pageshow',syncAudio);
    for(const b of document.querySelectorAll('[data-panel]'))b.onclick=()=>{
      this.audio.unlock();this.audio.play('tap');this.panels.open(b.dataset.panel);
    };
    el('file').onchange=async e=>{
      const f=e.target.files[0];e.target.value='';if(!f)return;
      try{
        if(f.size>this.cfg.balance.maxImportBytes)throw new Error('存档文件过大');
        const incoming=parseSave(await f.text(),this.cfg);
        this.panels.ask('导入这份存档？','将恢复第 '+timeOfDay(incoming.clock.elapsedSeconds,this.cfg.balance).day+' 天的木筏，共 '+incoming.raft.tiles.length+' 块甲板。当前进度会被替换。','确认导入',()=>{
          this.enter(incoming);this.persist(true);tips('已恢复存档');
        });
      }catch(err){tips('导入失败 · '+(err instanceof SyntaxError?'JSON 格式无效':err.message));}
    };
    bindGestures(el('sea'),this.camera,this.cfg.balance.gestureThreshold,(x,y)=>this.tap(x,y),()=>this.playing&&!this.panels.kind);
  }
  setSoundIcon(){const b=el('sound');b.innerHTML=icon(this.prefs.muted?'mute':'sound');b.setAttribute('aria-label',this.prefs.muted?'开启声音':'关闭声音');}
  preference(which){
    if(which==='sound'){this.prefs.muted=!this.prefs.muted;this.audio.muted=this.prefs.muted;this.audio.unlock();this.audio.play('tap');this.setSoundIcon();}
    else this.prefs.motion=!this.motion();
    try{localStorage.setItem(prefix+'settings',JSON.stringify(this.prefs));}catch{tips('设置只在本次游玩中生效');}
  }
  enter(state) {
    this.state=state;this.playing=true;this.tool=null;this.lastDay='';this.lastTaskSecond=-1;
    this.panels.close();el('app').dataset.view='game';
    this.camera.reset(state.raft.tiles);this.scene.reset();this.drift.seed(this.camera);
    checkRain(this.state,this.cfg);this.hud();this.toolbar();
  }
  newGame(){
    const s=initialState(this.cfg);record(s,this.cfg,'抵达翡翠浅海，开始漂流');
    this.enter(s);this.persist(true);
  }
  persist(replace=false){return this.playing?this.saves.save(this.state,replace):Promise.resolve(true);}
  changed(){this.hud();this.toolbar();this.persist();}
  frame(dt){
    if(this.playing){
      this.state.clock.elapsedSeconds+=dt;
      const now=Date.now(),second=Math.floor(now/1000);
      if(second!==this.lastTaskSecond){
        this.lastTaskSecond=second;
        this.settle(now);
        const rain=checkRain(this.state,this.cfg);
        if(rain){this.changed();this.refreshSheet();tips(rain);}
        this.syncCountdown(now);
      }
      this.drift.update(dt,this.camera);
    }
    this.scene.render(dt,this.state,this.drift,!this.playing,this.motion(),this.tool);
    if(this.playing){
      const d=timeOfDay(this.state.clock.elapsedSeconds,this.cfg.balance);
      const rain=this.state.survival.rainUntil>this.state.clock.elapsedSeconds;
      const stamp=d.day+(rain?'阵雨':d.label);
      if(stamp!==this.lastDay){this.lastDay=stamp;el('day').innerHTML=icon(rain?'water':d.index===2?'moon':'sun',18)+'第 '+String(d.day).padStart(2,'0')+' 天 · '+(rain?'阵雨':d.label);}
    }
    return this.playing;
  }
  hud(){
    const resources=this.cfg.items.resources;
    for(const [id,v] of Object.entries(this.state.inventory)){
      let item=document.getElementById('res-'+id);
      if(!item){item=document.createElement('div');item.className='resource';item.id='res-'+id;item.innerHTML=icon(id)+'<span>'+resources[id]+'</span><b></b>';el('hud').append(item);}
      item.querySelector('b').textContent=String(v).padStart(2,'0');
    }
    const s=this.state.survival;
    for(const id of ['water','food'])el('supply-'+id).textContent=s[id];
    for(const id of ['energy','hydration']){
      el(id).max=this.cfg.balance.survival.maxVital;
      el(id).value=s[id];
      el(id+'-value').textContent=s[id];
    }
    el('raft-level').textContent='Lv.'+s.raftLevel;
    this.syncCountdown();
  }
  syncCountdown(now=Date.now()) {
    const s=this.state.survival,t=s.task;
    const job=t?planTask(this.state,this.cfg,t.id,t.target,true):planTask(this.state,this.cfg,'gather');
    const panel=t?navForJob[t.id]:'gather';
    if(el('voyage-icon').dataset.panel!==panel){
      el('voyage-icon').dataset.panel=panel;
      el('voyage-icon').innerHTML=icon(glyphs[panel],23);
    }
    el('voyage').classList.toggle('busy',!!t);
    el('voyage-title').textContent=job.label;
    const progress=el('voyage-progress');
    progress.hidden=!t;
    const note=el('voyage-note');
    if(t){
      const left=remainingTime((t.endsAt-now)/1000);
      note.textContent='剩余 '+left+' · 完成后自动入账';
      progress.value=Math.max(0,Math.min(1,(now-t.startedAt)/(t.endsAt-t.startedAt)));
      const timer=document.querySelector('.drawer-timer');
      if(timer)timer.textContent=' · '+job.label+' · '+left;
    }else note.textContent=job.reason||job.minutes+' 分钟 · 体力 −'+job.energy+' / 水分 −'+job.hydration;
    el('depart').textContent=t?'查看':job.reason?'去补给':'开始';
  }
  refreshSheet(){
    const kind=this.panels.kind;
    if(kind&&kind!=='confirm'&&kind!=='detail'&&kind!=='settings')this.panels.open(kind);
  }
  settle(now){
    const result=finishTask(this.state,this.cfg,now);
    if(!result)return;
    if(result.target)this.scene.built(result.target.item,result.target.x,result.target.y);
    this.audio.play(result.target?'build':'collect');
    this.changed();this.refreshSheet();tips(result.text);
  }
  startAction(id,target=null){
    const now=Date.now();
    this.settle(now);
    const result=startTask(this.state,this.cfg,id,target,now);
    if(!result.ok){tips(result.reason);return false;}
    this.panels.close();this.tool=null;
    this.audio.play('tap');this.changed();
    return true;
  }
  useSupply(id){
    const result=consume(this.state,this.cfg,id);
    if(result.ok){this.changed();this.refreshSheet();}
    tips(result.ok?result.text:result.reason);
  }
  selectTool(id){this.tool={id,cells:[],selected:null,reason:''};this.toolbar();}
  cancel(){if(this.tool?.selected)this.tool.selected=null;else this.tool=null;this.toolbar();}
  toolbar() {
    el('nav').hidden=!!this.tool;el('tool').hidden=!this.tool;
    el('voyage').hidden=!!this.tool;el('raft-controls').hidden=!!this.tool;
    if(!this.tool)return;
    const t=this.tool,s=t.selected,id=t.id;
    t.cells=id==='remove'?this.state.raft.tiles.filter(v=>!removal(this.state,v.x,v.y,v.buildingId?'facility':'deck')):candidates(this.state,this.cfg,id);
    t.reason=s?(id==='remove'?removal(this.state,s.x,s.y,s.layer):placement(this.state,this.cfg,id,s.x,s.y)):'';
    const title=id==='remove'?'拆除':this.cfg.buildings[id].name;
    el('tool-title').textContent=s&&id==='remove'?'拆除'+this.cfg.buildings[s.target||'deck'].name:title;
    const desc=id==='remove'?'选择设施或可拆甲板':id==='deck'?'轻触相邻的高亮格':'轻触空甲板预览';
    if(!t.reason&&this.state.survival.task)t.reason='当前行动完成后即可施工';
    let hint=t.reason||(!s?desc:id==='remove'?'拆除耗时 15 分钟，返还一半材料':'位置可建 · 施工耗时 15 分钟');
    if(!s&&id!=='remove'){
      const v=t.cells[0];if(v){const reason=placement(this.state,this.cfg,id,v.x,v.y);if(reason)hint=reason;}
      else hint=id==='deck'?'已到达扩建上限':'需要先扩建一块空甲板';
    }
    el('tool-note').textContent=hint;el('tool-note').classList.toggle('invalid',!!t.reason);
    el('confirm').textContent=id==='remove'?'拆除':'确认';el('confirm').disabled=!s||!!t.reason;
  }
  tap(x,y) {
    this.audio.unlock();
    const hit=this.scene.hit(x,y);
    if(this.tool){
      let pos=this.camera.tile(x,y);
      if(this.tool.id==='remove'&&hit?.tile)pos={x:hit.tile.x,y:hit.tile.y};
      const t=tileAt(this.state.raft.tiles,pos.x,pos.y);
      this.tool.selected={...pos,layer:t?.buildingId?'facility':'deck',target:t?.buildingId||'deck'};this.toolbar();return;
    }
    if(hit?.tile?.buildingId)this.panels.inspect(hit.tile);
  }
  confirm(){
    const t=this.tool,s=t?.selected;if(!s||t.reason)return;
    if(t.id==='remove'){
      const result=refund(this.cfg.buildings[s.target].cost,this.cfg.balance.refundRate);
      const label=Object.entries(result).filter(([,v])=>v).map(([k,v])=>this.cfg.items.resources[k]+' '+v).join('、');
      this.panels.ask('拆除'+this.cfg.buildings[s.target].name+'？','15 分钟后返还材料 '+label+'。','确认拆除',
        ()=>this.startAction('demolish',{x:s.x,y:s.y,layer:s.layer}));
    }else{
      this.startAction('build',{item:t.id,x:s.x,y:s.y});
    }
  }
  exportSave(){
    const json=JSON.stringify(this.saves.snapshot(this.state),null,2);
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
    a.href=url;a.download='ADRIFT-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
}
try { const game=new Game(await config());await game.init(); }
catch(err){console.error(err);el('start-label').textContent='重新加载';el('start').disabled=false;el('start').onclick=()=>location.reload();tips('启动失败，请通过 HTTP 打开并检查本地文件');}

