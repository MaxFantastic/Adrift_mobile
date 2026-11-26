import {icon} from './icons.js';
import {thumbnail} from '../render/sprites.js';
import {timeOfDay} from '../core/clock.js';
import {planTask} from '../systems/survival.js';
export const el=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(action,text,cls='plain')=>'<button class="'+cls+'" data-do="'+action+'">'+text+'</button>';
const art=id=>'<canvas aria-hidden="true" data-art="'+id+'"></canvas>';
export function costLabel(cost,cfg,inventory) {
  return '<span class="cost">'+Object.entries(cost).map(([k,n])=>'<span aria-label="'+cfg.items.resources[k]+n+'" class="'+(inventory[k]<n?'short':'')+'">'+icon(k,15)+n+'</span>').join('')+'</span>';
}
const actionCard = (state,cfg,id,artName,description) => {
  const plan = planTask(state,cfg,id);
  const costs = [
    plan.energy && '体力 '+plan.energy,
    plan.hydration && '水分 '+plan.hydration,
    plan.waterCost && '淡水 '+plan.waterCost+' 份'
  ].filter(Boolean);
  const tally = costs.length ? ' · '+costs.join(' / ') : '';
  const needs = Object.keys(plan.cost).length ? '<p>'+costLabel(plan.cost,cfg,state.inventory)+'</p>' : '';
  return '<article class="activity"><div><h3>'+icon(artName,18)+esc(plan.label)+'</h3><p>'+esc(description)+'</p>'+
    '<p class="activity-meta">'+plan.minutes+' 分钟'+tally+'</p>'+needs+
    (plan.reason?'<p class="activity-lock">'+esc(plan.reason)+'</p>':'')+'</div>'+
    '<button class="primary" data-do="job-'+id+'" aria-label="'+esc(plan.label)+'"'+(plan.reason?' disabled':'')+'>开始</button></article>';
};
const list = cards => '<div class="activity-list">'+cards.join('')+'</div>';
const level = n => n ? 'Lv.'+n : '待搭建';

export class Panels {
  constructor(app) {
    this.app=app;this.kind=null;this.lastFocus=null;this.action=null;
    el('dismiss').onclick=()=>this.close();
    el('overlay').onclick=e=>{if(e.target===el('overlay'))this.close();};
    el('content').onclick=e=>{const b=e.target.closest('button[data-do]');if(b)this.invoke(b.dataset.do);};
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'){if(this.kind)this.close();else app.cancel();}
      if(e.key==='Tab'&&this.kind){
        const all=[...el('sheet').querySelectorAll('button:not(:disabled)')];const first=all[0],last=all.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    });
  }
  show(kind,title,body) {
    if(!this.kind)this.lastFocus=document.activeElement;
    this.kind=kind;el('sheet-title').textContent=title;el('content').innerHTML=body;
    el('overlay').hidden=false;
    for(const c of el('content').querySelectorAll('[data-art]'))thumbnail(c,c.dataset.art,this.app.dayPalette);
    if(!el('sheet').contains(document.activeElement))el('dismiss').focus({preventScroll:true});
  }
  close(){
    if(!this.kind)return;this.kind=null;this.action=null;el('overlay').hidden=true;
    if(this.lastFocus?.isConnected)this.lastFocus.focus({preventScroll:true});
  }
  ask(title,body,confirm,fn){
    this.action=fn;
    this.show('confirm',title,'<p>'+esc(body)+'</p><div class="actions">'+btn('proceed',esc(confirm),'primary')+btn('close','取消')+'</div>');
  }
  open(kind){
    const a=this.app,s=a.state,c=a.cfg;
    const survival=s.survival;
    const card=(id,glyph,desc)=>actionCard(s,c,id,glyph,desc);
    const jobStatus=survival.task ? '<p class="drawer-status">当前行动<span class="drawer-timer"></span></p>' : '';
    const fishingBonus=Math.max(0,survival.benchLevel-1);
    if(kind==='build'){
      const catalog=Object.entries(c.buildings).map(([id,v])=>'<button data-do="build-'+id+'">'+art(id)+'<span><b>'+v.name+'</b><small>'+costLabel(v.cost,c,s.inventory)+'</small></span></button>').join('');
      this.show(kind,'木筏 · Lv.'+survival.raftLevel,jobStatus+
        list([card('raft','build','工作台 '+level(survival.benchLevel)+' · 灯塔 '+(survival.lighthouseLevel?level(survival.lighthouseLevel):'待修复')+'。升级后提高设施上限与过滤产量。')])+
        '<b class="drawer-label">轻建造 · 每项 15 分钟</b><div class="catalog">'+catalog+'</div>'+
        '<div class="actions">'+btn('remove',icon('remove',17)+' 拆除')+btn('open-log',icon('log',17)+' 漂流日志')+'</div>');
    }else if(kind==='gather'){
      this.show(kind,'搜集材料',jobStatus+list([card('gather','wave','游到木筏附近，带回木材、纤维、废金属和一份额外材料。')]));
    }else if(kind==='hunt'){
      const fish=c.balance.survival.jobs.fish.food+Math.max(0,survival.rodLevel-1)*2+fishingBonus;
      const net=c.balance.survival.jobs.netFish.food+Math.max(0,survival.netLevel-1)*2+fishingBonus;
      this.show(kind,'捕猎',jobStatus+list([card('fish','fish','在木筏边垂钓，带回 '+fish+' 份鱼肉。'),
        card('netFish','fish','在附近浅海撒网，带回 '+net+' 份鱼肉。')]));
    }else if(kind==='bench'){
      this.show(kind,'工作台 · '+level(survival.benchLevel),jobStatus+list([
        card('bench','bench','木筏等级决定上限。升级后开放更多装备，并增加捕鱼收益。'),
        card('rod','fish','鱼竿 '+level(survival.rodLevel)+'。制作后即可钓鱼，升级会增加收获。'),
        card('net','fish','渔网 '+level(survival.netLevel)+'。制作后可在浅海撒网捕鱼。')]));
    }else if(kind==='lighthouse'){
      this.show(kind,'灯塔 · '+(survival.lighthouseLevel?level(survival.lighthouseLevel):'待修复'),jobStatus+list([
        card('lighthouse','lighthouse','木筏等级决定上限。每升一级，探寻带回的材料会更多。'),
        card('expedition','lighthouse','沿灯塔标记查看附近海域，带回木材、纤维、废金属及随机额外收获。')]));
    }else if(kind==='bag'){
      const rules=c.balance.survival;
      const supplies=[
        ['water','淡水','饮用','水分',rules.drinkRestore,survival.hydration],
        ['food','鱼肉','进食','体力',rules.eatRestore,survival.energy]
      ];
      const stock=supplies.map(([key,label,verb,stat,restore,value])=>'<div class="activity"><div><h3>'+
        icon(key==='water'?'water':'fish',18)+label+' · '+survival[key]+' 份</h3><p>'+
        (value===rules.maxVital?stat+'已满':verb+'恢复最多 '+restore+' '+stat)+'</p></div>'+
        '<button class="plain" data-do="use-'+key+'"'+(!survival[key]||value===rules.maxVital?' disabled':'')+'>'+verb+'</button></div>').join('');
      this.show(kind,'背包',jobStatus+'<div class="bag-stock">'+stock+'</div>'+list([
        card('filter','water','过滤器 Lv.'+survival.raftLevel+'，每次获得 '+(rules.jobs.filter.water+(survival.raftLevel-1)*2)+' 份淡水。'),
        card('rest','moon','在甲板上歇一会，恢复最多 '+rules.jobs.rest.restore+' 体力。')
      ])+'<b class="drawer-label">材料</b>'+
      Object.entries(c.items.resources).map(([k,name])=>'<div class="inventory-row"><span>'+icon(k,20)+name+'</span><b>'+s.inventory[k]+'</b></div>').join(''));
    }else if(kind==='log'){
      const rows=s.log.map(v=>'<div class="logline"><time>第 '+timeOfDay(v.time,c.balance).day+' 天</time><span>'+esc(v.text)+'</span></div>').join('');
      this.show(kind,'漂流日志',rows||'<p>行动完成后，收获将记在这里。</p>');
    }else if(kind==='settings'){
      const row=(label,act,val)=>'<div class="row"><span>'+label+'</span>'+btn(act,val)+'</div>';
      this.show(kind,'设置',
        row('游戏音效与海浪','sound',a.prefs.muted?'已静音':'已开启')+row('环境动态','motion',a.motion()?'已开启':'已关闭')+
        '<div class="row"><span>本地存档</span><span class="meta">'+esc(a.saves.mode)+'</span></div>'+
        '<div class="actions">'+(a.playing?btn('export','导出存档'):'')+btn('import','导入存档')+(a.playing?btn('reset','重新开始','plain warning'):'')+'</div>'+
        '<div class="row"><span>Demo v'+c.version.version+'</span>'+btn('update',a.updates?.waiting?'保存并更新':'检查更新')+'</div><p class="note" id="update-status">'+esc(a.updates?.message||'正在读取版本')+'</p>');
    }
    a.syncCountdown();
  }
  inspect(tile){
    const a=this.app,id=tile.buildingId;
    if(!id)return;
    this.show('detail',a.cfg.buildings[id].name,'<div class="detail-art">'+art(id)+'<p>'+a.cfg.buildings[id].info+'</p></div>'+btn('close','收起'));
  }
  invoke(act){
    const a=this.app;a.audio.unlock();a.audio.play('tap');
    if(act==='proceed'){const fn=this.action;this.close();fn?.();return;}
    if(act==='close'){this.close();return;}
    if(act==='open-log'){this.open('log');return;}
    if(act.startsWith('job-')){a.startAction(act.slice(4));return;}
    if(act.startsWith('use-')){a.useSupply(act.slice(4));return;}
    if(act.startsWith('build-')||act==='remove'){this.close();a.selectTool(act==='remove'?act:act.slice(6));return;}
    if(act==='sound'||act==='motion'){a.preference(act);this.open('settings');}
    if(act==='export')a.exportSave();
    if(act==='import')el('file').click();
    if(act==='reset')this.ask('重新开始漂流？','当前木筏、资源和日志将被替换。可以先导出 JSON 备份。','重新开始',()=>a.newGame());
    if(act==='update'){
      if(a.updates.waiting)a.updates.activate();
      else a.updates.check();
    }
  }
}
