import {drawModel} from './models.js';

// Render vector artwork once per material/light change. Panning, bobbing and
// zooming only composite the local sprites, including on a 64-tile raft.
const UNIT=232;
const frames={
 deck:[.51,.27,.45],person:[.25,.48,.065],cabin:[.51,.88,.26],lantern:[.36,1.23,.10],
 sail:[.50,1.37,.22],crate:[.38,.53,.19],planter:[.47,.70,.22],
 wood:[.27,.14,.15],fiber:[.31,.28,.15],scrap:[.25,.18,.16],cache:[.31,.40,.15],mooring:[.26,.35,.15]
};
export class Sprites {
  constructor(){this.cache=new Map();this.materials='';}
  sprite(type,palette,hook=false){
    const key=[palette.deck,palette.wall,palette.leaf,palette.sea,Math.round(palette.night*32)].join('/');
    if(key!==this.materials){this.cache.clear();this.materials=key;}
    const id=type+(hook?'*':'');
    if(this.cache.has(id))return this.cache.get(id);
    const [half,up,down]=frames[type], pad=5;
    const image=document.createElement('canvas');
    const ox=Math.ceil(half*UNIT)+pad,oy=Math.ceil(up*UNIT)+pad;
    image.width=ox*2;image.height=oy+Math.ceil(down*UNIT)+pad;
    const ctx=image.getContext('2d',{willReadFrequently:true});
    drawModel(ctx,(x,y,z)=>({x:ox+(x-y)*UNIT*.5,y:oy+(x+y)*UNIT*.25-z*UNIT*.87}),type,{palette,hook:hook?1:0});
    const data={image,ox,oy,mask:null};this.cache.set(id,data);return data;
  }
  at(ctx,type,p,u,palette,opts={}){
    const s=this.sprite(type,palette,opts.hook);
    const f=u/UNIT, x=p.x-s.ox*f,y=p.y-s.oy*f;
    if(opts.mirror){ctx.save();ctx.translate(p.x*2,0);ctx.scale(-1,1);}
    ctx.drawImage(s.image,x,y,s.image.width*f,s.image.height*f);
    if(opts.mirror)ctx.restore();
    return {s,x,y,f};
  }
  hit(box,x,y) {
    const {s,f}=box;
    const a=Math.floor((x-box.x)/f), b=Math.floor((y-box.y)/f);
    if(a<0||b<0||a>=s.image.width||b>=s.image.height)return false;
    s.mask ||= s.image.getContext('2d').getImageData(0,0,s.image.width,s.image.height).data;
    return s.mask[(b*s.image.width+a)*4+3]>65;
  }
}
export function thumbnail(canvas,type,palette) {
  const dpr=Math.min(2,window.devicePixelRatio||1),w=78,h=78;
  canvas.width=w*dpr;canvas.height=h*dpr;
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const unit=type==='sail'||type==='lantern'?45:58;
  const oy=type==='deck'?40:type==='crate'||type==='planter'?50:61;
  drawModel(ctx,(x,y,z)=>({x:w/2+(x-y)*unit/2,y:oy+(x+y)*unit/4-z*unit*.87}),type,{palette});
}
