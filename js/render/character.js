import {tileAt,neighbors} from '../systems/building.js';
export class Walker {
  constructor(){this.reset();}
  reset(){this.x=0;this.y=1;this.cell={x:0,y:1};this.goal=null;this.rest=2.4;this.left=false;}
  update(dt,tiles,motion) {
    const walkable=(x,y)=>{const t=tileAt(tiles,x,y);return t&&!t.buildingId;};
    if(!walkable(this.cell.x,this.cell.y)){
      const empty=tiles.find(t=>!t.buildingId);
      if(!empty){this.goal=null;this.x=1.38;this.y=1.36;return;}
      this.cell={x:empty.x,y:empty.y};this.x=empty.x;this.y=empty.y;this.goal=null;
    }
    if(this.goal&&!walkable(this.goal.x,this.goal.y)){this.goal=null;this.x=this.cell.x;this.y=this.cell.y;}
    if(!motion)return;
    if(this.goal){
      const dx=this.goal.x-this.x,dy=this.goal.y-this.y,length=Math.hypot(dx,dy);
      const step=dt*.58;
      if(length<=step){this.cell=this.goal;this.x=this.goal.x;this.y=this.goal.y;this.goal=null;this.rest=2+Math.random()*5;}
      else{this.x+=dx*step/length;this.y+=dy*step/length;this.left=dx-dy<0;}
    }else if((this.rest-=dt)<=0){
      const cells=neighbors(this.cell.x,this.cell.y).filter(([x,y])=>walkable(x,y));
      if(cells.length){const [x,y]=cells[Math.floor(Math.random()*cells.length)];this.goal={x,y};}
      this.rest=3;
    }
  }
}
