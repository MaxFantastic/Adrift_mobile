import {build,demolish,record} from '../core/state.js';
import {placement,removal,tileAt} from './building.js';

const names = {
  gather:'搜集材料', filter:'过滤淡水', fish:'钓鱼', netFish:'撒网捕鱼', rest:'休息',
  bench:'升级工作台', lighthouse:'升级灯塔', expedition:'灯塔探寻',
  rod:'升级鱼竿', net:'升级渔网', raft:'升级木筏', build:'建造', demolish:'拆除'
};
const levelField = {bench:'benchLevel',lighthouse:'lighthouseLevel',rod:'rodLevel',net:'netLevel',raft:'raftLevel'};
export const navForJob = {gather:'gather',fish:'hunt',netFish:'hunt',bench:'bench',rod:'bench',net:'bench',
  lighthouse:'lighthouse',expedition:'lighthouse',filter:'bag',rest:'bag',raft:'build',build:'build',demolish:'build'};
const labelFor = (id, level) => level === 0
  ? ({bench:'搭建工作台',lighthouse:'修复灯塔',rod:'制作鱼竿',net:'制作渔网'}[id] ?? names[id])
  : names[id];

export function planTask(state,cfg,id,target,prepaid=false) {
  const s = state.survival;
  const rules = cfg.balance.survival;
  if (!Object.hasOwn(rules.jobs,id)) return {reason:'未知行动'};
  const job = rules.jobs[id];
  const level = s[levelField[id]] ?? 0;
  const step = id === 'raft' ? level - 1 : level;
  const plan = {id, label:labelFor(id,level), minutes:job.minutes + step*(job.stepMinutes ?? 0),
    energy:job.energy ?? 0, hydration:job.hydration ?? 0, waterCost:job.waterCost ?? 0,
    cost:Object.fromEntries(Object.entries(job.cost ?? {}).map(([key,n])=>[key,n*(step+1)])),
    reason:''};
  const lock = reason => ({...plan,reason});
  if (s.task && !prepaid) return lock('当前行动完成后即可开始');
  if (['bench','lighthouse'].includes(id) && level >= s.raftLevel) return lock('达到当前木筏等级上限');
  if (id === 'raft') {
    if (level >= rules.maxRaftLevel) return lock('已达到前期最高等级');
    if (s.benchLevel < level || s.lighthouseLevel < level) return lock('工作台与灯塔均需达到 Lv.'+level);
  }
  if (id === 'fish' && !s.rodLevel) return lock('先去工作台制作鱼竿');
  if (id === 'netFish' && !s.netLevel) return lock('先去工作台制作渔网');
  if (id === 'expedition' && !s.lighthouseLevel) return lock('先修复灯塔');
  if (id === 'net' && s.benchLevel < rules.netUnlock) return lock('工作台达到 Lv.'+rules.netUnlock+' 后解锁');
  if (['rod','net'].includes(id) && level >= s.benchLevel) {
    return lock(s.benchLevel ? '升级工作台可提高装备上限' : '先搭建工作台');
  }
  if (['build','demolish'].includes(id)) {
    const {x,y,item,layer} = target ?? {};
    const reason = id === 'build' ? placement(state,cfg,item,x,y,false) : removal(state,x,y,layer);
    if (reason) return lock(reason);
    const building = id === 'build' ? item : layer === 'deck' ? 'deck' : tileAt(state.raft.tiles,x,y).buildingId;
    plan.label += cfg.buildings[building].name;
    if (id === 'build') plan.cost = cfg.buildings[item].cost;
  }
  if (!prepaid) {
    if (id === 'rest' && s.energy === rules.maxVital) return lock('体力已满');
    if (s.energy < plan.energy) return lock('体力不足，可在背包进食或休息');
    if (s.hydration < plan.hydration) return lock('水分不足，可在背包饮水');
    if (s.water < plan.waterCost) return lock('淡水不足，可在背包过滤');
    const missing = Object.entries(plan.cost).filter(([k,n])=>state.inventory[k]<n);
    if (missing.length) return lock('还需 '+missing.map(([k,n])=>cfg.items.resources[k]+' '+(n-state.inventory[k])).join('、'));
  }
  return plan;
}

export function startTask(state,cfg,id,target=null,now=Date.now(),random=Math.random) {
  const plan = planTask(state,cfg,id,target);
  if (plan.reason) return {ok:false,reason:plan.reason};
  const s = state.survival;
  for (const [key,n] of Object.entries(plan.cost)) state.inventory[key] -= n;
  s.energy -= plan.energy;
  s.hydration -= plan.hydration;
  s.water -= plan.waterCost;
  s.task = {id,target,startedAt:now,endsAt:now+plan.minutes*60000,roll:Math.floor(random()*10000)};
  record(state,cfg,'开始'+plan.label+' · '+plan.minutes+' 分钟');
  return {ok:true,label:plan.label};
}

function awardMaterials(state,cfg,reward) {
  for (const [key,n] of Object.entries(reward)) state.inventory[key] += n;
  return Object.entries(reward).map(([key,n])=>cfg.items.resources[key]+' +'+n).join('、');
}

export function finishTask(state,cfg,now=Date.now()) {
  const s = state.survival;
  const task = s.task;
  if (!task || now < task.endsAt) return null;
  const {id,target,roll} = task;
  const rules = cfg.balance.survival;
  const job = rules.jobs[id];
  const plan = planTask(state,cfg,id,target,true);
  s.task = null;
  let text = plan.label+'完成';
  if (id === 'build') {
    const out = build(state,cfg,target.item,target.x,target.y,true);
    if (!out.ok) {
      const returned = awardMaterials(state,cfg,cfg.buildings[target.item].cost);
      text = '施工未完成 · 已退还 '+returned;
      record(state,cfg,text);
    }
    return {id,text,target:out.ok ? target : null};
  }
  if (id === 'demolish') {
    const out = demolish(state,cfg,target.x,target.y,target.layer);
    return {id,text:out.ok ? text+' · 材料已回收' : out.reason};
  }
  if (levelField[id]) {
    const level = ++s[levelField[id]];
    text += ' · Lv.'+level;
    if (id === 'raft') text += '，过滤器同步升至 Lv.'+level;
  } else if (id === 'gather' || id === 'expedition') {
    const materials = {...job.reward};
    const keys = Object.keys(materials);
    const bonus = keys[roll % keys.length];
    if (id === 'expedition') {
      for (const key of keys) materials[key] += s.lighthouseLevel - 1;
      materials[bonus] += s.lighthouseLevel;
    } else {
      materials[bonus]++;
    }
    text += ' · '+awardMaterials(state,cfg,materials);
  } else if (id === 'filter') {
    const n = job.water + (s.raftLevel - 1)*2;
    s.water += n;
    text += ' · 淡水 +'+n;
  } else if (id === 'fish' || id === 'netFish') {
    const gear = id === 'fish' ? s.rodLevel : s.netLevel;
    const n = job.food + (gear - 1)*2 + (s.benchLevel - 1);
    s.food += n;
    text += ' · 鱼肉 +'+n;
  } else if (id === 'rest') {
    const before = s.energy;
    s.energy = Math.min(rules.maxVital,s.energy+job.restore);
    text += ' · 体力 +'+(s.energy-before);
  }
  record(state,cfg,text);
  return {id,text};
}

export function consume(state,cfg,id) {
  if (id !== 'water' && id !== 'food') return {ok:false,reason:'未知补给'};
  const s = state.survival;
  const rules = cfg.balance.survival;
  const isWater = id === 'water';
  const stat = isWater ? 'hydration' : 'energy';
  const label = isWater ? '水分' : '体力';
  if (s[stat] >= rules.maxVital) return {ok:false,reason:label+'已满'};
  if (!s[id]) return {ok:false,reason:isWater?'背包没有淡水':'背包没有鱼肉'};
  const gain = Math.min(rules.maxVital-s[stat],isWater ? rules.drinkRestore : rules.eatRestore);
  s[id]--;
  s[stat] += gain;
  const text = (isWater?'喝了淡水':'吃了鱼肉')+' · '+label+' +'+gain;
  record(state,cfg,text);
  return {ok:true,text};
}

export function checkRain(state,cfg,random=Math.random) {
  const s = state.survival;
  const rules = cfg.balance.survival;
  const current = state.clock.elapsedSeconds;
  const between = ([a,b])=>a+Math.floor(random()*(b-a+1));
  if (s.rainAt === null) {
    s.rainAt = current+between(rules.rainWaitSeconds);
    return null;
  }
  if (current < s.rainAt) return null;
  s.rainUntil = current+rules.rainDurationSeconds;
  s.rainAt = s.rainUntil+between(rules.rainWaitSeconds);
  const water = between(rules.rainWater);
  s.water += water;
  const text = '阵雨来过 · 接到淡水 +'+water;
  record(state,cfg,text);
  return text;
}

export function remainingTime(seconds) {
  const n = Math.max(0,Math.ceil(seconds));
  const pad = x=>String(x).padStart(2,'0');
  const minutes = Math.floor(n/60) % 60;
  return (n>=3600 ? Math.floor(n/3600)+':' : '')+pad(minutes)+':'+pad(n%60);
}
