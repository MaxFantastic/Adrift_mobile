import {foundation,placement,removal,refund,tileAt} from '../systems/building.js';

export function initialSurvival(cfg) {
  const rules = cfg.balance.survival;
  return {
    energy:rules.maxVital, hydration:rules.maxVital, water:rules.initialWater, food:rules.initialFood,
    raftLevel:1, benchLevel:0, lighthouseLevel:0, rodLevel:0, netLevel:0,
    task:null, rainAt:null, rainUntil:0
  };
}

export function initialState(cfg) {
  const tiles = [[0,0],[1,0],[0,1],[1,1]].map(([x,y]) => ({x,y,foundation:true,buildingId:null}));
  return {schemaVersion:cfg.version.schemaVersion,gameVersion:cfg.version.version,savedAt:null,
    clock:{elapsedSeconds:0},inventory:{...cfg.balance.initial},raft:{tiles},
    tutorial:{step:0,completed:false},log:[],survival:initialSurvival(cfg)};
}

export function record(state,cfg,text) {
  state.log.unshift({time:Math.floor(state.clock.elapsedSeconds),text});
  state.log.length = Math.min(state.log.length,cfg.balance.maxLog);
}
function tutorial(state,step) {
  if (state.tutorial.completed || state.tutorial.step !== step) return;
  state.tutorial.step++;
  state.tutorial.completed = state.tutorial.step >= 3;
}
export function credit(state,cfg,type) {
  const {name,reward} = cfg.items.drops[type];
  for (const [k,n] of Object.entries(reward)) state.inventory[k] += n;
  record(state,cfg,'收起' + name + ' · ' + Object.entries(reward).map(([k,n]) => cfg.items.resources[k] + ' +' + n).join('，'));
  tutorial(state,0);
}
export function build(state,cfg,id,x,y,prepaid=false) {
  const reason = placement(state,cfg,id,x,y,!prepaid);
  if (reason) return {ok:false,reason};
  if (!prepaid) for (const [k,n] of Object.entries(cfg.buildings[id].cost)) state.inventory[k] -= n;
  if (id === 'deck') state.raft.tiles.push({x,y,foundation:foundation(x,y),buildingId:null});
  else tileAt(state.raft.tiles,x,y).buildingId = id;
  record(state,cfg,'建成' + cfg.buildings[id].name);
  tutorial(state,id === 'deck' ? 1 : 2);
  return {ok:true};
}
export function demolish(state,cfg,x,y,layer) {
  const reason = removal(state,x,y,layer);
  if (reason) return {ok:false,reason};
  const tile = tileAt(state.raft.tiles,x,y);
  const id = layer === 'deck' ? 'deck' : tile.buildingId;
  const recovered = refund(cfg.buildings[id].cost,cfg.balance.refundRate);
  for (const [k,n] of Object.entries(recovered)) state.inventory[k] += n;
  if (layer === 'deck') state.raft.tiles = state.raft.tiles.filter(t => t !== tile);
  else tile.buildingId = null;
  record(state,cfg,'拆除' + cfg.buildings[id].name + '，回收材料');
  return {ok:true,recovered};
}
