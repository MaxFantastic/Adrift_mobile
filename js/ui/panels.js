import {icon} from './icons.js';
import {thumbnail} from '../render/sprites.js';
import {timeOfDay} from '../core/clock.js';
export const el=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(action,text,cls='plain')=>'<button class="'+cls+'" data-do="'+action+'">'+text+'</button>';
const art=id=>'<canvas aria-hidden="true" data-art="'+id+'"></canvas>';
export function costLabel(cost,cfg,inventory) {
  return '<span class="cost">'+Object.entries(cost).map(([k,n])=>'<span aria-label="'+cfg.items.resources[k]+n+'" class="'+(inventory[k]<n?'short':'')+'">'+icon(k,15)+n+'</span>').join('')+'</span>';
}
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
    if(kind==='build'){
      const catalog=Object.entries(c.buildings).map(([id,v])=>'<button data-do="build-'+id+'">'+art(id)+'<span><b>'+v.name+'</b><small>'+costLabel(v.cost,c,s.inventory)+'</small></span></button>').join('');
      this.show(kind,'建造','<div class="catalog">'+catalog+'</div><div class="actions">'+btn('remove',icon('remove',17)+' 拆除')+'</div>');
    }else if(kind==='bag'){
      this.show(kind,'背包',Object.entries(c.items.resources).map(([k,name])=>'<div class="inventory-row"><span>'+icon(k,23)+name+'</span><b>'+s.inventory[k]+'</b></div>').join('')+'<p class="note">库存无容量上限。点击海面上的漂浮物即可收集。</p>');
    }else if(kind==='log'){
      const rows=s.log.map(v=>'<div class="logline"><time>第 '+timeOfDay(v.time,c.balance).day+' 天</time><span>'+esc(v.text)+'</span></div>').join('');
      this.show(kind,'漂流日志','<p>'+esc(a.guideText(true))+'</p>'+rows);
    }else if(kind==='settings'){
      const row=(label,act,val)=>'<div class="row"><span>'+label+'</span>'+btn(act,val)+'</div>';
      this.show(kind,'设置',
        row('游戏音效','sound',a.prefs.muted?'已静音':'已开启')+row('环境动态','motion',a.motion()?'已开启':'已关闭')+
        '<div class="row"><span>本地存档</span><span class="meta">'+esc(a.saves.mode)+'</span></div>'+
        '<div class="actions">'+(a.playing?btn('export','导出存档'):'')+btn('import','导入存档')+(a.playing?btn('reset','重新开始','plain warning'):'')+'</div>'+
        '<div class="row"><span>Demo v'+c.version.version+'</span>'+btn('update',a.updates?.waiting?'保存并更新':'检查更新')+'</div><p class="note" id="update-status">'+esc(a.updates?.message||'正在读取版本')+'</p>');
    }
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
