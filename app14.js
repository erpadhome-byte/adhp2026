// PRESENTES 2026 CLOUD V0.4.8 - Push + alerta sonora de nuevos pedidos
const VAPID_PUBLIC_V14='BGPWTQtNcXbtygJs6b5BYBv5C8d54EGjYXtXbxWCsqVoU1jXo4uEMlNnYOYSppBI7KmQg1aFVB0JKlgFUzsHK08';
let alertChannelV14=null, audioCtxV14=null;
const alertedOrdersV14=new Map();

function b64ToUint8V14(s){
  const pad='='.repeat((4-s.length%4)%4),base=(s+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base),out=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;
}
function primeAudioV14(){
  try{audioCtxV14=audioCtxV14||new (window.AudioContext||window.webkitAudioContext)();if(audioCtxV14.state==='suspended')audioCtxV14.resume()}catch{}
}
function soundV14(){
  try{
    primeAudioV14();if(!audioCtxV14)return;
    const now=audioCtxV14.currentTime;
    [0,0.18].forEach((d,i)=>{const o=audioCtxV14.createOscillator(),g=audioCtxV14.createGain();o.type='sine';o.frequency.value=i?880:660;g.gain.setValueAtTime(0.0001,now+d);g.gain.exponentialRampToValueAtTime(0.15,now+d+0.015);g.gain.exponentialRampToValueAtTime(0.0001,now+d+0.14);o.connect(g);g.connect(audioCtxV14.destination);o.start(now+d);o.stop(now+d+0.15)});
  }catch{}
  try{navigator.vibrate?.([180,70,180])}catch{}
}
function moneyV14(n){return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(n||0))}
function dedupeAlertV14(id){
  if(!id)return false;const now=Date.now(),last=alertedOrdersV14.get(id)||0;alertedOrdersV14.set(id,now);
  for(const [k,v] of alertedOrdersV14)if(now-v>30000)alertedOrdersV14.delete(k);
  return now-last<8000;
}
function showOrderAlertV14(o){
  const id=o.id||o.pedido_id;if(dedupeAlertV14(id))return;
  soundV14();
  let box=document.getElementById('newOrderAlertV14');
  if(!box){box=document.createElement('div');box.id='newOrderAlertV14';box.style.cssText='position:fixed;z-index:10000;left:12px;right:12px;top:12px;max-width:560px;margin:auto;background:#fff;border:2px solid #17365d;border-radius:14px;padding:13px 15px;box-shadow:0 12px 35px rgba(0,0,0,.24);cursor:pointer';document.body.appendChild(box)}
  const numero=o.numero||'',cliente=o.cliente_nombre_snapshot||o.cliente||'Sin cliente',unidades=Number(o.unidades||0),pend=Number(o.unidades_pendientes||0),venta=Number(o.neto_sin_iva||0);
  box.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px"><div><b style="font-size:16px;color:#17365d">🛒 Nuevo pedido #${esc(numero)}</b><div style="margin-top:4px"><b>${esc(cliente)}</b></div><div class="tiny muted" style="margin-top:3px">${unidades} u. · ${moneyV14(venta)} s/IVA${pend?` · <b style="color:#b54708">${pend} a fabricar</b>`:''}</div></div><button type="button" style="border:0;background:none;font-size:22px;line-height:1" aria-label="Cerrar">×</button></div>`;
  box.classList.remove('hidden');
  const close=()=>{box.classList.add('hidden')};
  box.querySelector('button').onclick=e=>{e.stopPropagation();close()};
  box.onclick=async()=>{close();try{await loadOrders();const ord=lastOrders.find(x=>x.id===id);if(ord){document.querySelector('[data-v="pedidos"]')?.click();openOrder(ord,false)}}catch{}};
  clearTimeout(box._timer);box._timer=setTimeout(close,9000);
}

function ensurePushButtonV14(){
  if(document.getElementById('pushBtnV14'))return;
  const logout=document.getElementById('logout');if(!logout)return;
  const b=document.createElement('button');b.id='pushBtnV14';b.className='btn';b.style.cssText='padding:7px 9px;white-space:nowrap';b.textContent='🔔 Alertas';b.onclick=togglePushV14;logout.insertAdjacentElement('beforebegin',b);
}
async function currentPushV14(){
  if(!('serviceWorker'in navigator)||!('PushManager'in window))return null;
  const reg=await navigator.serviceWorker.ready;return await reg.pushManager.getSubscription();
}
async function syncPushButtonV14(){
  ensurePushButtonV14();const b=document.getElementById('pushBtnV14');if(!b)return;
  if(!('Notification'in window)||!('PushManager'in window)){b.textContent='🔕 Sin push';b.disabled=true;return}
  try{const sub=await currentPushV14();if(sub&&Notification.permission==='granted'){b.textContent='🔔 Alertas ON';b.style.fontWeight='700'}else{b.textContent='🔔 Alertas';b.style.fontWeight=''}}catch{b.textContent='🔔 Alertas'}
}
async function registerPushV14(){
  if(!session)throw Error('Ingresá a la app primero.');
  if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw Error('Este navegador no admite notificaciones push.');
  const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
  if(isiOS&&!standalone)throw Error('En iPhone/iPad primero agregá ADHOME a la pantalla de inicio y abrila desde el ícono. Luego activá Alertas.');
  primeAudioV14();
  const perm=await Notification.requestPermission();if(perm!=='granted')throw Error('Las notificaciones no fueron autorizadas en este dispositivo.');
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToUint8V14(VAPID_PUBLIC_V14)});
  const j=sub.toJSON(),keys=j.keys||{};
  const {error}=await sb.rpc('registrar_push_subscription',{p_endpoint:j.endpoint,p_p256dh:keys.p256dh,p_auth:keys.auth,p_user_agent:navigator.userAgent});if(error)throw error;
  localStorage.setItem('presentes_push_enabled','1');
  await syncPushButtonV14();
  showOrderAlertV14({id:'TEST-'+Date.now(),numero:'✓',cliente_nombre_snapshot:'Alertas activadas correctamente',unidades:0,neto_sin_iva:0});
}
async function disablePushV14(){
  const sub=await currentPushV14();if(sub){try{await sb.rpc('desregistrar_push_subscription',{p_endpoint:sub.endpoint})}catch{}try{await sub.unsubscribe()}catch{}}
  localStorage.removeItem('presentes_push_enabled');await syncPushButtonV14();toast('Alertas desactivadas en este dispositivo.');
}
async function togglePushV14(){
  try{const sub=await currentPushV14();if(sub&&Notification.permission==='granted'){if(confirm('Las alertas están activas en este dispositivo.\n\n¿Querés desactivarlas?'))await disablePushV14();return}await registerPushV14()}catch(e){toast(e.message||String(e))}
}

function setupOrderAlertsV14(){
  if(!session||alertChannelV14)return;
  alertChannelV14=sb.channel('presentes-order-alerts-v14').on('postgres_changes',{event:'INSERT',schema:'public',table:'pedidos'},payload=>showOrderAlertV14(payload.new||{})).subscribe();
}

navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='PUSH_ORDER')showOrderAlertV14(e.data.data||{})});

(async()=>{
  try{if('serviceWorker'in navigator)await navigator.serviceWorker.register('./sw.js');}catch{}
  let tries=0;const t=setInterval(async()=>{tries++;if(session){clearInterval(t);ensurePushButtonV14();setupOrderAlertsV14();await syncPushButtonV14();try{if(localStorage.getItem('presentes_push_enabled')==='1'&&Notification.permission==='granted'){const sub=await currentPushV14();if(sub){const j=sub.toJSON(),keys=j.keys||{};await sb.rpc('registrar_push_subscription',{p_endpoint:j.endpoint,p_p256dh:keys.p256dh,p_auth:keys.auth,p_user_agent:navigator.userAgent})}}}catch{}}else if(tries>40)clearInterval(t)},250);
})();
