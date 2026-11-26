import {Ocean} from './ocean.js';
import {Sprites} from './sprites.js';
import {paletteAt} from '../core/clock.js';
import {Walker} from './character.js';
const order=(a,b)=>a.x+a.y-(b.x+b.y)||a.x-b.x;
const byDepth=tiles=>[...tiles].sort(order);
const coverTiles=byDepth([
  [-1,-1,'cabin'],[0,-1,'sail'],[1,-1,'planter'],[-1,0,'planter'],[0,0,null],[1,0,'crate'],
  [-1,1,'lantern'],[0,1,null],[1,1,null],[2,0,null]
].map(([x,y,buildingId])=>({x,y,buildingId})));
function ellipse(ctx,x,y,rx,ry,fill) {
  ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
}
function poly(ctx,pts,fill,stroke) {
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
function ripple(ctx,p,u,t,pale) {
  ctx.save();ctx.lineCap='round';ctx.strokeStyle=pale;
  for(let i=0;i<2;i++){
    const f=(t*.23+i*.5)%1;
    ctx.globalAlpha=(1-f)*.65;ctx.lineWidth=Math.max(.7,u*.009);
    ctx.beginPath();ctx.ellipse(p.x,p.y,u*(.22+f*.24),u*(.055+f*.075),-.03,.1,2.5);ctx.stroke();
    ctx.beginPath();ctx.ellipse(p.x+u*.03,p.y,u*(.24+f*.27),u*(.044+f*.09),-.03,3.2,5.35);ctx.stroke();
  }
  ctx.restore();
}
function compass(ctx,x,y,r) {
  ctx.save();ctx.translate(x,y);ctx.strokeStyle='rgba(32,83,79,.46)';ctx.fillStyle='#365f59';ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(0,0,r*.72,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(0,-r*.68);ctx.lineTo(0,-r*(i%2?.82:1));ctx.stroke();}
  const pts=(a,b,c)=>[a,b,c].map(([x,y])=>({x,y}));
  poly(ctx,pts([0,-r*1.04],[-r*.16,2],[0,0]),'#ac644a');poly(ctx,pts([0,-r*1.04],[r*.16,2],[0,0]),'#e9dfbf');
  poly(ctx,pts([0,r*.9],[-r*.15,0],[0,0]),'#446e68');poly(ctx,pts([0,r*.9],[r*.15,0],[0,0]),'#d3dfc7');
  ctx.font='13px Georgia';ctx.fillStyle='#345f59';ctx.textAlign='center';ctx.fillText('N',0,-r-5);ctx.restore();
}
export class Scene {
  constructor(canvas,camera,cfg) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.camera=camera;this.cfg=cfg;
    this.ocean=new Ocean();this.sprites=new Sprites();this.walker=new Walker();this.hitList=[];this.animations=[];
    this.time=0;this.palTime=-Infinity;this.palette=paletteAt(0,cfg.balance);
    this.resize();
  }
  resize() {
    const r=this.canvas.getBoundingClientRect(), dpr=Math.min(this.cfg.balance.dprCap,window.devicePixelRatio||1);
    this.camera.resize(r.width,r.height);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  reset(){this.animations=[];this.walker.reset();this.palTime=-Infinity;}
  built(id,x,y){this.animations.push({id,x,y,t:0});}
  coverCamera() {
    const {width:w,height:h}=this.camera;
    const tall=w<=680&&h>w;
    const u=tall?Math.min(w*.238,h*.135):Math.min(w*.158,h*.27,214);
    const ox=w*(tall?.506:.704), oy=h*(tall?.56:.568);
    return {unit:u,project:(x,y,z=0)=>({x:ox+(x-y)*u*.5,y:oy+(x+y)*u*.25-z*u*.87+Math.sin(this.time*.85)*1.5})};
  }
  render(dt,state,drift,cover,motion,tool) {
    const ctx=this.ctx, cam=this.camera,w=cam.width,h=cam.height;
    if(motion)this.time+=dt;
    const elapsed=cover?0:state.clock.elapsedSeconds;
    if(Math.abs(elapsed-this.palTime)>=.5){this.palette=paletteAt(elapsed,this.cfg.balance);this.palTime=elapsed;}
    const palette=this.palette,time=motion?this.time:0;
    cam.bob=motion?Math.sin(time*.9)*1.7:0;
    this.ocean.draw(ctx,{width:w,height:h,time,palette,cover,panX:-(cam.cx-cam.cy)*cam.unit/2,panY:-(cam.cx+cam.cy)*cam.unit/4,zoom:cam.zoom,motion});
    this.hitList.length=0;
    const view=cover?this.coverCamera():cam,u=view.unit;
    const tiles=cover?coverTiles:byDepth(state.raft.tiles);
    const p=(x,y,z=0)=>view.project(x,y,z);
    const task=cover?null:state.survival.task;
    if(!cover){
      this.walker.update(dt,tiles,motion);
      for(const a of this.animations)a.t+=dt;
      this.animations=this.animations.filter(a=>a.t<this.cfg.balance.buildSeconds);
    }
    const visible=q=>q.x>-u&&q.x<w+u&&q.y>-u&&q.y<h+2*u;
    const live=tiles.filter(t=>visible(p(t.x,t.y)));
    // A single filled outline lets adjacent shadows meet without dark seams.
    ctx.save();ctx.fillStyle='rgba(37,87,81,.18)';ctx.shadowColor='rgba(44,88,82,.20)';ctx.shadowBlur=Math.min(14,u*.07);
    ctx.beginPath();
    for(const t of live){
      const q=p(t.x,t.y,-.17), x=q.x+u*.14,y=q.y+u*.07;
      ctx.moveTo(x,y-u*.255);ctx.lineTo(x+u*.51,y);ctx.lineTo(x,y+u*.255);ctx.lineTo(x-u*.51,y);ctx.closePath();
    }
    ctx.fill();ctx.restore();
    // Low, broken wakes follow exposed hull edges and breathe with the swell.
    const occupancy=new Set(tiles.map(t=>t.x+','+t.y));
    const empty=(x,y)=>!occupancy.has(x+','+y);
    ctx.save();ctx.lineCap='round';ctx.strokeStyle=palette.wave;ctx.lineWidth=Math.max(.9,u*.010);
    for(const t of live){
      if(!empty(t.x,t.y+1)&&!empty(t.x+1,t.y))continue;
      const q=p(t.x,t.y,-.20);
      ctx.globalAlpha=.52+.18*Math.sin(time+t.x+t.y);
      for(const side of [-1,1]){
        if(side<0?!empty(t.x,t.y+1):!empty(t.x+1,t.y))continue;
        ctx.beginPath();ctx.moveTo(q.x+side*u*.47,q.y+u*.05);
        ctx.quadraticCurveTo(q.x+side*u*.31,q.y+u*.155,q.x+side*u*.12,q.y+u*.215);ctx.stroke();
      }
    }
    ctx.restore();
    const floats=cover?[]:drift.objects;
    const drawFloat=o=>{
      const q=p(o.x,o.y,-.12);q.y+=Math.sin(time*1.2+o.seed)*1.5;
      ripple(ctx,q,u*.78,time+o.seed,palette.wave);
      ellipse(ctx,q.x+u*.038,q.y+u*.033,u*.20,u*.048,'rgba(44,87,82,.15)');
      this.sprites.at(ctx,o.type,q,u*1.15,palette);
    };
    for(const o of byDepth(floats))drawFloat(o);
    // Opaque hulls cover passing flotsam. All facilities stand above the floor.
    const lift=(x,y,id)=>{
      const a=this.animations.find(v=>v.x===x&&v.y===y&&v.id===id);
      return a&&motion?-.21*(1-a.t/this.cfg.balance.buildSeconds)**2:0;
    };
    for(const t of live){
      const at=p(t.x,t.y,lift(t.x,t.y,'deck'));
      const box=this.sprites.at(ctx,'deck',at,u,palette);this.hitList.push({tile:t,box});
    }
    for(const t of live)if(t.buildingId){
      const q=p(t.x,t.y);
      ellipse(ctx,q.x+u*.10,q.y+u*.04,u*(t.buildingId==='lantern'?.19:.37),u*.105,'rgba(72,68,54,.14)');
    }
    if(tool&&!cover){
      const outline=(x,y,color,stroke)=>{
        const corners=[[-.48,-.48],[.48,-.48],[.48,.48],[-.48,.48]].map(([a,b])=>p(x+a,y+b,.006));
        ctx.lineWidth=1.5;poly(ctx,corners,color,stroke);
      };
      for(const t of tool.cells)outline(t.x,t.y,'rgba(170,239,213,.36)','#488b7a');
      const s=tool.selected;if(s)outline(s.x,s.y,tool.reason?'rgba(241,158,133,.65)':'rgba(189,255,225,.78)',tool.reason?'#a34d39':'#266e60');
    }
    const shore=tiles.at(-1);
    const swimming=task?.id==='gather';
    const fishing=task?.id==='fish'||task?.id==='netFish';
    const actor=cover?{x:.63,y:.82}:swimming?{x:shore.x+.30+Math.sin(time*.7)*.36,y:shore.y+1.14}:
      fishing?{x:shore.x+.23,y:shore.y+.27}:this.walker;
    const figures=live.filter(t=>t.buildingId).map(t=>({...t,type:t.buildingId}));
    figures.push({...actor,type:'person'});
    if(cover)figures.push({x:2.27,y:.22,type:'mooring'},{x:1.22,y:1.27,type:'mooring'});
    if(!cover && empty(0,2))figures.push({x:-.35,y:1.36,type:'mooring',scale:.73});
    for(const a of byDepth(figures)){
      const swimmer=swimming&&a.type==='person';
      const q=p(a.x,a.y,swimmer?-.33+Math.sin(time*2)*.028:lift(a.x,a.y,a.type));
      if(!visible(q))continue;
      if(swimmer){
        ctx.save();ctx.beginPath();ctx.rect(0,0,w,q.y-u*.19);ctx.clip();
      }else if(a.type==='person')ellipse(ctx,q.x+u*.04,q.y+u*.02,u*.13,u*.047,'rgba(69,64,51,.17)');
      const box=this.sprites.at(ctx,a.type,q,u*(a.scale||1),palette,{hook:a.type==='person'&&fishing,mirror:a.type==='person'&&!cover&&!fishing&&this.walker.left});
      if(swimmer){
        ctx.restore();ripple(ctx,{x:q.x,y:q.y-u*.19},u*.72,time,palette.wave);
      }
      if(a.type!=='person'&&a.type!=='mooring')this.hitList.push({tile:a,box,facility:true});
    }
    if(tool?.selected&&!tool.reason&&tool.id!=='remove'){
      const {x,y}=tool.selected;ctx.save();ctx.globalAlpha=.64;this.sprites.at(ctx,tool.id,p(x,y,.055),u,palette);ctx.restore();
    }
    if(task?.id==='build'){
      const {x,y,item}=task.target;
      ctx.save();ctx.globalAlpha=.3;this.sprites.at(ctx,item,p(x,y,.045),u,palette);ctx.restore();
    }
    if(fishing){
      const hand=p(actor.x,actor.y,.29), tip=p(actor.x+.55,actor.y-.24,.56);
      const float=p(actor.x+1.0,actor.y+.12,-.14+Math.sin(time*1.8)*.014);
      if(task.id==='netFish'){
        ctx.strokeStyle=palette.wall;ctx.lineWidth=.85;ctx.beginPath();ctx.moveTo(hand.x,hand.y);
        ctx.quadraticCurveTo(float.x+u*.12,hand.y+u*.25,float.x,float.y);ctx.stroke();
        ctx.save();ctx.translate(float.x,float.y);ctx.scale(1,.55);
        ctx.fillStyle=palette.shade;ctx.globalAlpha=.30;ctx.beginPath();ctx.arc(0,0,u*.24,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=.78;ctx.stroke();ctx.clip();
        for(let i=-2;i<=2;i++){
          const x=i*u*.095;
          ctx.beginPath();ctx.moveTo(x-u*.24,-u*.24);ctx.lineTo(x+u*.24,u*.24);
          ctx.moveTo(x+u*.24,-u*.24);ctx.lineTo(x-u*.24,u*.24);ctx.stroke();
        }
        ctx.restore();
      }else{
        ctx.lineWidth=Math.max(1,u*.017);ctx.strokeStyle=palette.wood;
        ctx.beginPath();ctx.moveTo(hand.x,hand.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();
        ctx.lineWidth=.8;ctx.strokeStyle=palette.wall;ctx.beginPath();ctx.moveTo(tip.x,tip.y);
        ctx.quadraticCurveTo(float.x+u*.09,tip.y+u*.12,float.x,float.y);ctx.stroke();
        ellipse(ctx,float.x,float.y,Math.max(2,u*.026),Math.max(1.4,u*.022),palette.roof);
      }
      ripple(ctx,float,u*.33,time,palette.wave);
    }
    if(cover){
      const a=p(1.22,1.27,.17),b=p(2.27,.22,.17);
      ctx.strokeStyle='#d9c5a2';ctx.lineWidth=Math.max(1,u*.010);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2+u*.16,b.x,b.y);ctx.stroke();
      const tall=w<=680&&h>w;
      compass(ctx,w*(tall?.865:.91),h*(tall?.80:.817),tall?18:26);
      if(!tall&&w>860){
        const end=p(2.15,.0);ctx.save();ctx.strokeStyle='rgba(38,80,74,.52)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(end.x+11,end.y+18);ctx.lineTo(end.x+34,end.y+41);ctx.lineTo(end.x+62,end.y+41);ctx.stroke();ellipse(ctx,end.x+11,end.y+18,2.1,2.1,'#49786a');ctx.font='13px "Microsoft YaHei",sans-serif';ctx.fillStyle='#375d55';ctx.fillText('家园预览',end.x+67,end.y+45);ctx.restore();
      }
    }
    if(cover||empty(1,2)){
      const r=p(1,1.52,-.01);
      ctx.save();ctx.translate(r.x,r.y);ctx.transform(.94,.46,-.04,.86,0,0);ctx.lineWidth=u*.045;
      for(let i=0;i<8;i++){ctx.strokeStyle=i%2?palette.wall:palette.roof;ctx.beginPath();ctx.arc(0,0,u*.087,i*Math.PI/4,(i+1)*Math.PI/4+.015);ctx.stroke();}
      ctx.restore();
    }
    if(!cover&&motion&&elapsed<state.survival.rainUntil){
      ctx.save();ctx.strokeStyle=palette.wall;ctx.globalAlpha=.28;ctx.lineWidth=1;ctx.beginPath();
      for(let i=0;i<42;i++){
        const x=(i*137.1+time*44)%w,y=(i*89.7+time*355)%h;
        ctx.moveTo(x,y);ctx.lineTo(x-3,y+13);
      }
      ctx.stroke();ctx.restore();
    }
  }
  hit(x,y) {
    for(let i=this.hitList.length-1;i>=0;i--){
      const obj=this.hitList[i];
      if(this.sprites.hit(obj.box,x,y))return obj;
    }
    return null;
  }
}
