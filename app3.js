// PRESENTES 2026 CLOUD V0.3.5 - UX/search + branded confirmation
const companyFooterHtml=()=>`<div class="company-footer"><img src="./logo.png" alt="ADHOME"><div><b>Eklis S.A.</b><br>CUIT: 30701266192<br>IVA Responsable Inscripto<br>Av. Espora 2051, Burzaco, Buenos Aires (1852).<br><a href="mailto:ventas@adhome.com.ar">ventas@adhome.com.ar</a> · <a href="tel:1128492161">1128492161</a></div></div>`;
const companyFooterText=`Eklis S.A.\nCUIT: 30701266192\nIVA Responsable Inscripto\nAv. Espora 2051, Burzaco, Buenos Aires (1852).\nventas@adhome.com.ar\n1128492161`;
const patchStyle=document.createElement('style');
patchStyle.textContent=`
#cresults,#presults{max-height:310px;overflow:auto;border-radius:11px}
#cresults:empty,#presults:empty{display:none}
.search-empty{padding:10px 4px;color:#6b7280;font-size:12px}
.doc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:10px}
.doc-head img{width:155px;max-width:42%;height:auto}.doc-head .doc-name{text-align:right}.doc-head .doc-name b{display:block;font-size:18px}.doc-head .doc-name span{font-size:12px;color:#6b7280}
.company-footer{display:flex;gap:14px;align-items:center;margin-top:22px;padding-top:14px;border-top:1px solid #d1d5db;color:#4b5563;font-size:11px;line-height:1.5}.company-footer img{width:105px;height:auto;flex:0 0 auto}.company-footer a{color:inherit;text-decoration:none}
@media(max-width:520px){.doc-head img{width:125px}.doc-head .doc-name b{font-size:16px}.company-footer{align-items:flex-start}.company-footer img{width:82px}}
@media print{.company-footer{break-inside:avoid}.company-footer a{color:#000}}
`;
document.head.appendChild(patchStyle);

loadProducts=async function(q=''){
  q=String(q||'').trim();
  if(!q){$('#presults').innerHTML='';return}
  let data=[],error=null;
  if(!navigator.onLine){
    const z=q.toLowerCase();
    data=productCache.filter(p=>[p.sku,p.descripcion,p.producto,p.color,p.medida].some(v=>String(v||'').toLowerCase().includes(z))).slice(0,12);
  }else{
    let query=sb.from('productos').select('*').eq('activo',true).order('descripcion').limit(12);
    query=query.or(`sku.ilike.%${q}%,descripcion.ilike.%${q}%,producto.ilike.%${q}%,color.ilike.%${q}%,medida.ilike.%${q}%`);
    const r=await query;data=r.data||[];error=r.error;
  }
  if(error){$('#presults').innerHTML=`<div class="errorbox tiny">${esc(error.message)}</div>`;return}
  $('#presults').innerHTML=data.length?data.map(p=>`<div class="result" data-sku="${esc(p.sku)}"><b>${esc(p.descripcion)}</b><div class="meta">${esc(p.sku)} · ${money(p.precio)} + IVA · Stock ${p.stock_disponible}</div></div>`).join(''):'<div class="search-empty">Sin coincidencias. Podés usar “+ SKU manual”.</div>';
};

loadClients=async function(q=''){
  q=String(q||'').trim();
  if(!q){$('#cresults').innerHTML='';return}
  let data=[],error=null;
  if(!navigator.onLine){
    const z=q.toLowerCase();
    data=clientCache.filter(c=>[c.razon_social,c.codigo,c.cuit,c.email,c.telefono].some(v=>String(v||'').toLowerCase().includes(z))).slice(0,12);
  }else{
    let query=sb.from('clientes').select('*').eq('activo',true).order('razon_social').limit(12);
    query=query.or(`razon_social.ilike.%${q}%,codigo.ilike.%${q}%,cuit.ilike.%${q}%,email.ilike.%${q}%,telefono.ilike.%${q}%`);
    const r=await query;data=r.data||[];error=r.error;
  }
  if(error){$('#cresults').innerHTML=`<div class="errorbox tiny">${esc(error.message)}</div>`;return}
  $('#cresults').innerHTML=data.length?data.map(c=>`<div class="result" data-cid="${c.id}"><b>${esc(c.razon_social)}</b><div class="meta">${esc(c.codigo||'')}${c.cuit?' · CUIT '+esc(c.cuit):''}</div></div>`).join(''):'<div class="search-empty">Sin coincidencias. Podés usar “+ Cliente nuevo”.</div>';
};

summaryHtml=function(){
  const s=cart.reduce((a,x)=>a+x.qty*Number(x.precio),0),p=Math.min(30,Math.max(0,Number($('#discount').value||0))),d=s*p/100,n=s-d,iv=n*.21,miss=missingClient(client);
  return `<div class="copy-card"><div class="doc-head"><img src="./logo.png" alt="ADHOME"><div class="doc-name"><b>Confirmación de pedido Adhome</b><span>PRESENTES 2026</span></div></div><div class="meta"><b>Cliente:</b> ${esc(client?.razon_social||'Sin cliente')}<br><b>Vendedor:</b> ${esc(profile?.full_name||profile?.email||'')}</div><div class="order-lines">${cart.map(x=>`<div class="order-line"><div><b>${esc(x.descripcion)}</b><div class="meta">${esc(x.sku)}${x.observacion_item?' · '+esc(x.observacion_item):''}</div></div><div>${x.qty} u.</div><div class="right">${money(x.qty*x.precio)}</div></div>`).join('')}</div><div class="totals"><div><span>Subtotal s/IVA</span><b>${money(s)}</b></div><div><span>Descuento ${p}%</span><b>${money(d)}</b></div><div><span>Neto s/IVA</span><b>${money(n)}</b></div><div><span>IVA 21%</span><b>${money(iv)}</b></div><div class="grand"><span>Total c/IVA</span><b>${money(n+iv)}</b></div></div><div class="meta"><b>Pago:</b> ${esc($('#payment').value)} · <b>Entrega:</b> ${esc($('#delivery').value)}${$('#delivery').value==='Transporte'?' · '+esc($('#transport').value):''}</div>${$('#obs').value?`<div style="margin-top:8px"><b>Observaciones:</b> ${esc($('#obs').value)}</div>`:''}${miss.length?`<div class="warn tiny">Datos de cliente incompletos: ${miss.join(', ')}. No bloquea.</div>`:''}${cart.reduce((a,x)=>a+x.qty,0)<60?'<div class="warn tiny">Pedido menor a 60 unidades. No bloquea.</div>':''}${companyFooterHtml()}</div><button id="doConfirm" class="btn primary big" style="width:100%;margin-top:12px">Confirmar pedido</button>`;
};

orderCopyHtml=function(o){
  return `<div class="copy-card"><div class="doc-head"><img src="./logo.png" alt="ADHOME"><div class="doc-name"><b>Confirmación de pedido Adhome</b><span>Pedido ${o.numero} · ${new Date(o.created_at).toLocaleString('es-AR')}</span></div></div><div><b>Cliente:</b> ${esc(o.cliente_nombre_snapshot||'Sin cliente')}<br><b>Vendedor:</b> ${esc(o.vendedor_nombre_snapshot||'')}</div><div class="order-lines">${(o.pedido_items||[]).map(i=>`<div class="order-line"><div><b>${esc(i.descripcion_snapshot)}</b><div class="meta">${esc(i.sku)}${i.observacion_item?' · '+esc(i.observacion_item):''}</div></div><div>${i.cantidad} u.</div><div class="right">${money(i.cantidad*Number(i.precio_unitario))}</div></div>`).join('')}</div><div class="totals"><div><span>Subtotal s/IVA</span><b>${money(o.subtotal_sin_iva)}</b></div><div><span>Descuento ${Number(o.descuento_pct||0)}%</span><b>${money(o.descuento_importe)}</b></div><div><span>Neto s/IVA</span><b>${money(o.neto_sin_iva)}</b></div><div><span>IVA 21%</span><b>${money(o.iva_importe)}</b></div><div class="grand"><span>Total c/IVA</span><b>${money(o.total_con_iva)}</b></div></div><div class="meta" style="margin-top:8px"><b>Pago:</b> ${esc(o.forma_pago||'')} · <b>Entrega:</b> ${esc(o.modalidad_entrega||'')}${o.transporte_snapshot?' · '+esc(o.transporte_snapshot):''}</div>${o.observaciones?`<div style="margin-top:8px"><b>Observaciones:</b> ${esc(o.observaciones)}</div>`:''}${companyFooterHtml()}</div>`;
};

customerText=function(o){
  const lines=(o.pedido_items||[]).map(i=>`${i.cantidad} x ${i.descripcion_snapshot} (${i.sku}) · ${money(i.precio_unitario)} c/u`).join('\n');
  return `Confirmación de pedido Adhome\nPedido ${o.numero}\nFecha: ${new Date(o.created_at).toLocaleString('es-AR')}\nCliente: ${o.cliente_nombre_snapshot||'Sin cliente'}\nVendedor: ${o.vendedor_nombre_snapshot||''}\n\n${lines}\n\nSubtotal s/IVA: ${money(o.subtotal_sin_iva)}\nDescuento ${Number(o.descuento_pct||0)}%: ${money(o.descuento_importe)}\nNeto s/IVA: ${money(o.neto_sin_iva)}\nIVA 21%: ${money(o.iva_importe)}\nTotal c/IVA: ${money(o.total_con_iva)}\nPago: ${o.forma_pago||''}\nEntrega: ${o.modalidad_entrega||''}${o.transporte_snapshot?' · '+o.transporte_snapshot:''}${o.observaciones?'\nObservaciones: '+o.observaciones:''}\n\n${companyFooterText}`;
};

$('#csearch').placeholder='Escribí nombre, código, CUIT, email o teléfono';
$('#psearch').placeholder='Escribí SKU, producto, color o medida';
$('#cresults').innerHTML='';
$('#presults').innerHTML='';
