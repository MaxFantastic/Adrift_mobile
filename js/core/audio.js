export class Chimes {
  constructor(){this.muted=false;this.ctx=null;this.waves=null;}
  setActive(active){
    if(!this.ctx)return;
    const amp=active&&!this.muted ? .16 : 0;
    this.waves?.gain.setTargetAtTime(amp,this.ctx.currentTime,.18);
  }
  unlock(){
    if(this.muted){this.setActive(false);return;}
    try {const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
      this.ctx ||= new Audio();
      if(!this.waves)this.makeWaves();
      this.setActive(!document.hidden);
      if(this.ctx.state!=='running' && this.ctx.state!=='closed')this.ctx.resume().catch(()=>{});
    }catch{}
  }
  makeWaves(){
    const ctx=this.ctx, rate=ctx.sampleRate, seconds=12;
    const buffer=ctx.createBuffer(1,rate*seconds,rate);
    const samples=buffer.getChannelData(0);
    let surge=0,foam=0;
    for(let i=0;i<samples.length;i++){
      const white=Math.random()*2-1, time=i/rate;
      surge=.956*surge+.044*white;
      foam=.65*foam+.35*white;
      const crest=Math.pow(.5+.5*Math.sin(time*2*Math.PI/6-1.2),2.3);
      const seam=Math.min(1,time*3,(seconds-time)*3);
      samples[i]=(.29*surge+(.045+.18*crest)*foam)*seam*(.5+.5*crest);
    }
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();
    const gain=ctx.createGain();
    source.buffer=buffer;source.loop=true;
    filter.type='lowpass';filter.frequency.value=1050;filter.Q.value=.25;
    gain.gain.value=0;
    source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
    source.start();
    this.waves=gain;
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
