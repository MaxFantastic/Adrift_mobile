export function bindGestures(canvas,camera,limit,onTap,enabled) {
  const pointers=new Map();let suppressed=false;
  const pos=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
  const pair=()=>{const [a,b]=[...pointers.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};};
  canvas.addEventListener('pointerdown',e=>{
    if(!enabled() || (e.pointerType==='mouse' && e.button!==0))return;
    const p=pos(e);
    if(!pointers.size)suppressed=false;else suppressed=true;
    pointers.set(e.pointerId,{...p,start:p});
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    const old=pointers.get(e.pointerId);if(!old)return;
    const before=pointers.size===2?pair():null, p=pos(e);
    const dx=p.x-old.x,dy=p.y-old.y;
    if(!suppressed&&Math.hypot(p.x-old.start.x,p.y-old.start.y)>limit)suppressed=true;
    Object.assign(old,p);
    if(!enabled())return;
    if(before){const after=pair();camera.pan(after.x-before.x,after.y-before.y);camera.zoomAt(after.d/before.d,after.x,after.y);}
    else if(suppressed&&pointers.size===1)camera.pan(dx,dy);
  });
  canvas.addEventListener('pointerup',e=>{
    const old=pointers.get(e.pointerId),p=pos(e);
    if(old && enabled() && !suppressed && Math.hypot(p.x-old.start.x,p.y-old.start.y)<=limit)onTap(p.x,p.y);
    pointers.delete(e.pointerId);
  });
  for(const name of ['pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{pointers.delete(e.pointerId);suppressed=true;});
  canvas.addEventListener('wheel',e=>{
    if(!enabled())return;e.preventDefault();
    const p=pos(e);camera.zoomAt(Math.exp(-Math.max(-300,Math.min(300,e.deltaY*(e.deltaMode===1?16:1)))*.0018),p.x,p.y);
  },{passive:false});
}
