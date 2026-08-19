// PRESENTES 2026 CLOUD V0.5.0 - categorias ordenadas + optimizacion iOS Mariano
const IOS_MARIANO_EMAIL_V16='mgonzalez@adesal.com.ar';

function isIOSDeviceV16(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
}
function isStandaloneV16(){
  return window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
}
function isMarianoIOSV16(){
  return isIOSDeviceV16()&&String(session?.user?.email||'').trim().toLowerCase()===IOS_MARIANO_EMAIL_V16;
}

// Garantiza que Top categorias quede siempre de mayor a menor por venta s/IVA.
function parseMoneyFromCategoryV16(el){
  const t=String(el.querySelector('.meta')?.textContent||'');
  const part=t.split('·').pop()||'';
  const m=part.match(/-?[0-9][0-9.\s]*(?:,[0-9]+)?/);
  if(!m)return 0;
  const s=m[0].replace(/\s/g,'').replace(/\./g,'').replace(',','.');
  return Number(s)||0;
}
function parseUnitsFromCategoryV16(el){
  const t=String(el.querySelector('.meta')?.textContent||'');
  const m=t.match(/([0-9]+(?:[.,][0-9]+)?)\s*u\./i);
  return m?Number(m[1].replace(',','.'))||0:0;
}
function sortCategoriesV16(){
  const box=document.getElementById('topCats');if(!box)return;
  const rows=[...box.querySelectorAll(':scope > .result')];
  rows.sort((a,b)=>parseMoneyFromCategoryV16(b)-parseMoneyFromCategoryV16(a)||parseUnitsFromCategoryV16(b)-parseUnitsFromCategoryV16(a)||String(a.querySelector('b')?.textContent||'').localeCompare(String(b.querySelector('b')?.textContent||''),'es'));
  rows.forEach(r=>box.appendChild(r));
}
const loadDashBaseV16=loadDash;
loadDash=async function(...args){const r=await loadDashBaseV16(...args);sortCategoriesV16();return r};

function installIOSStyleV16(){
  if(document.getElementById('iosMarianoStyleV16'))return;
  const s=document.createElement('style');s.id='iosMarianoStyleV16';
  s.textContent=`
body.ios-mariano-v16{-webkit-text-size-adjust:100%;overscroll-behavior-y:none}
body.ios-mariano-v16 .top{padding-top:calc(9px + env(safe-area-inset-top));padding-left:calc(12px + env(safe-area-inset-left));padding-right:calc(12px + env(safe-area-inset-right))}
body.ios-mariano-v16 main{padding-left:calc(12px + env(safe-area-inset-left));padding-right:calc(12px + env(safe-area-inset-right));padding-bottom:calc(112px + env(safe-area-inset-bottom))}
body.ios-mariano-v16 .nav{padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);padding-bottom:max(8px,env(safe-area-inset-bottom))}
body.ios-mariano-v16 .fabscan{bottom:calc(82px + env(safe-area-inset-bottom))}
body.ios-mariano-v16 input,body.ios-mariano-v16 select,body.ios-mariano-v16 textarea{font-size:16px!important}
body.ios-mariano-v16 .btn,body.ios-mariano-v16 .nav button,body.ios-mariano-v16 .qty button{min-height:44px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
body.ios-mariano-v16 .modalbox{max-height:calc(100dvh - env(safe-area-inset-top));padding-bottom:calc(22px + env(safe-area-inset-bottom))}
body.ios-mariano-v16 .top-left{min-width:0}
body.ios-mariano-v16 .top-user{max-width:100px}
body.ios-mariano-v16 #pushBtnV14{min-width:44px;padding-left:8px;padding-right:8px}
`;
  document.head.appendChild(s);
}

function showIOSInstallGuideV16(){
  if(!isMarianoIOSV16()||isStandaloneV16())return;
  document.getElementById('defaultPushPromptV15')?.remove();
  let box=document.getElementById('iosInstallGuideV16');
  if(!box){box=document.createElement('div');box.id='iosInstallGuideV16';box.style.cssText='position:fixed;z-index:10001;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom));max-width:520px;margin:auto;background:#fff;border:1px solid #d7dbe0;border-radius:16px;padding:14px 15px;box-shadow:0 14px 38px rgba(0,0,0,.24)';document.body.appendChild(box)}
  box.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px"><div><b>📲 ADHOME optimizada para iPhone</b><div class="tiny" style="margin-top:6px;line-height:1.45">Para recibir las alertas de pedidos en iPhone, usala como app: <b>Compartir ⬆️ → Añadir a pantalla de inicio → Añadir</b>. Después abrí ADHOME desde el nuevo ícono y activá las notificaciones una sola vez.</div></div><button type="button" class="close" aria-label="Cerrar">×</button></div>';
  box.querySelector('button').onclick=()=>box.remove();
}

async function clearIOSBadgeV16(){
  if(!isMarianoIOSV16())return;
  try{if('clearAppBadge'in navigator)await navigator.clearAppBadge()}catch{}
}

async function openOrderFromPushURLV16(){
  if(!isMarianoIOSV16()||!session?.user)return;
  const u=new URL(location.href),id=u.searchParams.get('pedido');if(!id)return;
  try{
    const {data,error}=await sb.from('pedidos').select('*,pedido_items(*)').eq('id',id).maybeSingle();
    if(error||!data)return;
    document.querySelector('[data-v="pedidos"]')?.click();
    openOrder(data,false);
    u.searchParams.delete('pedido');history.replaceState({},'',u.pathname+(u.searchParams.toString()?`?${u.searchParams}`:'')+u.hash);
  }catch{}
}

function applyMarianoIOSV16(){
  if(!isMarianoIOSV16())return;
  installIOSStyleV16();document.body.classList.add('ios-mariano-v16');
  if(!isStandaloneV16()){
    document.getElementById('defaultPushPromptV15')?.remove();
    ensurePushButtonV14();
    const b=document.getElementById('pushBtnV14');if(b){b.textContent='📲 Instalar';b.title='Agregar ADHOME a la pantalla de inicio';b.onclick=showIOSInstallGuideV16}
    showIOSInstallGuideV16();
  }else{
    const b=document.getElementById('pushBtnV14');
    if(b&&Notification.permission==='granted')b.textContent='🔔 ON';
    clearIOSBadgeV16();
    setTimeout(openOrderFromPushURLV16,300);
  }
}

document.addEventListener('visibilitychange',()=>{if(!document.hidden)clearIOSBadgeV16()});
window.addEventListener('focus',clearIOSBadgeV16);

(()=>{let tries=0;const t=setInterval(()=>{tries++;if(session?.user){clearInterval(t);applyMarianoIOSV16();setTimeout(applyMarianoIOSV16,900)}else if(tries>80)clearInterval(t)},250)})();
