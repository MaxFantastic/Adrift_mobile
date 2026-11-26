// The shore, submerged reefs and their contours are painted once per light/size change.
// All coordinates exposed by Ocean.draw are CSS pixels, and time is measured in seconds.
const TAU = Math.PI * 2;
const BLEED = 24;

function randomField(seed) {
  let bits = seed >>> 0;
  return () => {
    bits = (Math.imul(bits, 1664525) + 1013904223) >>> 0;
    return bits / 4294967296;
  };
}

function rgb(hex) {
  let s = String(hex || '#82bfbe').replace('#', '');
  if (s.length === 3) s = s.split('').map(c => c + c).join('');
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function tint(from, to, amount) {
  const a = rgb(from), b = rgb(to);
  return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * amount)).join(',') + ')';
}

function polygon(ctx, points, color) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

function wash(ctx, x, y, width, height, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width, height);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

// A submerged bank viewed obliquely. Scaling the same perimeter produces
// water-depth contours which follow the rock instead of parallel screen lines.
function bank(ctx, ox, oy, sx, sy, rotation, night, variation) {
  ctx.save();
  ctx.translate(ox, oy);
  ctx.rotate(rotation);
  ctx.scale(sx, sy);
  const light = 1 - night * .44;
  for (const [scale, opacity] of [[1,.09],[.86,.085],[.69,.1],[.50,.08]]) {
    ctx.save();
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(-1.03, -.08);
    ctx.bezierCurveTo(-.99,-.33, -.7,-.34, -.53,-.54);
    ctx.bezierCurveTo(-.31,-.8, -.67,-.94, -.23,-1.01);
    ctx.bezierCurveTo(.07,-1.12, .37,-.8, .52,-.62);
    ctx.bezierCurveTo(.68,-.47, .67,-.28, .87,-.12);
    ctx.bezierCurveTo(1.15,.13, .91,.42, .68,.51);
    ctx.bezierCurveTo(.42,.64, .62,.82, .22,.94);
    ctx.bezierCurveTo(-.05,1.11, -.51,.76, -.66,.68);
    ctx.bezierCurveTo(-.98,.45, -.85,.22, -1.03,-.08);
    ctx.closePath();
    ctx.fillStyle = variation ? 'rgba(207,235,195,' + opacity * light + ')' : 'rgba(35,128,136,' + opacity * light + ')';
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function currentLine(ctx, x, y, length, bend, alpha, wave) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = wave;
  ctx.lineWidth = .85;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + length * .33, y + bend, x + length * .64, y - bend * .34, x + length, y - bend);
  ctx.stroke();
  ctx.restore();
}

// Low submerged fronds painted as tapered ribbons. Cluster placement keeps
// their silhouettes peripheral and visually separate from collectible seaweed.
function reef(ctx, x, y, scale, seed, night) {
  const rng = randomField(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = .48 - night * .12;
  wash(ctx, 0, 6, 64, 24, 'rgba(46,111,115,.22)');
  for (let i = 0; i < 7; i++) {
    const px = (rng() - .5) * 79, py = (rng() - .5) * 13;
    const r = 4 + rng() * 14;
    polygon(ctx, [[px-r,py],[px-r*.53,py-r*.42],[px+r*.19,py-r*.64],[px+r,py],[px+r*.22,py+r*.31]], 'rgba(53,119,121,.43)');
    polygon(ctx, [[px-r*.53,py-r*.42],[px+r*.19,py-r*.64],[px+r,py],[px+r*.04,py-r*.11]], 'rgba(177,214,189,.53)');
  }
  for (let i = 0; i < 11; i++) {
    const px = (rng() - .5) * 66, py = (rng() - .5) * 15;
    const h = 9 + rng() * 18, lean = (rng() - .35) * h * .72;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.quadraticCurveTo(px + lean - 4, py - h * .66, px + lean, py - h);
    ctx.quadraticCurveTo(px + lean + 2, py - h * .42, px + 1.4, py + .3);
    ctx.fillStyle = i % 3 ? 'rgba(42,125,120,.40)' : 'rgba(209,220,173,.55)';
    ctx.fill();
  }
  ctx.restore();
}

function limestone(ctx, x, y, w, h, color) {
  const {top, face, side, split, edge} = color;
  const p = (ax, ay) => [x + ax*w, y + ay*h];
  // Each exposed plane shares vertices with its neighbour.
  polygon(ctx, [p(-.51,.01),p(-.45,-.65),p(-.23,-.75),p(.01,-.63),p(.02,.25),p(-.29,.15)], face);
  polygon(ctx, [p(.01,-.63),p(.28,-.72),p(.43,-.61),p(.5,-.04),p(.02,.25)], side);
  polygon(ctx, [p(-.45,-.65),p(-.22,-.98),p(.11,-1.06),p(.28,-.95),p(.43,-.61),p(.15,-.56),p(.01,-.63),p(-.23,-.75)], top);
  polygon(ctx, [p(.11,-1.06),p(.28,-.95),p(.43,-.61),p(.15,-.56)], edge);
  polygon(ctx, [p(-.45,-.65),p(-.34,-.6),p(-.29,.15),p(-.51,.01)], split);
  polygon(ctx, [p(.23,-.59),p(.27,-.61),p(.34,.07),p(.31,.09)], split);
}

function islet(ctx, x, y, size, night, sea, wave) {
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(size,size);
  const color = {
    top: tint('#e0d8bd', '#668892', night),
    edge: tint('#c6c7ae', '#456879', night),
    face: tint('#c6bcb0', '#496578', night),
    side: tint('#9faeac', '#39576a', night),
    split: tint('#afb0a4', '#496776', night)
  };
  wash(ctx, 8, 7, 65, 20, 'rgba(36,102,106,.20)');
  ellipse(ctx, 9, 4, 42, 9, tint(sea, '#62a59e', .28));
  limestone(ctx, -28, -1, 13, 6, color);
  limestone(ctx, -14, -4, 26, 20, color);
  limestone(ctx, 6, -6, 29, 41, color);
  limestone(ctx, 22, 1, 22, 15, color);
  limestone(ctx, -7, 3, 17, 9, color);
  limestone(ctx, 39, 7, 8, 4, color);
  // Small mineral ledges at the waterline and two distant breakers.
  currentLine(ctx,-35,4,17,.8,.7,wave);
  currentLine(ctx,11,8,24,-.5,.75,wave);
  currentLine(ctx,31,10,16,1,.6,wave);
  ctx.restore();
}

function paintField(ctx, w, h, sea, wave, night, cover) {
  const mobile = w < 650;
  const base = ctx.createLinearGradient(0, 0, w*.87, h);
  base.addColorStop(0, tint(sea, '#dae8cf', .39-.31*night));
  base.addColorStop(.42, tint(sea, '#b7dbc9', .12 * (1-night)));
  base.addColorStop(1, tint(sea, '#347b84', .36 * (1-night) + .13));
  ctx.fillStyle = base;
  ctx.fillRect(-BLEED,-BLEED,w+BLEED*2,h+BLEED*2);

  wash(ctx, w*.16, h*.30, w*.61, h*.77, 'rgba(234,242,212,' + (.24*(1-night)) + ')');
  wash(ctx, w*.55, h*.88, w*.55, h*.62, 'rgba(47,135,136,.12)');
  // These banks reach beyond the canvas like a cropped sheet of a larger sea.
  bank(ctx, w*.91, -h*.07, w*.42, h*.35, -.14, night, true);
  bank(ctx,-w*.13, h*1.15, w*.49, h*.35, .17, night, true);
  bank(ctx, w*1.09, h*.89, w*.29, h*.32, -.2, night, false);
  const reefScale = Math.max(.6, Math.min(1.45, Math.min(w/810,h/570)));
  reef(ctx, w*.97,h*.72,reefScale*1.13,931,night);
  reef(ctx, w*.12,h*.91,reefScale*.76,571,night);
  reef(ctx, w*.60,h*.08,reefScale*.56,433,night);

  const rng = randomField(662102);
  const groups = Math.min(135, Math.max(36, Math.round(w*h/9400)));
  for (let i = 0; i < groups; i++) {
    const x = rng()*(w+40)-20, y = rng()*(h+40)-20;
    // Short strokes travel in small shoals. They taper at both ends.
    const span = rng()*20+8;
    const alpha = .14 + rng()*.25;
    const n = Math.floor(rng()*4)+1;
    for (let j=0; j<n; j++) {
      const ax=x+(rng()-.5)*span*2, ay=y+(rng()-.5)*12;
      const length = 3+rng()*span;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = wave;
      ctx.beginPath();
      ctx.moveTo(ax,ay);
      ctx.quadraticCurveTo(ax+length*.38,ay-1.3,ax+length,ay-1);
      ctx.quadraticCurveTo(ax+length*.43,ay+1,ax,ay);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  if (cover) {
    const ix = w*(mobile ? .91 : .885), iy = h*(mobile ? .18 : .215);
    const s = Math.max(.55,Math.min(1.36,Math.min(w/650,h/530)));
    bank(ctx,ix,iy+3,72*s,20*s,-.11,night,true);
    islet(ctx,ix,iy,s,night,sea,wave);
  }
}

export class Ocean {
  constructor() {
    this.surface = null;
    this.fieldKey = '';
    this.glints = [];
    const rng = randomField(190351);
    for (let i=0; i<42; i++) {
      this.glints.push({x:rng(),y:rng(),phase:rng()*TAU,speed:.28+rng()*.27,length:4+rng()*14});
    }
  }

  draw(ctx, {width, height, time=0, palette={}, cover=false, panX=0, panY=0, zoom=1, motion=true}) {
    if (!(width>0 && height>0)) return;
    const sea = palette.sea || '#82bfbe', wave = palette.wave || '#a8d7d0';
    const night = Math.max(0,Math.min(1,palette.night || 0));
    const w = Math.ceil(width), h = Math.ceil(height);
    // Ocean haze needs fewer physical pixels than the buildings drawn above it.
    const resolution = Math.min(1.35, 1800/Math.max(w,h), globalThis.devicePixelRatio || 1);
    const key = [w,h,resolution,sea,wave,Math.round(night*22),cover].join('|');
    if (this.fieldKey !== key) {
      if (!this.surface) this.surface = document.createElement('canvas');
      const bw = Math.ceil((w+BLEED*2)*resolution), bh = Math.ceil((h+BLEED*2)*resolution);
      if (this.surface.width !== bw || this.surface.height !== bh) {
        this.surface.width = bw;
        this.surface.height = bh;
      }
      const layer = this.surface.getContext('2d',{alpha:false});
      layer.setTransform(resolution,0,0,resolution,BLEED*resolution,BLEED*resolution);
      paintField(layer,w,h,sea,wave,night,cover);
      this.fieldKey = key;
    }
    const dx = cover ? 0 : Math.tanh(panX/400)*18;
    const dy = cover ? 0 : Math.tanh(panY/300)*14;
    ctx.drawImage(this.surface,dx-BLEED,dy-BLEED,w+BLEED*2,h+BLEED*2);
    const t = motion ? time : 0;
    const count = Math.min(this.glints.length, Math.max(11, Math.ceil(w*h/24500)));
    const scale = Math.max(.73,Math.min(1.24,Math.sqrt(zoom)));
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.15;
    ctx.strokeStyle = tint(wave,'#fff8d8',.35*(1-night));
    for (let i=0; i<count; i++) {
      const g = this.glints[i], a = g.phase+t*g.speed;
      const k = .5 + .5*Math.sin(a);
      const x = g.x*w + dx + 3*Math.sin(a*.55);
      const y = g.y*h + dy + Math.cos(a*.71)*1.25;
      const l = (g.length + 5*k)*scale;
      ctx.globalAlpha = .08 + .48*k*k;
      ctx.beginPath();
      ctx.moveTo(x-l*.5,y+.7);
      ctx.quadraticCurveTo(x-l*.12,y+1.15,x+l*.33,y-.1);
      ctx.stroke();
      if (i%7===0 && k>.79) {
        const radius=(k-.79)*13;
        ctx.fillStyle = ctx.strokeStyle;
        polygon(ctx,[[x,y-radius],[x+.7,y-.5],[x+radius*1.55,y],[x+.7,y+.5],[x,y+radius],[x-.7,y+.5],[x-radius*1.55,y],[x-.7,y-.5]],ctx.fillStyle);
      }
    }
    ctx.restore();
  }
}
