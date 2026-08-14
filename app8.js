// PRESENTES 2026 CLOUD V0.4.1 - produccion, QR cliente y estados de pedido
const ACTIVE_ORDER_STATUSES_V8=['CONFIRMADO','PENDIENTE'];
let productionRowsV8=[];

// Los pedidos Pendiente siguen siendo pedidos vigentes: mantienen stock comprometido y cuentan en Dash/produccion.
allOrdersV5=async function(confirmedOnly=false){
  let q=sb.from('pedidos').select('*,pedido_items(*)').order('created_at',{ascending:false}).limit(5000);
  if(confirmedOnly)q=q.in('estado',ACTIVE_ORDER_STATUSES_V8);
  const {data,error}=await q;if(error)throw error;return data||[];
};

function statusBadgeV8(s){
  const pending=s==='PENDIENTE';
  return `<span class="badge" style="${pending?'background:#fff3cd;color:#7a5700':'background:#e8f5e9;color:#1f6b35'}">${pending?'Pendiente':'Confirmado'}</span>`;
}

renderOrders=function(){
  const q=($('#osearch').value||'').trim().toLowerCase();
  const arr=lastOrders.filter(o=>!q||String(o.numero).includes(q)||String(o.cliente_nombre_snapshot||'').toLowerCase().includes(q)||String(o.vendedor_nombre_snapshot||'').toLowerCase().includes(q)||String(o.estado||'').toLowerCase().includes(q));
  $('#orders').innerHTML=arr.map(o=>`<div class="order" data-oid="${o.id}"><div class="row"><div><b>Pedido ${o.numero}</b> ${statusBadgeV8(o.estado)}<div class="meta">${esc(o.cliente_nombre_snapshot||'Sin cliente')} · ${esc(o.vendedor_nombre_snapshot||'')} · ${new Date(o.created_at).toLocaleString('es-AR')}</div></div><div class="right"><b>${money(o.neto_sin_iva)}</b><div class="mini muted">s/IVA</div></div></div><div class="meta">${o.unidades} u.${o.unidades_pendientes?` · <span style="color:#b54708">${o.unidades_pendientes} pendientes de fabricar</span>`:''} · ${esc(o.forma_pago||'')} · ${esc(o.modalidad_entrega||'')}</div><div class="row" style="margin-top:8px;align-items:center"><span class="tiny muted">Estado</span><select data-status-order="${o.id}" style="width:auto;min-width:135px;margin:0"><option value="CONFIRMADO" ${o.estado==='CONFIRMADO'?'selected':''}>Confirmado</option><option value="PENDIENTE" ${o.estado==='PENDIENTE'?'selected':''}>Pendiente</option></select></div></div>`).join('')||'<div class="muted">Sin pedidos.</div>';
};

const ordersBoxV8=$('#orders');
if(ordersBoxV8){
  ordersBoxV8.addEventListener('click',e=>{if(e.target.closest('[data-status-order]'))e.stopPropagation()},true);
  ordersBoxV8.addEventListener('change',async e=>{
    const s=e.target.closest('[data-status-order]');if(!s)return;
    const id=s.dataset.statusOrder,estado=s.value;s.disabled=true;
    const {error}=await sb.rpc('cambiar_estado_pedido',{p_pedido_id:id,p_estado:estado});
    if(error){toast(error.message);s.disabled=false;await loadOrders();return}
    toast(`Pedido marcado como ${estado==='PENDIENTE'?'Pendiente':'Confirmado'}. El stock comprometido no se modifica.`);
    await Promise.all([loadOrders(),loadDash()]);
  });
}

function ensureProductionPanelV8(){
  if($('#productionPanelV8'))return;
  const kpis=$('#dash .kpis');if(!kpis)return;
  const panel=document.createElement('div');panel.id='productionPanelV8';panel.className='card';
  panel.innerHTML=`<div class="row" style="align-items:center"><div><div class="section-title">Resumen Pedidos / Producción</div><div class="tiny muted">Incluye pedidos Confirmados y Pendientes. Pendiente de fabricar es el faltante registrado al confirmar el pedido.</div></div><button id="prodExcelV8" class="btn" style="flex:0 0 auto">Exportar Excel</button></div><div class="kpis" style="margin:12px 0"><div class="kpi"><small>PEDIDO</small><b id="prodOrderedV8">0</b><span class="tiny muted">unidades</span></div><div class="kpi"><small>CUBIERTO STOCK</small><b id="prodCoveredV8">0</b><span class="tiny muted">unidades</span></div><div class="kpi"><small>A FABRICAR</small><b id="prodMakeV8">0</b><span class="tiny muted">unidades</span></div></div><div id="productionTableV8"></div>`;
  kpis.insertAdjacentElement('afterend',panel);
  $('#prodExcelV8').onclick=exportProductionV8;
}

async function productionDataV8(orders){
  const {data:products,error}=await sb.from('productos').select('sku,descripcion,tipo,producto,stock_disponible').eq('activo',true).limit(2000);
  if(error)throw error;
  const pmap=new Map((products||[]).map(p=>[String(p.sku||'').toUpperCase(),p]));
  const agg=new Map();
  orders.forEach(o=>(o.pedido_items||[]).forEach(i=>{
    const sku=String(i.sku||'').toUpperCase();
    if(!agg.has(sku))agg.set(sku,{Categoria:i.tipo_snapshot||'',SKU:i.sku||'',Articulo:i.descripcion_snapshot||'',Producto:i.producto_snapshot||'',Pedido:0,Cubierto_Stock:0,Pendiente_Fabricar:0,Stock_Actual:0});
    const r=agg.get(sku);r.Pedido+=Number(i.cantidad||0);r.Cubierto_Stock+=Number(i.cantidad_con_stock||0);r.Pendiente_Fabricar+=Number(i.cantidad_pendiente||0);
  }));
  const rows=[...agg.values()].map(r=>{const p=pmap.get(String(r.SKU||'').toUpperCase());return {...r,Categoria:r.Categoria||p?.tipo||'',Articulo:r.Articulo||p?.descripcion||'',Producto:r.Producto||p?.producto||'',Stock_Actual:Number(p?.stock_disponible||0)}}).sort((a,b)=>b.Pendiente_Fabricar-a.Pendiente_Fabricar||b.Pedido-a.Pedido||String(a.Articulo).localeCompare(String(b.Articulo),'es'));
  return rows;
}

function renderProductionV8(rows){
  productionRowsV8=rows;
  const ordered=rows.reduce((s,r)=>s+r.Pedido,0),covered=rows.reduce((s,r)=>s+r.Cubierto_Stock,0),make=rows.reduce((s,r)=>s+r.Pendiente_Fabricar,0);
  $('#prodOrderedV8').textContent=ordered;$('#prodCoveredV8').textContent=covered;$('#prodMakeV8').textContent=make;
  $('#productionTableV8').innerHTML=rows.length?`<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;min-width:780px"><thead><tr><th style="text-align:left;padding:7px;border-bottom:1px solid #ddd">Categoría</th><th style="text-align:left;padding:7px;border-bottom:1px solid #ddd">SKU</th><th style="text-align:left;padding:7px;border-bottom:1px solid #ddd">Artículo</th><th style="text-align:right;padding:7px;border-bottom:1px solid #ddd">Pedido</th><th style="text-align:right;padding:7px;border-bottom:1px solid #ddd">Cubierto stock</th><th style="text-align:right;padding:7px;border-bottom:1px solid #ddd">A fabricar</th><th style="text-align:right;padding:7px;border-bottom:1px solid #ddd">Stock actual</th></tr></thead><tbody>${rows.map(r=>`<tr><td style="padding:7px;border-bottom:1px solid #eee">${esc(r.Categoria)}</td><td style="padding:7px;border-bottom:1px solid #eee">${esc(r.SKU)}</td><td style="padding:7px;border-bottom:1px solid #eee"><b>${esc(r.Articulo)}</b></td><td style="text-align:right;padding:7px;border-bottom:1px solid #eee">${r.Pedido}</td><td style="text-align:right;padding:7px;border-bottom:1px solid #eee">${r.Cubierto_Stock}</td><td style="text-align:right;padding:7px;border-bottom:1px solid #eee"><b style="${r.Pendiente_Fabricar?'color:#b54708':''}">${r.Pendiente_Fabricar}</b></td><td style="text-align:right;padding:7px;border-bottom:1px solid #eee">${r.Stock_Actual}</td></tr>`).join('')}</tbody></table></div>`:'<div class="muted tiny">Todavía no hay pedidos de feria.</div>';
}

async function exportProductionV8(){
  try{
    const orders=await allOrdersV5(true),rows=await productionDataV8(orders),wb=XLSX.utils.book_new();
    const ordered=rows.reduce((s,r)=>s+r.Pedido,0),covered=rows.reduce((s,r)=>s+r.Cubierto_Stock,0),make=rows.reduce((s,r)=>s+r.Pendiente_Fabricar,0);
    addSheetV5(wb,'Resumen',[{Indicador:'Pedido total',Unidades:ordered},{Indicador:'Cubierto con stock',Unidades:covered},{Indicador:'Pendiente de fabricar',Unidades:make}],[28,16]);
    addSheetV5(wb,'Por SKU',rows,[18,24,42,24,14,18,20,16]);
    await shareBlobV5(workbookBlobV5(wb),'Produccion_ADHOME_Feria_Presentes_2026.xlsx','Producción ADHOME · Feria Presentes 2026');
  }catch(e){toast(e.message||String(e))}
}

loadDash=async function(){
  ensureProductionPanelV8();
  const {data,error}=await sb.from('pedidos').select('*,pedido_items(*)').in('estado',ACTIVE_ORDER_STATUSES_V8).order('created_at',{ascending:false}).limit(1200);
  if(error)return;
  const orders=data||[],d=dashDataV6(orders);
  $('#ksales').textContent=money(d.sales);$('#korders').textContent=d.orders;$('#kclients').textContent=d.clients;$('#kticket').textContent=money(d.ticket);$('#kunits').textContent=d.units;$('#kpending').textContent=d.pending;
  const maxSeller=d.sellers[0]?.[1]?.venta||0;$('#bySeller').innerHTML=d.sellers.map(([k,v])=>dashBarV6(k,v,maxSeller)).join('')||'<div class="muted tiny">Sin ventas.</div>';
  const today=new Date().toLocaleDateString('es-AR'),todayHours=d.hours.filter(([k])=>k.startsWith(today)),maxHour=Math.max(0,...todayHours.map(([,v])=>v.venta));$('#byHour').innerHTML=todayHours.map(([k,v])=>dashBarV6(k.split(' ')[1],v,maxHour)).join('')||'<div class="muted tiny">Sin ventas hoy.</div>';
  $('#topProducts').innerHTML=d.products.slice(0,10).map(([k,v])=>`<div class="result"><b>${esc(k)}</b><div class="meta"><b>${v.unidades} u.</b> · ${money(v.venta)} s/IVA</div></div>`).join('')||'<div class="muted tiny">Sin datos.</div>';
  $('#topCats').innerHTML=d.cats.slice(0,10).map(([k,v])=>`<div class="result"><b>${esc(k)}</b><div class="meta"><b>${v.unidades} u.</b> · ${money(v.venta)} s/IVA</div></div>`).join('')||'<div class="muted tiny">Sin datos.</div>';
  $('#recent').innerHTML=orders.slice(0,12).map(o=>`<div class="result"><b>Pedido ${o.numero} · ${Number(o.unidades||0)} u. · ${money(o.neto_sin_iva)} s/IVA</b> ${statusBadgeV8(o.estado)}<div class="meta">${esc(o.cliente_nombre_snapshot||'Sin cliente')} · ${esc(o.vendedor_nombre_snapshot||'')}</div></div>`).join('')||'<div class="muted tiny">Sin pedidos.</div>';
  try{renderProductionV8(await productionDataV8(orders))}catch(e){$('#productionTableV8').innerHTML=`<div class="errorbox tiny">${esc(e.message||String(e))}</div>`}
};

function clientFormValuesV8(){
  return {razon_social:$('#fn')?.value.trim()||'',cuit:$('#fcuit')?.value.trim()||'',telefono:$('#ftel')?.value.trim()||'',email:$('#femail')?.value.trim()||'',localidad:$('#floc')?.value.trim()||'',provincia:$('#fprov')?.value.trim()||'',condicion_fiscal:$('#ffisc')?.value.trim()||'',domicilio:$('#fdom')?.value.trim()||'',domicilio_entrega:$('#fent')?.value.trim()||'',transporte:$('#ftrans')?.value.trim()||''};
}
function pickV8(obj,...keys){for(const k of keys){if(obj&&obj[k]!=null&&String(obj[k]).trim())return String(obj[k]).trim()}return ''}
function parseClientQrV8(text){
  const raw=String(text||'').trim(),out={};
  const set=(k,v)=>{if(v&&!out[k])out[k]=String(v).trim()};
  try{
    const j=JSON.parse(raw);set('razon_social',pickV8(j,'razon_social','razonSocial','nombre','name','cliente','empresa','organization','org'));set('cuit',pickV8(j,'cuit','CUIT','tax_id','taxId'));set('telefono',pickV8(j,'telefono','tel','phone','mobile'));set('email',pickV8(j,'email','mail'));set('localidad',pickV8(j,'localidad','ciudad','city'));set('provincia',pickV8(j,'provincia','state','region'));set('condicion_fiscal',pickV8(j,'condicion_fiscal','condicionFiscal','iva'));set('domicilio',pickV8(j,'domicilio','direccion','address'));set('domicilio_entrega',pickV8(j,'domicilio_entrega','direccion_entrega','delivery_address'));set('transporte',pickV8(j,'transporte','expreso'));
  }catch{}
  if(/^BEGIN:VCARD/i.test(raw)){
    raw.split(/\r?\n/).forEach(line=>{const p=line.indexOf(':');if(p<0)return;const key=line.slice(0,p).toUpperCase(),v=line.slice(p+1).trim();if(key==='FN')set('razon_social',v);if(key==='ORG')set('razon_social',v.replace(/;/g,' '));if(key.startsWith('TEL'))set('telefono',v);if(key.startsWith('EMAIL'))set('email',v);if(key.startsWith('ADR')){const a=v.split(';').filter(Boolean).join(', ');set('domicilio',a);set('domicilio_entrega',a)}});
  }
  if(/^MECARD:/i.test(raw)){raw.replace(/^MECARD:/i,'').split(';').forEach(x=>{const p=x.indexOf(':');if(p<0)return;const k=x.slice(0,p).toUpperCase(),v=x.slice(p+1);if(k==='N')set('razon_social',v);if(k==='TEL')set('telefono',v);if(k==='EMAIL')set('email',v);if(k==='ADR'){set('domicilio',v);set('domicilio_entrega',v)}})}
  try{
    const u=new URL(raw);let params=u.searchParams;if(params.get('p')){try{const dec=JSON.parse(atob(params.get('p').replace(/-/g,'+').replace(/_/g,'/')));set('cuit',pickV8(dec,'cuit','CUIT'))}catch{}};
    set('razon_social',params.get('nombre')||params.get('razon_social')||params.get('cliente'));set('cuit',params.get('cuit'));set('telefono',params.get('telefono')||params.get('tel'));set('email',params.get('email'));set('localidad',params.get('localidad'));set('provincia',params.get('provincia'));set('domicilio',params.get('domicilio')||params.get('direccion'));set('domicilio_entrega',params.get('domicilio_entrega')||params.get('entrega'));
  }catch{}
  raw.split(/\r?\n|\|/).forEach(line=>{const m=line.match(/^\s*([^:=]+)\s*[:=]\s*(.+)$/);if(!m)return;const k=m[1].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(),v=m[2].trim();if(/^(nombre|razon social|cliente|empresa)$/.test(k))set('razon_social',v);else if(k==='cuit')set('cuit',v);else if(/^(telefono|tel|celular)$/.test(k))set('telefono',v);else if(/^(email|mail)$/.test(k))set('email',v);else if(/^(localidad|ciudad)$/.test(k))set('localidad',v);else if(k==='provincia')set('provincia',v);else if(/^(domicilio|direccion)$/.test(k))set('domicilio',v);else if(/^(domicilio entrega|direccion entrega|entrega)$/.test(k))set('domicilio_entrega',v)});
  if(!out.cuit){const digits=raw.replace(/\D/g,'');if(/^\d{11}$/.test(digits))out.cuit=digits}
  return out;
}
function mergeClientPrefillV8(a,b){const x={...a};Object.entries(b||{}).forEach(([k,v])=>{if(v)x[k]=v});return x}

clientForm=function(c=null,prefill=null){
  const v=mergeClientPrefillV8(c||{},prefill||{});
  modal(c?'Editar cliente':'Cliente nuevo',`<button id="scanClientQrV8" class="btn primary" style="width:100%;margin-bottom:10px">📷 Escanear QR con datos del cliente</button><div class="tiny muted" style="margin:-3px 0 10px">Admite QR con JSON, vCard/MECARD, datos tipo Nombre/CUIT/Teléfono/Email/Dirección y CUIT simple.</div><div class="grid2"><input id="fn" placeholder="Razón social / Nombre" value="${esc(v.razon_social||'')}"><input id="fcuit" placeholder="CUIT" value="${esc(v.cuit||'')}"><input id="ftel" placeholder="Teléfono" value="${esc(v.telefono||'')}"><input id="femail" placeholder="Email" value="${esc(v.email||'')}"><input id="floc" placeholder="Localidad" value="${esc(v.localidad||'')}"><input id="fprov" placeholder="Provincia" value="${esc(v.provincia||'')}"><input id="ffisc" placeholder="Condición fiscal" value="${esc(v.condicion_fiscal||'')}"><input id="fdom" placeholder="Domicilio fiscal" value="${esc(v.domicilio||'')}"><input id="fent" placeholder="Domicilio entrega" value="${esc(v.domicilio_entrega||'')}"><input id="ftrans" placeholder="Transporte" value="${esc(v.transporte||'')}"></div><button id="saveClient" class="btn primary">Guardar y usar</button>`);
  $('#scanClientQrV8').onclick=()=>{const current=clientFormValuesV8();scanClientQrV8(c,current)};
  $('#saveClient').onclick=async()=>{const body={razon_social:$('#fn').value.trim()||'Cliente sin nombre',cuit:$('#fcuit').value.trim()||null,telefono:$('#ftel').value.trim()||null,email:$('#femail').value.trim()||null,localidad:$('#floc').value.trim()||null,provincia:$('#fprov').value.trim()||null,condicion_fiscal:$('#ffisc').value.trim()||null,domicilio:$('#fdom').value.trim()||null,domicilio_entrega:$('#fent').value.trim()||null,transporte:$('#ftrans').value.trim()||null,activo:true};let res;if(c)res=await sb.from('clientes').update(body).eq('id',c.id).select().single();else res=await sb.from('clientes').insert({...body,creado_en_feria:true}).select().single();if(res.error)return toast(res.error.message);client=res.data;closeModal();renderClient();saveDraft();await Promise.all([loadClients(''),cacheMasters()])};
};

function scanClientQrV8(c,current){
  if(typeof Html5Qrcode==='undefined')return toast('No se pudo cargar el lector QR.');
  modal('Escanear QR cliente','<div id="clientQrReaderV8" class="scanner"></div><button id="clientQrCancelV8" class="btn" style="width:100%;margin-top:10px">Volver a datos del cliente</button>');
  const qr=new Html5Qrcode('clientQrReaderV8');let done=false;
  $('#clientQrCancelV8').onclick=async()=>{if(done)return;done=true;try{await qr.stop()}catch{}clientForm(c,current)};
  qr.start({facingMode:'environment'},{fps:12,qrbox:{width:240,height:240}},async text=>{if(done)return;done=true;try{await qr.stop()}catch{}const parsed=parseClientQrV8(text),recognized=Object.values(parsed).filter(Boolean).length;if(!recognized){toast('QR leído, pero no reconocí campos de cliente. Podés completar los datos manualmente.');clientForm(c,current);return}clientForm(c,mergeClientPrefillV8(current,parsed));toast(`QR leído: ${recognized} dato/s cargado/s. Revisalos antes de guardar.`)},()=>{}).catch(e=>{$('#clientQrReaderV8').innerHTML=`<div class="errorbox">No se pudo abrir la cámara: ${esc(e)}</div>`});
}

ensureProductionPanelV8();
if($('#dash')?.classList.contains('active')&&session)loadDash();
