// Original miniature meshes. Coordinates are in tile units, with z measured up
// from the planking. Faces are stored in painter's order and shared by instances.
const materials = {
  deck: '#dbb58a', wall: '#f5ebdd', leaf: '#789b83', light: '#f8e6b3',
  wood: '#a37b5d', roof: '#cb8066', shade: '#52676c'
};

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => Math.max(a, Math.min(x, b));
const rgb = s => {
  const h = s.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  return [n >> 16, n >> 8 & 255, n & 255];
};
function blend(a, b, t) {
  const u = rgb(a), v = rgb(b);
  return '#' + u.map((k, i) => Math.round(lerp(k, v[i], t)).toString(16).padStart(2, '0')).join('');
}
let lastKey = '', lastColors;
function colors(p) {
  const key = Object.keys(materials).map(k => p[k] || materials[k]).join('') + Math.round((p.night || 0) * 32);
  if (key === lastKey) return lastColors;
  const v = { ...materials, ...p }, mix = (a, b, t) => blend(v[a], v[b], t);
  lastKey = key;
  lastColors = {
    ...v, plank1: mix('deck', 'wall', .18), plank2: mix('deck', 'wall', .06),
    plank3: mix('deck', 'wood', .09), plank4: mix('deck', 'light', .1),
    grain: mix('deck', 'wood', .61), cut: mix('wood', 'deck', .49),
    frame: mix('wood', 'shade', .17), timber: mix('wood', 'shade', .42),
    dark: mix('wood', 'shade', .74), deep: blend(v.shade, '#243b43', .47),
    metal: mix('shade', 'wall', .18), metalSide: mix('shade', 'wood', .12),
    metalTop: mix('wall', 'shade', .37), rope: mix('deck', 'wall', .58),
    ropeShade: mix('wood', 'wall', .22), plaster: mix('wall', 'shade', .30),
    trim: mix('wall', 'deck', .16), sill: mix('wall', 'wood', .34),
    door: mix('leaf', 'shade', .60), doorSide: mix('leaf', 'shade', .84),
    tileLight: mix('roof', 'wall', .27), tileDark: mix('roof', 'wood', .40),
    tileEdge: mix('roof', 'shade', .35), tileCourse: mix('roof', 'wood', .18),
    green: mix('leaf', 'light', .24), greenDeep: mix('leaf', 'shade', .55),
    greenCool: mix('leaf', 'wall', .26), sand: mix('wall', 'deck', .48),
    canvasShade: mix('wall', 'shade', .21), canvasLight: mix('wall', 'light', .17),
    skin: mix('deck', 'wall', .45), glass: mix('shade', 'leaf', .25),
    litGlass: blend(mix('shade', 'leaf', .25), v.light, clamp((p.night || 0) * 1.25, 0, 1)),
    litLamp: blend(mix('wall', 'light', .48), v.light, clamp(p.night || 0, 0, 1))
  };
  return lastColors;
}

class Mesh {
  constructor() { this.faces = []; }
  face(color, ...pts) { this.faces.push({ color, pts }); }
  line(color, width, ...pts) { this.faces.push({ color, width, pts }); }
  block(x0, y0, z0, x1, y1, z1, top, left, right) {
    this.face(left, [x0,y1,z1], [x1,y1,z1], [x1,y1,z0], [x0,y1,z0]);
    this.face(right, [x1,y0,z1], [x1,y1,z1], [x1,y1,z0], [x1,y0,z0]);
    this.face(top, [x0,y0,z1], [x1,y0,z1], [x1,y1,z1], [x0,y1,z1]);
  }
  // Small faceted posts and lamps stay legible even when the tile is zoomed out.
  solid(x, y, bottom, top, r0, r1, cap, lit, shadow, sides=8) {
    const rings = [[bottom, r0], [top, r1]].map(([z,r]) => Array.from({ length: sides }, (_,i) => {
      const a = (i + .5) * 2 * Math.PI / sides;
      return [x + r*Math.cos(a), y + r*Math.sin(a), z];
    }));
    for (let i=0; i<sides; i++) {
      const j = (i+1) % sides, a = (i+1)*2*Math.PI/sides;
      if (Math.cos(a) + Math.sin(a) > -.001) {
        this.face(Math.sin(a) > Math.cos(a) ? lit : shadow, rings[0][i], rings[0][j], rings[1][j], rings[1][i]);
      }
    }
    if (r1 > 0) this.face(cap, ...rings[1]);
  }
}

function deck(m) {
  m.block(-.45,-.45,-.17,.45,.45,-.09, 'wood','frame','timber');
  m.block(-.485,-.485,-.113,.485,.485,-.03, 'wood','cut','frame');
  const planks = ['plank2','plank1','plank3','plank4','plank2'];
  for (let i=0; i<5; i++) {
    const y = -.489 + i*.196;
    m.block(-.491,y,-.043,.491,y+.185,0,planks[i],'cut','wood');
  }
  // Occasional short grain marks; keep the deck quiet under architecture.
  m.line('grain',.004,[-.37,-.40,.001],[-.19,-.4,.001],[-.12,-.414,.001]);
  m.line('grain',.004,[.14,.177,.001],[.30,.177,.001]);
  m.line('grain',.004,[-.18,.392,.001],[-.035,.382,.001],[.06,.386,.001]);
  for (const x of [-.4,.4]) for (const y of [-.4,.39]) {
    m.face('frame',[x-.011,y-.011,.001],[x+.012,y-.011,.001],[x+.012,y+.012,.001],[x-.011,y+.012,.001]);
  }
}

function chest(m, s=1) {
  const small = new Mesh();
  small.block(-.35,-.25,.012,.35,.25,.36, 'plank2','cut','frame');
  for (const x of [-.31,.26]) {
    small.face('wood',[x,.252,.02],[x+.055,.252,.02],[x+.055,.252,.34],[x,.252,.34]);
  }
  for (const z of [.044,.29]) {
    small.face('wood',[-.36,.26,z],[.36,.26,z],[.36,.26,z+.035],[-.36,.26,z+.035]);
    small.face('timber',[.36,.26,z],[.36,-.26,z],[.36,-.26,z+.035],[.36,.26,z+.035]);
  }
  small.line('wood',.007,[-.2,.251,.174],[.2,.251,.174]);
  small.line('timber',.007,[.351,-.20,.174],[.351,.2,.174]);
  small.block(-.367,-.266,.326,.367,.266,.38,'plank1','cut','wood');
  for (const x of [-.24,.17]) {
    small.face('metalTop',[x,-.264,.382],[x+.065,-.264,.382],[x+.065,.266,.382],[x,.266,.382]);
    small.face('metal',[x,.268,.382],[x+.065,.268,.382],[x+.065,.268,.30],[x,.268,.30]);
  }
  small.block(-.036,.267,.266,.036,.278,.342,'metalTop','metal','metalSide');
  m.faces.push(...small.faces.map(f => ({...f, width: f.width && f.width*s, pts: f.pts.map(p=>p.map(v=>v*s))})));
}

function arch(m, y, x, bottom, shoulder, radius, mat) {
  const pts = [[x-radius,y,bottom], [x+radius,y,bottom]];
  for (let i=0; i<=12; i++) {
    const a = i*Math.PI/12;
    pts.push([x+radius*Math.cos(a),y,shoulder + radius*.85*Math.sin(a)]);
  }
  m.face(mat,...pts);
}
function cabin(m) {
  m.block(-.401,-.365,0,.401,.348,.074,'sill','cut','frame');
  m.block(-.378,-.35,.072,.378,.33,.55,'trim','wall','plaster');
  m.face('wall',[-.378,.33,.545],[.378,.33,.545],[0,.33,.80]);
  m.face('plaster',[.378,-.35,.55],[.378,.33,.55],[.362,.32,.572],[.362,-.35,.572]);
  // Glazed windows are inset behind a pale frame; the front door has a rounded reveal.
  arch(m,.331,-.018,.075,.299,.143,'sill');
  arch(m,.333,-.018,.075,.30,.110,'doorSide');
  arch(m,.334,-.006,.079,.29,.087,'door');
  m.face('litGlass',[-.064,.335,.232],[.049,.335,.232],[.049,.335,.299],[-.064,.335,.299]);
  m.line('timber',.008,[-.008,.336,.234],[-.008,.336,.302]);
  m.line('rope',.013,[.053,.337,.166],[.065,.338,.166]);
  m.block(-.17,.329,.037,.147,.426,.087,'trim','sill','plaster');
  m.block(-.202,.415,.004,.174,.492,.043,'sill','cut','plaster');
  m.face('sill',[.379,-.165,.228],[.379,.126,.228],[.379,.126,.445],[.379,-.165,.445]);
  m.face('litGlass',[.38,-.142,.248],[.38,.102,.248],[.38,.102,.426],[.38,-.142,.426]);
  m.line('trim',.012,[.382,-.019,.248],[.382,-.019,.426]);
  m.line('trim',.01,[.382,-.14,.340],[.382,.10,.340]);
  m.block(.378,-.18,.218,.408,.143,.243,'trim','sill','plaster');
  m.face('door',[-.054,.334,.526],[.0,.334,.584],[.054,.334,.526],[0,.334,.469]);
  // Two broad pitched planes with a darker overhang and broken tile courses.
  const left = -.464, right = .464, rear = -.423, front = .406, eave = .54, ridge = .882;
  m.face('tileLight',[left,rear,eave],[0,rear,ridge],[0,front,ridge],[left,front,eave]);
  m.face('roof',[0,rear,ridge],[right,rear,eave],[right,front,eave],[0,front,ridge]);
  m.face('tileDark',[right,rear,eave],[right,front,eave],[right,front,eave-.033],[right,rear,eave-.033]);
  m.face('tileLight',[left,front,eave],[0,front,ridge],[0,front,ridge-.036],[left,front,eave-.033]);
  m.face('tileEdge',[0,front,ridge],[right,front,eave],[right,front,eave-.033],[0,front,ridge-.036]);
  for (const t of [.32,.65]) {
    m.line('tileCourse',.0055,[right*t,rear+.035,lerp(ridge,eave,t)+.002],[right*t,front-.025,lerp(ridge,eave,t)+.002]);
  }
  m.line('tileLight',.016,[0,rear,ridge],[0,front,ridge]);
  m.block(.175,-.258,.706,.285,-.146,.919,'sill','trim','plaster');
  m.block(.162,-.269,.905,.299,-.133,.943,'tileLight','roof','tileEdge');
  m.face('dark',[.192,-.244,.944],[.271,-.244,.944],[.271,-.159,.944],[.192,-.159,.944]);
}

function leaf(m,x,y,z,dx,dy,h,size,color,side) {
  const d = Math.hypot(dx,dy) || 1, lx = -dy/d*size, ly = dx/d*size;
  const base = [x,y,z], tip = [x+dx,y+dy,z+h];
  const mid = [x+dx*.47,y+dy*.47,z+h*.56];
  m.face(color,base,[mid[0]+lx,mid[1]+ly,mid[2]],tip,mid);
  m.face(side,base,mid,tip,[mid[0]-lx,mid[1]-ly,mid[2]-.014]);
}
function planter(m) {
  m.block(-.391,-.28,.01,.39,.28,.221,'wood','cut','frame');
  m.line('wood',.009,[-.38,.281,.121],[.38,.281,.121]);
  m.line('timber',.009,[.391,-.26,.121],[.391,.26,.121]);
  m.block(-.414,-.302,.205,.411,.302,.25,'plank1','cut','wood');
  m.face('dark',[-.355,-.239,.252],[.352,-.239,.252],[.352,.237,.252],[-.355,.237,.252]);
  for (const [x,y,h] of [[-.205,-.035,.34],[.147,-.059,.41],[.016,.108,.28]]) {
    const base = .251;
    m.line('greenDeep',.015,[x,y,base],[x-.009,y+.004,base+h*.84]);
    leaf(m,x,y,base+.025,-.176,-.086,h*.72,.084,'leaf','greenDeep');
    leaf(m,x,y,base+.05,.15,-.056,h*.94,.080,'greenCool','leaf');
    leaf(m,x,y,base+.027,.104,.187,h*.61,.091,'green','leaf');
    leaf(m,x,y,base+.073,-.103,.164,h*.78,.081,'green','greenDeep');
  }
  for (const [x,y,z] of [[.14,-.047,.74],[.202,-.033,.69]]) {
    m.line('greenDeep',.009,[.147,-.059,.49],[x,y,z-.02]);
    m.solid(x,y,z-.041,z,.020,.026,'light','sand','grain',5);
  }
}
function lantern(m) {
  m.block(-.136,-.135,.002,.136,.135,.065,'cut','wood','frame');
  m.solid(0,0,.063,.136,.088,.061,'metalTop','metal','dark');
  m.solid(0,0,.13,.846,.044,.031,'cut','wood','timber');
  m.solid(0,0,.79,.89,.066,.105,'metalTop','metal','deep',4);
  m.block(-.099,-.099,.884,.099,.099,1.093,'rope','litLamp','litLamp');
  for (const [x,y] of [[-.096,.096],[.096,-.096],[.096,.096]]) {
    m.line('metalSide',.016,[x,y,.882],[x,y,1.096]);
  }
  m.block(-.137,-.136,1.089,.137,.136,1.122,'metalTop','metal','dark');
  m.face('leaf',[-.139,.139,1.122],[.139,.139,1.122],[0,0,1.259]);
  m.face('door',[.139,.139,1.122],[.139,-.139,1.122],[0,0,1.259]);
  m.solid(0,0,1.247,1.291,.022,.012,'rope','wood','frame');
}

function sail(m) {
  const mx=-.294, my=.192;
  m.block(-.371,.104,0,-.19,.286,.079,'cut','wood','frame');
  m.solid(mx,my,.075,1.438,.034,.017,'plank1','cut','wood');
  m.line('ropeShade',.01,[.38,-.348,.033],[mx,my,1.346],[-.376,.382,.035]);
  m.line('rope',.009,[mx,my,1.346],[-.376,.382,.035]);
  m.line('timber',.031,[mx,my,.33],[.448,-.307,.232]);
  // Cross-sections of the sail taper to the masthead. The middle seam and the
  // leech bow towards the viewer, so a still sail retains some visual volume.
  function section(t) {
    const bulk=Math.sin(Math.PI*t);
    const start=[mx+.025,my-.02,lerp(.364,1.36,t)];
    const end=[lerp(.427,mx+.058,t)+bulk*.108,lerp(-.311,my-.05,t)+bulk*.008,lerp(.257,1.351,t)];
    const mid=[lerp(start[0],end[0],.57)+bulk*.082,lerp(start[1],end[1],.57)+bulk*.104,lerp(start[2],end[2],.57)+.032*(1-t)];
    return [start,mid,end];
  }
  const rows = [[0,'canvasLight','canvasShade'],[.125,'roof','tileDark'],[.205,'canvasLight','canvasShade'],
    [.279,'tileLight','roof'],[.324,'canvasLight','canvasShade'],[.52,'canvasLight','canvasShade'],
    [.71,'canvasLight','canvasShade'],[.87,'canvasLight','canvasShade'],[1]];
  for(let i=0;i<rows.length-1;i++) {
    const a=section(rows[i][0]), b=section(rows[i+1][0]);
    m.face(rows[i][1],a[0],a[1],b[1],b[0]);
    m.face(rows[i][2],a[1],a[2],b[2],b[1]);
  }
  m.line('rope',.009,...rows.map(row=>section(row[0])[2]));
  for (const z of [.167,.191,.215]) m.solid(mx,my,z,z+.013,.041,.042,'rope','rope','ropeShade');
  m.solid(mx,my,1.432,1.473,.027,.022,'rope','cut','wood');
  m.face('roof',[mx,my,1.453],[mx+.184,my-.121,1.431],[mx+.328,my-.153,1.47],[mx+.223,my-.107,1.383],[mx+.125,my-.064,1.389],[mx,my,1.381]);
  m.face('tileLight',[mx,my,1.453],[mx+.184,my-.121,1.431],[mx+.125,my-.064,1.389],[mx,my,1.381]);
}

function person(m, casting=false) {
  m.block(-.086,-.03,.004,-.006,.079,.105,'door','doorSide','deep');
  m.block(.017,-.022,.006,.102,.08,.119,'door','doorSide','deep');
  m.solid(0,0,.082,.301,.147,.073,'trim','wall','plaster',7);
  m.face('sand',[.008,.153,.086],[.075,.105,.297],[.121,.043,.267],[.091,.105,.10]);
  if (casting) {
    m.line('wall',.051,[.092,.034,.256],[.194,-.006,.266],[.245,-.045,.33]);
    m.solid(.245,-.046,.309,.345,.035,.025,'skin','skin','cut');
  } else {
    m.line('sill',.043,[.078,.065,.262],[.118,.067,.143]);
  }
  m.solid(-.009,0,.271,.306,.115,.106,'tileLight','roof','tileEdge',7);
  m.solid(0,0,.298,.449,.096,.108,'sand','skin','cut',8);
  m.solid(-.012,-.012,.373,.431,.139,.128,'tileLight','roof','tileEdge',7);
  m.solid(-.012,-.012,.43,.517,.128,.032,'tileLight','tileLight','roof',7);
  m.face('roof',[-.064,.095,.393],[.013,.115,.389],[-.032,.093,.309],[-.083,.075,.304]);
  m.line('deep',.011,[.066,.089,.362],[.077,.083,.362]);
  m.face('tileDark',[-.089,.064,.299],[-.128,.131,.238],[-.115,.151,.26],[-.135,.15,.254],[-.103,.054,.302]);
}

function wood(m) {
  m.block(-.317,-.116,-.039,.312,.112,.015,'plank1','cut','wood');
  m.face('plank3',[-.255,-.103,.016],[-.038,-.103,.016],[-.03,-.047,.016],[-.25,-.067,.016]);
  m.line('grain',.008,[-.12,.072,.017],[.11,.066,.017],[.201,.048,.017]);
  m.face('cut',[.206,-.115,.016],[.234,-.115,.016],[.187,-.037,.016]);
}
function fiber(m) {
  const shape=(offset,dy,h,size,lit,dark) => leaf(m,-.1+offset,.08,.006,.24+offset,dy,h,size,lit,dark);
  shape(-.13,-.32,.068,.089,'green','greenDeep');
  shape(.055,-.198,.133,.076,'leaf','greenDeep');
  shape(-.01,.011,.119,.081,'greenCool','leaf');
  m.line('greenDeep',.021,[-.24,.18,-.004],[-.065,.063,.014],[.147,-.04,.074]);
}
function scrap(m) {
  const a=[-.193,-.144,.046],b=[.22,-.14,.06],c=[.273,.083,.047],d=[.181,.166,.058],e=[-.205,.119,.043];
  m.face('metalSide',c,d,e,[-.205,.119,-.027],[.181,.166,-.023],[.273,.083,-.021]);
  m.face('metalTop',a,b,c,d,e);
  m.face('metal',[.22,-.14,.06],[.273,.083,.047],[.273,.083,-.021],[.227,-.14,.003]);
  m.face('door',[.205,-.099,.061],[.23,.046,.052],[.155,.05,.055],[.139,-.099,.059]);
  m.line('wall',.011,[-.158,.055,.048],[-.14,-.080,.055],[.084,-.077,.059]);
  m.solid(-.101,.006,.047,.066,.032,.031,'metalSide','metal','deep',6);
}
function mooring(m) {
  m.solid(0,0,.005,.32,.053,.053,'plank1','cut','wood');
  for (const z of [.166,.192,.218]) m.solid(0,0,z,z+.023,.067,.066,'rope','rope','ropeShade');
  m.line('ropeShade',.019,[0,.054,.187],[.119,.101,.124],[.218,.113,.055],[.287,.103,.02]);
}

const meshes = {};
for (const [type, build] of Object.entries({deck, crate:chest, cabin, planter, lantern, sail,
  person, casting:m=>person(m,true), wood, fiber, scrap, cache:m=>chest(m,.70), mooring})) {
  const m = new Mesh();
  build(m);
  meshes[type] = m.faces;
}

/** Draw at the supplied projected origin; callers own depth sorting and alpha. */
export function drawModel(ctx, project, type, opts={}) {
  const faces = meshes[type==='person' && opts.hook>.12 ? 'casting' : type];
  if (!faces) return;
  const palette = colors(opts.palette || {});
  const o = project(0,0,0), side = project(.5,-.5,0);
  const scale = Math.hypot(side.x-o.x,side.y-o.y)*2;
  const mirror = type==='person' && (opts.facing==='left' || opts.facing===-1);
  const night = opts.palette?.night || 0;
  if (night>.015 && (type==='lantern' || type==='cabin')) {
    const q = type==='lantern' ? project(0,0,.98) : project(.38,-.018,.335);
    const r = scale * (type==='lantern' ? .32 : .22);
    const glow = ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,r);
    glow.addColorStop(0,`rgba(255,202,127,${.40*night})`);
    glow.addColorStop(.45,`rgba(255,210,148,${.14*night})`);
    glow.addColorStop(1,'rgba(255,218,148,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(q.x-r,q.y-r,r*2,r*2);
  }
  ctx.lineJoin='round';
  ctx.lineCap='round';
  for (const f of faces) {
    ctx.beginPath();
    for(let i=0;i<f.pts.length;i++) {
      const v=f.pts[i], pt=project(v[0],v[1],v[2]);
      const x=mirror ? o.x*2-pt.x : pt.x;
      if(i===0) ctx.moveTo(x,pt.y);
      else ctx.lineTo(x,pt.y);
    }
    if (f.width) {
      ctx.strokeStyle=palette[f.color];
      ctx.lineWidth=Math.max(.44,scale*f.width);
      ctx.stroke();
    } else {
      ctx.closePath();
      ctx.fillStyle=palette[f.color];
      ctx.fill();
    }
  }
}
