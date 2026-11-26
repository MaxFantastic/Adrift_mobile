// Keep this release list atomic. tests/release.test.js checks its completeness.
const VERSION='0.1.0';
const SCOPE=self.registration.scope;
const PREFIX='adrift:'+SCOPE+':runtime:';
const CACHE=PREFIX+VERSION;
const FILES=[
  'index.html','css/main.css','manifest.webmanifest','assets/icon-192.png','assets/icon-512.png',
  'data/balance.json','data/items.json','data/buildings.json','data/release.json',
  'js/main.js','js/core/engine.js','js/core/clock.js','js/core/state.js','js/core/save.js','js/core/audio.js','js/core/updates.js',
  'js/systems/building.js','js/systems/resource.js','js/ui/icons.js','js/ui/touch.js','js/ui/panels.js',
  'js/render/camera.js','js/render/models.js','js/render/ocean.js','js/render/sprites.js','js/render/scene.js','js/render/character.js'
];
const urls=new Set(FILES.map(f=>new URL(f,SCOPE).href));
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll([...urls].map(url=>new Request(url,{cache:'reload'})));
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    await Promise.all((await caches.keys()).filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type!=='activate')return;
  event.waitUntil((async()=>{
    const clients=await self.clients.matchAll({includeUncontrolled:true,type:'window'});
    const target=new URL(SCOPE);
    const others=clients.some(c=>c.id!==event.source?.id&&new URL(c.url).origin===target.origin&&c.url.startsWith(SCOPE));
    event.ports[0]?.postMessage({ok:!others});
    if(!others)await self.skipWaiting();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  // version.json intentionally falls through to the client's no-store network request.
  const shell=req.mode==='navigate'&&(url.pathname===new URL(SCOPE).pathname||url.pathname===new URL('index.html',SCOPE).pathname);
  if(!shell&&!urls.has(url.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    return await cache.match(shell?new URL('index.html',SCOPE).href:req)||fetch(req);
  })());
});
