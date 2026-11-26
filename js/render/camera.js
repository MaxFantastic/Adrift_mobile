export class Camera {
  constructor(range) { this.range=range; this.zoom=1; this.cx=.5; this.cy=.5; this.width=0; this.height=0; this.bob=0; }
  resize(w,h) {
    this.width=w; this.height=h;
    this.base=Math.min(118,Math.max(58,Math.min(w*.21,h*.175)));
    this.anchorX=w*.5; this.anchorY=h*.53;
  }
  get unit() { return this.base*this.zoom; }
  project(x,y,z=0) {
    const u=this.unit, a=x-this.cx, b=y-this.cy;
    return {x:this.anchorX+(a-b)*u*.5,y:this.anchorY+(a+b)*u*.25-z*u*.87+this.bob};
  }
  world(sx,sy) {
    const x=(sx-this.anchorX)/this.unit, y=(sy-this.anchorY-this.bob)/this.unit;
    return {x:this.cx+x+2*y,y:this.cy-x+2*y};
  }
  tile(sx,sy) {const p=this.world(sx,sy);return {x:Math.round(p.x)||0,y:Math.round(p.y)||0};}
  pan(dx,dy) {
    this.cx-=(dx+2*dy)/this.unit; this.cy-=(-dx+2*dy)/this.unit;
    this.cx=Math.max(-18,Math.min(18,this.cx)); this.cy=Math.max(-18,Math.min(18,this.cy));
  }
  zoomAt(factor,x,y) {
    const p=this.world(x,y);
    this.zoom=Math.max(this.fitMinimum??this.range[0],Math.min(this.range[1],this.zoom*factor));
    const q=this.world(x,y); this.cx+=p.x-q.x; this.cy+=p.y-q.y;
  }
  reset(tiles) {
    const a=tiles.map(t=>t.x-t.y), b=tiles.map(t=>t.x+t.y);
    const middle=v=>(Math.max(...v)+Math.min(...v))/2;
    this.cx=(middle(a)+middle(b))/2; this.cy=(middle(b)-middle(a))/2;
    const width=(Math.max(...a)-Math.min(...a)+2)*.5*this.base;
    const height=(Math.max(...b)-Math.min(...b)+2)*.25*this.base;
    this.zoom=Math.min(1,this.width*.82/width,this.height*.48/(height+this.base*1.4));
    this.fitMinimum=Math.min(this.range[0],this.zoom);
  }
}
