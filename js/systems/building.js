export const key = (x, y) => x + ',' + y;
export const neighbors = (x, y) => [[x+1,y], [x-1,y], [x,y+1], [x,y-1]];
export const foundation = (x,y) => (x === 0 || x === 1) && (y === 0 || y === 1);
export const tileAt = (tiles,x,y) => tiles.find(t => t.x === x && t.y === y);

export function connected(tiles) {
  const cells = new Set(tiles.map(t => key(t.x,t.y)));
  if (!cells.has('0,0')) return false;
  const stack = [[0,0]];
  cells.delete('0,0');
  while (stack.length) {
    for (const [x,y] of neighbors(...stack.pop())) {
      if (cells.delete(key(x,y))) stack.push([x,y]);
    }
  }
  return cells.size === 0;
}

export function placement(state, cfg, id, x, y, checkCost = true) {
  const {balance,buildings} = cfg;
  const tiles = state.raft.tiles;
  if (!Number.isInteger(x) || !Number.isInteger(y) || Math.max(Math.abs(x),Math.abs(y)) > balance.coordinateLimit) return '超出木筏的建造范围';
  if (!Object.hasOwn(buildings,id)) return '未知建筑';
  const tile = tileAt(tiles,x,y);
  if (id === 'deck') {
    if (tile) return '这里已有甲板';
    if (tiles.length >= balance.maxTiles) return '甲板数量已达上限';
    if (!neighbors(x,y).some(([a,b]) => tileAt(tiles,a,b))) return '新甲板需要与木筏共用一条边';
  } else {
    if (!tile) return '设施需要放在甲板上';
    if (tile.buildingId) return '这块甲板已被占用';
  }
  if (checkCost) {
    const missing = Object.entries(buildings[id].cost).filter(([k,v]) => state.inventory[k] < v);
    if (missing.length) return '还需' + missing.map(([k,v]) => (v-state.inventory[k]) + ' ' + cfg.items.resources[k]).join('、');
  }
  return '';
}

export function candidates(state,cfg,id) {
  const result = new Map();
  for (const {x,y} of state.raft.tiles) {
    const coords = id === 'deck' ? neighbors(x,y) : [[x,y]];
    for (const [a,b] of coords) {
      if (!placement(state,cfg,id,a,b,false)) result.set(key(a,b),{x:a,y:b});
    }
  }
  return [...result.values()];
}

export function removal(state,x,y,layer) {
  const tiles = state.raft.tiles;
  const tile = tileAt(tiles,x,y);
  if (!tile) return '这里没有可以拆除的物件';
  if (layer === 'facility') return tile.buildingId ? '' : '这块甲板上没有设施';
  if (layer !== 'deck') return '请选择要拆除的物件';
  if (tile.buildingId) return '请先拆除甲板上的设施';
  if (foundation(x,y)) return '最初的四块甲板需要保留';
  if (!connected(tiles.filter(t => t !== tile))) return '拆除会使木筏断开';
  return '';
}
export function refund(cost,rate) {
  return Object.fromEntries(Object.entries(cost).map(([id,n]) => [id,Math.floor(n*rate)]));
}
