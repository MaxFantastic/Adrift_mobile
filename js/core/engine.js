import {ForegroundClock} from './clock.js';
export class Engine {
  constructor({frame,save,interval}) {
    this.frame=frame;this.save=save;this.interval=interval;this.sinceSave=0;this.raf=0;this.clock=new ForegroundClock();this.nextFrame=0;
    this.tick=this.tick.bind(this);
    document.addEventListener('visibilitychange',()=>document.hidden?this.pause():this.run());
    window.addEventListener('pagehide',()=>this.pause());
    window.addEventListener('pageshow',()=>this.run());
  }
  run(){
    if(this.raf||document.hidden)return;
    this.clock.pause();this.nextFrame=0;this.raf=requestAnimationFrame(this.tick);
  }
  pause(){
    cancelAnimationFrame(this.raf);this.raf=0;this.clock.pause();this.save();
  }
  tick(now) {
    this.raf=0;if(document.hidden)return;
    if(now+.4<this.nextFrame){this.raf=requestAnimationFrame(this.tick);return;}
    this.nextFrame=Math.max(this.nextFrame+1000/60,now);
    const dt=this.clock.tick(now,true);
    const active=this.frame(dt);
    if(active){this.sinceSave+=dt;if(this.sinceSave>=this.interval){this.sinceSave=0;this.save();}}
    this.raf=requestAnimationFrame(this.tick);
  }
}
