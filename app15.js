// PRESENTES 2026 CLOUD V0.4.9 - preferencia de alertas por usuario
let defaultPushCheckedV15=false;

function pushOptoutKeyV15(){return session?.user?.id?`presentes_push_optout_${session.user.id}`:''}

function showDefaultPushPromptV15(permission){
  let box=document.getElementById('defaultPushPromptV15');
  if(!box){
    box=document.createElement('div');box.id='defaultPushPromptV15';
    box.style.cssText='position:fixed;z-index:9998;left:12px;right:12px;top:86px;max-width:560px;margin:auto;background:#fff8df;border:1px solid #e1b94f;border-radius:12px;padding:11px 13px;box-shadow:0 8px 24px rgba(0,0,0,.16)';
    document.body.appendChild(box);
  }
  if(permission==='denied'){
    box.innerHTML='<b>🔕 Alertas requeridas para este usuario</b><div class="tiny" style="margin-top:4px">El navegador tiene las notificaciones bloqueadas. Habilitalas en los permisos del sitio y luego tocá “Alertas”.</div><button class="btn" style="margin-top:8px">Entendido</button>';
    box.querySelector('button').onclick=()=>box.remove();
  }else{
    box.innerHTML='<b>🔔 Alertas activadas por defecto</b><div class="tiny" style="margin-top:4px">Este usuario está configurado para recibir avisos de nuevos pedidos. Falta autorizar las notificaciones en este dispositivo.</div><button class="btn primary" style="margin-top:8px">Activar alertas ahora</button>';
    box.querySelector('button').onclick=async()=>{try{await registerPushV14();localStorage.removeItem(pushOptoutKeyV15());box.remove()}catch(e){toast(e.message||String(e))}};
  }
}

async function silentRegisterPreferredPushV15(){
  if(!session?.user||Notification.permission!=='granted')return false;
  if(!('serviceWorker'in navigator)||!('PushManager'in window))return false;
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToUint8V14(VAPID_PUBLIC_V14)});
  const j=sub.toJSON(),keys=j.keys||{};
  const {error}=await sb.rpc('registrar_push_subscription',{p_endpoint:j.endpoint,p_p256dh:keys.p256dh,p_auth:keys.auth,p_user_agent:navigator.userAgent});
  if(error)throw error;
  localStorage.setItem('presentes_push_enabled','1');
  localStorage.removeItem(pushOptoutKeyV15());
  await syncPushButtonV14();
  const b=document.getElementById('pushBtnV14');if(b)b.title='Alertas activadas por defecto para este usuario';
  document.getElementById('defaultPushPromptV15')?.remove();
  return true;
}

async function applyDefaultPushPreferenceV15(){
  if(defaultPushCheckedV15||!session?.user)return;
  defaultPushCheckedV15=true;
  try{
    const {data,error}=await sb.from('profiles').select('push_alerts_default').eq('id',session.user.id).maybeSingle();
    if(error||!data?.push_alerts_default)return;
    const optout=localStorage.getItem(pushOptoutKeyV15())==='1';
    if(optout)return;
    ensurePushButtonV14();
    const b=document.getElementById('pushBtnV14');if(b){b.style.fontWeight='700';b.title='Alertas activadas por defecto para este usuario'}
    if(Notification.permission==='granted')await silentRegisterPreferredPushV15();
    else showDefaultPushPromptV15(Notification.permission);
  }catch(e){console.warn('Preferencia push',e)}
}

// Si el usuario decide desactivar en un dispositivo, respetamos esa decisión localmente.
const disablePushBaseV15=disablePushV14;
disablePushV14=async function(){await disablePushBaseV15();const k=pushOptoutKeyV15();if(k)localStorage.setItem(k,'1')};
const registerPushBaseV15=registerPushV14;
registerPushV14=async function(){const r=await registerPushBaseV15();const k=pushOptoutKeyV15();if(k)localStorage.removeItem(k);return r};

(()=>{let tries=0;const t=setInterval(()=>{tries++;if(session?.user){clearInterval(t);applyDefaultPushPreferenceV15()}else if(tries>80)clearInterval(t)},250)})();
