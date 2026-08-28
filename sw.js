const CACHE='adhome-presentes-v051-1';
const SHELL=['./','./index.html','./styles.css?v=046','./reset041.js?v=046','./app1a.js?v=046','./app1b.js?v=046','./app2.js?v=046','./app3.js?v=046','./app4.js?v=046','./app5.js?v=046','./app6.js?v=046','./app7.js?v=046','./app8.js?v=046','./app10.js?v=046','./app11.js?v=046','./app12.js?v=046','./app13.js?v=051','./app14.js?v=050','./app15.js?v=050','./app16.js?v=050','./app17.js?v=051','./manifest.webmanifest','./logo.png','./icon-192.png','./icon-512.png','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js','https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js','https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);for(const u of SHELL){try{await c.add(u)}catch{}}self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith((async()=>{const cached=await caches.match(e.request);try{const fresh=await fetch(e.request);if(fresh&&fresh.status<400){const c=await caches.open(CACHE);c.put(e.request,fresh.clone()).catch(()=>{})}return fresh}catch{if(cached)return cached;if(e.request.mode==='navigate'){const home=await caches.match('./');if(home)return home}return new Response('Sin conexión',{status:503})}})())});

self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let data={};try{data=event.data?.json()||{}}catch{data={title:'ADHOME · Nuevo pedido',body:event.data?.text()||''}}
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const visible=windows.find(c=>c.visibilityState==='visible');
    const jobs=[];
    if(visible)jobs.push(Promise.resolve(visible.postMessage({type:'PUSH_ORDER',data})));
    if('setAppBadge'in self.navigator)jobs.push(self.navigator.setAppBadge().catch(()=>{}));
    jobs.push(self.registration.showNotification(data.title||'ADHOME · Nuevo pedido',{
      body:data.body||'Se cargó un nuevo pedido.',
      icon:'./icon-192.png',
      badge:'./icon-192.png',
      tag:data.pedido_id?`pedido-${data.pedido_id}`:'nuevo-pedido',
      renotify:true,
      vibrate:[180,70,180],
      data:{url:data.url||'./',pedido_id:data.pedido_id||null}
    }));
    await Promise.allSettled(jobs);
  })());
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    try{if('clearAppBadge'in self.navigator)await self.navigator.clearAppBadge()}catch{}
    const target=new URL(event.notification.data?.url||'./',self.registration.scope).href;
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of windows){if('focus'in c){await c.focus();if('navigate'in c)try{await c.navigate(target)}catch{}return}}
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
