export class ForegroundClock {
  last = null;
  pause() { this.last = null; }
  tick(now,active) {
    if (!active) { this.pause(); return 0; }
    const dt = this.last === null ? 0 : Math.max(0,Math.min(.1,(now-this.last)/1000));
    this.last = now;
    return dt;
  }
}
export function timeOfDay(elapsed,balance) {
  const fraction = elapsed / balance.daySeconds;
  const phase = fraction % 1;
  const index = balance.phases.findIndex((p,i) => i > 0 && phase < p)-1;
  return {day:Math.floor(fraction)+1,phase,index,label:['白昼','黄昏','夜晚','黎明'][index]};
}
const stops = [
  ['#82bfbe','#a8d7d0','#d8b58a','#f5ebdd','#789b83','#f8e6b3','#a47855','#ce7558','#527c7c',0],
  ['#889bb8','#b3c2d4','#e6bf91','#f3d9bb','#899c89','#ffe1a6','#a57c6c','#cc8270','#616e8b',.2],
  ['#233f59','#7495b3','#726b78','#8e9aa8','#4e7774','#ffd795','#615b6b','#826775','#354458',1]
];
export function mix(a,b,t) {
  const f=parseInt(a.slice(1),16), e=parseInt(b.slice(1),16);
  const c = shift => Math.round(((f>>shift)&255)*(1-t)+((e>>shift)&255)*t);
  return '#'+((1<<24)+(c(16)<<16)+(c(8)<<8)+c(0)).toString(16).slice(1);
}
export function paletteAt(elapsed,balance) {
  const {phase:p} = timeOfDay(elapsed,balance);
  const [,dusk,night,dawn] = balance.phases;
  const keys = [[0,0],[dusk-.06,0],[dusk+.04,1],[night+.025,2],[dawn,2],[1,0]];
  const i=keys.findIndex(([v])=>v>p);
  const [p0,a]=keys[i-1], [p1,b]=keys[i];
  const f=(p-p0)/(p1-p0), t=f*f*(3-2*f);
  return Object.fromEntries(['sea','wave','deck','wall','leaf','light','wood','roof','shade','night'].map((k,j)=>
    [k,j===9 ? stops[a][j]*(1-t)+stops[b][j]*t : mix(stops[a][j],stops[b][j],t)]));
}
