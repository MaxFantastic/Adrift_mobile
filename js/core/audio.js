export class Chimes {
  constructor(){this.muted=false;this.ctx=null;}
  unlock(){
    if(this.muted)return;
    try {const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      this.ctx ||= new Audio();if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
    }catch{}
  }
  play(kind){
    if(this.muted||!this.ctx||this.ctx.state!=='running')return;
    const notes={tap:[392],collect:[587,880],build:[392,494,587],remove:[440,330]}[kind]||[392];
    try{notes.forEach((hz,i)=>{
      const t=this.ctx.currentTime+i*.056,o=this.ctx.createOscillator(),g=this.ctx.createGain();
      o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.052,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.23);
      o.connect(g);g.connect(this.ctx.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start(t);o.stop(t+.25);
    });}catch{}
  }
}
