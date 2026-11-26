export class Drift {
  constructor(cfg,random=Math.random) { this.cfg=cfg; this.random=random; this.objects=[]; this.delay=0; this.serial=0; }
  interval() {const [a,b]=this.cfg.balance.spawnSeconds;return a+(b-a)*this.random();}
  add(type,p) {this.objects.push({id:++this.serial,type,x:p.x,y:p.y,seed:this.random()*6.28});}
  seed(camera) {
    this.objects=[]; this.delay=this.interval();
    for (const {type,u,v} of this.cfg.balance.startingDrops) {
      this.add(type,camera.world(camera.width*u,camera.height*v));
    }
  }
  weightedType() {
    const entries=Object.entries(this.cfg.items.drops);
    let r=this.random()*entries.reduce((sum,[,v])=>sum+v.weight,0);
    for (const [id,v] of entries) {r-=v.weight;if(r<=0)return id;}
    return entries.at(-1)[0];
  }
  update(dt,camera) {
    if (!dt) return;
    const {width:w,height:h}=camera, b=this.cfg.balance;
    const [vx,vy]=b.current;
    for (const o of this.objects) {o.x+=vx*dt; o.y+=vy*dt;}
    this.objects=this.objects.filter(o=>{const p=camera.project(o.x,o.y);return p.x>-w*.35&&p.y>-h*.35&&p.x<w*1.35&&p.y<h*1.35;});
    this.delay-=dt;
    if (this.delay<=0) {
      this.delay=this.interval();
      if(this.objects.length<b.maxFloats) {
        const left=this.random()<.6;
        const x=left ? this.random()*.22+.04 : .16+this.random()*.68;
        const y=left ? .28+this.random()*.40 : .23+this.random()*.06;
        this.add(this.weightedType(),camera.world(x*w,y*h));
      }
    }
  }
  collect(id,onReward) {
    const index=this.objects.findIndex(o=>o.id===id);
    if(index<0)return null;
    const [item]=this.objects.splice(index,1);
    onReward(item.type);
    return item;
  }
}
