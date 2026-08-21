const SUPA_URL='https://uakqtfggbiicmutifqrj.supabase.co';
const SUPA_KEY='sb_publishable_5owhbnD1dTCUjaFSFcJC0A_Akgxxgzl';
const INTERNAL_EMAIL='presentes-visor@adhome.com.ar';
const REGISTER_URL=SUPA_URL+'/functions/v1/presentes-register';
const sb=window.supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(Number(n||0));
const num=n=>new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}).format(Number(n||0));
const pct=n=>new Intl.NumberFormat('es-AR',{maximumFractionDigits:1}).format(Number(n||0))+'%';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let refreshTimer=null,busy=false;

function msg(t=''){ $('#loginMsg').textContent=t }
async function login(){
  const password=$('#password').value;
  msg('');
  if(password.length<6)return msg('Ingresá una contraseña de al menos 6 caracteres.');
  $('#loginBtn').disabled=true;
  try{
    const {data,error}=await sb.auth.signInWithPassword({email:INTERNAL_EMAIL,password});
    if(error)throw error;
    await enterViewer(data.session);
  }catch(e){msg(e.message||'No se pudo ingresar.')}finally{$('#loginBtn').disabled=false}
}
async function firstAccess(){
  const password=$('#password').value;
  msg('');
  if(password.length<6)return msg('Elegí una contraseña de al menos 6 caracteres.');
  $('#firstBtn').disabled=true;
  try{
    const r=await fetch(REGISTER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:INTERNAL_EMAIL,password})});
    const d=await r.json();
    if(!r.ok)throw Error(d.error||'No se pudo crear el acceso.');
    msg('Contraseña creada. Ingresando…');
    await login();
  }catch(e){
    const text=String(e.message||e);
    if(/ya existe|already|registered/i.test(text))msg('El usuario PRESENTES ya tiene contraseña. Usá “Ingresar”.');
    else msg(text);
  }finally{$('#firstBtn').disabled=false}
}
async function enterViewer(session){
  if(!session)return;
  const {data:profile,error}=await sb.from('profiles').select('id,full_name,email,role,active').eq('id',session.user.id).single();
  if(error||!profile?.active||profile.role!=='visor'){
    await sb.auth.signOut();
    throw Error('Este acceso no está habilitado como visor.');
  }
  $('#login').classList.add('hidden');$('#viewer').classList.remove('hidden');
  await loadDashboard();
  clearInterval(refreshTimer);refreshTimer=setInterval(loadDashboard,30000);
}
async function loadDashboard(){
  if(busy)return;busy=true;$('#refreshBtn').disabled=true;
  try{
    const {data,error}=await sb.rpc('dashboard_visor_presentes');
    if(error)throw error;
    render(data||{});
    $('#updated').textContent='Actualizado '+new Date(data.generated_at||Date.now()).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
  }catch(e){
    $('#updated').textContent='Error al actualizar';
    if(!$('#kpis').children.length)$('#kpis').innerHTML=`<div class="error-state">${esc(e.message||String(e))}</div>`;
  }finally{busy=false;$('#refreshBtn').disabled=false}
}
function kpi(label,value,sub=''){return `<article class="kpi"><small>${esc(label)}</small><b>${value}</b>${sub?`<span>${esc(sub)}</span>`:''}</article>`}
function render(d){
  const s=d.summary||{},orders=Number(s.pedidos||0),units=Number(s.unidades||0),covered=Number(s.unidades_cubiertas||0),pending=Number(s.unidades_pendientes||0);
  const coverage=units?covered/units*100:0;
  $('#kpis').innerHTML=[
    kpi('Ventas s/IVA',money(s.ventas_sin_iva),'Venta registrada en la feria'),
    kpi('Pedidos',num(orders),`${num(s.confirmados)} confirmados${Number(s.pendientes_estado)?' · '+num(s.pendientes_estado)+' pendientes':''}`),
    kpi('Unidades',num(units),`${num(s.skus_vendidos)} SKU distintos vendidos`),
    kpi('Clientes',num(s.clientes),`${num(s.clientes_nuevos)} altas en feria`),
    kpi('Ticket promedio',money(s.ticket_promedio),'Promedio por pedido'),
    kpi('Cobertura stock',pct(coverage),`${num(pending)} u. a fabricar`)
  ].join('');

  $('#coverageLabel').textContent=pct(coverage)+' cubierto';
  $('#coverageBar').style.width=Math.max(0,Math.min(100,coverage))+'%';
  $('#productionTotals').innerHTML=`<div><small>PEDIDO</small><b>${num(units)} u.</b></div><div><small>CUBIERTO STOCK</small><b>${num(covered)} u.</b></div><div><small>A FABRICAR</small><b>${num(pending)} u.</b></div>`;
  $('#productivity').innerHTML=[
    ['Pico pedidos / hora',num(s.pico_pedidos_hora)],
    ['Líneas de pedido',num(s.lineas_pedido)],
    ['SKU vendidos',num(s.skus_vendidos)],
    ['Mov. stock por ventas',num(s.movimientos_stock_venta)],
    ['Clientes nuevos',num(s.clientes_nuevos)],
    ['Pedidos centralizados',num(s.pedidos)]
  ].map(([a,b])=>`<div><small>${esc(a)}</small><b>${b}</b></div>`).join('');

  renderBars('#sellers',d.vendedores||[],x=>x.vendedor,x=>Number(x.venta),x=>`${num(x.pedidos)} ped. · ${num(x.unidades)} u.`,x=>money(x.venta));
  renderBars('#categories',(d.categorias||[]).slice(0,10),x=>x.categoria,x=>Number(x.venta),x=>`${num(x.unidades)} u.`,x=>money(x.venta));
  renderBars('#days',d.por_dia||[],x=>x.dia,x=>Number(x.venta),x=>`${num(x.pedidos)} ped. · ${num(x.unidades)} u.`,x=>money(x.venta));
  renderBars('#hours',(d.por_hora||[]).slice(-12),x=>x.hora,x=>Number(x.venta),x=>`${num(x.pedidos)} ped. · ${num(x.unidades)} u.`,x=>money(x.venta));

  const prod=(d.produccion||[]).filter(x=>Number(x.a_fabricar)>0).slice(0,14);
  $('#production').innerHTML=prod.length?`<div class="production-table"><table><thead><tr><th>SKU</th><th>Artículo</th><th>Pedido</th><th>Cubierto</th><th>A fabricar</th></tr></thead><tbody>${prod.map(x=>`<tr><td>${esc(x.sku)}</td><td><b>${esc(x.producto)}</b><br><span>${esc(x.categoria)}</span></td><td>${num(x.pedido)}</td><td>${num(x.cubierto)}</td><td class="danger">${num(x.a_fabricar)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No hay necesidades de fabricación pendientes.</div>';

  const products=(d.productos_top||[]).slice(0,10);
  $('#products').innerHTML=products.length?`<div class="list">${products.map(x=>`<div class="list-row"><div><b>${esc(x.producto)}</b><span>${esc(x.categoria)} · ${num(x.unidades)} u.${Number(x.pendiente)?' · '+num(x.pendiente)+' a fabricar':''}</span></div><div class="right"><b>${money(x.venta)}</b><span>s/IVA</span></div></div>`).join('')}</div>`:'<div class="empty">Sin datos.</div>';

  const recent=d.ultimos||[];
  $('#recent').innerHTML=recent.length?`<div class="recent-grid">${recent.map(x=>`<div class="recent-item"><b>Pedido #${esc(x.numero)}</b><span>${new Date(x.fecha).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span><span>${esc(x.vendedor||'Sin vendedor')}</span><span><strong>${num(x.unidades)} u. · ${money(x.venta)}</strong></span>${Number(x.pendiente)?`<span class="danger">${num(x.pendiente)} u. a fabricar</span>`:'<span class="ok">Cubierto sin faltante</span>'}</div>`).join('')}</div>`:'<div class="empty">Sin pedidos.</div>';
}
function renderBars(sel,arr,label,val,sub,fmt){
  const el=$(sel);if(!arr.length){el.innerHTML='<div class="empty">Sin datos.</div>';return}
  const max=Math.max(1,...arr.map(val));
  el.innerHTML=arr.map(x=>`<div class="bar-row"><div class="bar-label"><b>${esc(label(x))}</b><span>${esc(sub(x))}</span></div><div class="bar-track"><i style="width:${Math.max(2,Math.round(val(x)/max*100))}%"></i></div><div class="bar-value">${fmt(x)}</div></div>`).join('');
}

$('#loginBtn').onclick=login;$('#firstBtn').onclick=firstAccess;$('#password').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
$('#refreshBtn').onclick=loadDashboard;$('#logoutBtn').onclick=async()=>{clearInterval(refreshTimer);await sb.auth.signOut();location.reload()};
window.addEventListener('online',loadDashboard);
(async()=>{const {data:{session}}=await sb.auth.getSession();if(session){try{await enterViewer(session)}catch(e){msg(e.message)}}})();
