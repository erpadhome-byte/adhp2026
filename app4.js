// PRESENTES 2026 CLOUD V0.3.7 - client snapshot, delivery modes, PDF layout, mobile back navigation
const PDF_DARK_BLUE=[23,54,93];
let pdfLogoDataPromise=null;

const deliveryEl=$('#delivery');
if(deliveryEl){
  deliveryEl.innerHTML='<option>Retiro en fábrica</option><option>Logística Adesal</option><option>Expreso</option>';
}
const transportLabel=$('#transportWrap label');
if(transportLabel)transportLabel.textContent='Expreso';
if($('#transport'))$('#transport').placeholder='Nombre del expreso';

try{
  const d=JSON.parse(localStorage.getItem('presentes_draft')||'null');
  if(d?.delivery==='Transporte'){d.delivery='Expreso';localStorage.setItem('presentes_draft',JSON.stringify(d));}
  const q=pendingQueue();let changed=false;
  q.forEach(x=>{if(x?.payload?.p_modalidad_entrega==='Transporte'){x.payload.p_modalidad_entrega='Expreso';changed=true;}});
  if(changed)localStorage.setItem('presentes_pending',JSON.stringify(q));
}catch{}

toggleTransport=function(){
  const isExpreso=$('#delivery').value==='Expreso';
  $('#transportWrap').classList.toggle('hidden',!isExpreso);
  if(isExpreso && !$('#transport').value.trim() && client?.transporte)$('#transport').value=client.transporte;
};

renderClient=function(){
  if(!client){$('#cselected').innerHTML='<div class="warn tiny">Sin cliente seleccionado. Se puede confirmar igualmente.</div>';return;}
  const miss=missingClient(client);
  const entrega=client.domicilio_entrega||client.domicilio||'';
  const zona=[client.localidad,client.provincia].filter(Boolean).join(', ');
  $('#cselected').innerHTML=`<div class="${miss.length?'warn':'okbox'}"><b>${esc(client.razon_social)}</b>${client.cuit?`<div class="tiny">CUIT ${esc(client.cuit)}</div>`:''}${entrega?`<div class="tiny"><b>Entrega:</b> ${esc(entrega)}${zona?' · '+esc(zona):''}</div>`:''}${miss.length?`<div class="tiny">Faltan: ${miss.join(', ')}. No bloquea el pedido.</div>`:''}<button id="editClient" class="btn" style="margin-top:7px">Completar / editar</button></div>`;
  $('#editClient').onclick=()=>clientForm(client);
  toggleTransport();
};

function currentClientSnapshotV37(){
  if(!client)return {};
  return {
    codigo:client.codigo||null,
    cuit:client.cuit||null,
    telefono:client.telefono||null,
    email:client.email||null,
    localidad:client.localidad||null,
    provincia:client.provincia||null,
    condicion_fiscal:client.condicion_fiscal||null,
    domicilio:client.domicilio||null,
    domicilio_entrega:client.domicilio_entrega||null,
    transporte:client.transporte||null,
    direccion_transporte:client.direccion_transporte||null
  };
}

orderPayload=function(){
  const modalidad=$('#delivery').value;
  return {
    p_cliente_id:client?.id||null,
    p_cliente_nombre:client?.razon_social||'Cliente sin identificar',
    p_forma_pago:$('#payment').value,
    p_descuento_pct:Number($('#discount').value||0),
    p_observaciones:$('#obs').value.trim()||null,
    p_offline_id:crypto.randomUUID(),
    p_items:cart.map(x=>({sku:x.sku,cantidad:Number(x.qty),precio:Number(x.precio),descripcion:x.descripcion,tipo:x.tipo,producto:x.producto,color:x.color,medida:x.medida,unidad_venta:x.unidad_venta,observacion_item:x.observacion_item||null})),
    p_modalidad_entrega:modalidad,
    p_transporte:modalidad==='Expreso'?($('#transport').value.trim()||null):null,
    p_cliente_snapshot:currentClientSnapshotV37()
  };
};

function clientDataFromOrderV37(o){
  const l=o?._cliente_live||{};
  return {
    nombre:o?.cliente_nombre_snapshot||l.razon_social||'Sin cliente',
    codigo:o?.cliente_codigo_snapshot||l.codigo||'',
    cuit:o?.cliente_cuit_snapshot||l.cuit||'',
    telefono:o?.cliente_telefono_snapshot||l.telefono||'',
    email:o?.cliente_email_snapshot||l.email||'',
    localidad:o?.cliente_localidad_snapshot||l.localidad||'',
    provincia:o?.cliente_provincia_snapshot||l.provincia||'',
    condicion_fiscal:o?.cliente_condicion_fiscal_snapshot||l.condicion_fiscal||'',
    domicilio:o?.cliente_domicilio_snapshot||l.domicilio||'',
    domicilio_entrega:o?.cliente_domicilio_entrega_snapshot||l.domicilio_entrega||l.domicilio||'',
    transporte:o?.cliente_transporte_snapshot||l.transporte||'',
    direccion_transporte:o?.cliente_direccion_transporte_snapshot||l.direccion_transporte||''
  };
}

async function hydrateOrderClientV37(o){
  if(!o?.cliente_id)return o;
  if(o.cliente_domicilio_entrega_snapshot||o.cliente_cuit_snapshot||o._cliente_live)return o;
  try{const {data}=await sb.from('clientes').select('*').eq('id',o.cliente_id).maybeSingle();if(data)o._cliente_live=data;}catch{}
  return o;
}

function clientPreviewHtmlV37(c){
  const entrega=c.domicilio_entrega||c.domicilio||'';
  const zona=[c.localidad,c.provincia].filter(Boolean).join(', ');
  const contact=[c.telefono,c.email].filter(Boolean).join(' · ');
  return `<div class="doc-section-v37"><div class="doc-section-title-v37">Datos del cliente</div><div class="client-grid-v37"><div><b>${esc(c.nombre||'Sin cliente')}</b>${c.codigo?`<div class="meta">Código ${esc(c.codigo)}</div>`:''}</div><div>${c.cuit?`<b>CUIT:</b> ${esc(c.cuit)}`:''}${c.condicion_fiscal?`<div class="meta">${esc(c.condicion_fiscal)}</div>`:''}</div></div>${entrega?`<div class="client-address-v37"><b>Dirección de entrega:</b> ${esc(entrega)}${zona?' · '+esc(zona):''}</div>`:''}${contact?`<div class="meta">${esc(contact)}</div>`:''}</div>`;
}

function footerPreviewHtmlV37(){
  return `<div class="company-footer-v4"><div class="company-footer-main"><img src="./logo.png" alt="ADHOME"><div><b>Eklis S.A.</b><br>CUIT: 30701266192 · IVA Responsable Inscripto<br>Av. Espora 2051, Burzaco, Buenos Aires (1852).<br>ventas@adhome.com.ar · 1128492161</div></div><div class="designed-v4">Designed by LTapps</div></div>`;
}

const pdfPatchStyle=document.createElement('style');
pdfPatchStyle.textContent=`
.confirmation-sheet-v4{min-height:720px;display:flex;flex-direction:column}.confirmation-body-v4{flex:1}.fair-v4{font-size:13px;font-weight:800;color:#17365d;margin-top:3px}
.doc-section-v37{border:1px solid #dfe3e8;border-radius:10px;padding:10px 11px;margin:12px 0}.doc-section-title-v37{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#17365d;font-weight:800;margin-bottom:7px}.client-grid-v37{display:grid;grid-template-columns:1.5fr 1fr;gap:10px}.client-address-v37{margin-top:7px}.products-title-v37{border-top:2px solid #17365d;padding-top:9px;margin-top:13px;font-weight:800;color:#17365d}
.company-footer-v4{margin-top:auto;padding-top:14px;border-top:1px solid #d1d5db;color:#4b5563;font-size:10.5px;line-height:1.45}.company-footer-main{display:flex;align-items:center;gap:12px}.company-footer-main img{width:88px;height:auto;flex:0 0 auto}.designed-v4{text-align:center;color:#17365d;font-weight:700;font-size:10px;margin-top:10px;letter-spacing:.02em}
@media(max-width:520px){.confirmation-sheet-v4{min-height:650px}.company-footer-main{align-items:flex-start}.company-footer-main img{width:72px}.client-grid-v37{grid-template-columns:1fr}}
@media print{.confirmation-sheet-v4{min-height:270mm}.company-footer-v4{break-inside:avoid}}
`;
document.head.appendChild(pdfPatchStyle);

async function pdfLogoDataV4(){
  if(pdfLogoDataPromise)return pdfLogoDataPromise;
  pdfLogoDataPromise=(async()=>{const r=await fetch('./logo.png');if(!r.ok)throw Error('No se pudo cargar el logo');const b=await r.blob();return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(b);});})();
  return pdfLogoDataPromise;
}
function pdfFileNameV4(o){return `Pedido_ADHOME_Feria_Presentes_2026_${o.numero}.pdf`;}

async function buildOrderPdfV4(o){
  if(!window.jspdf?.jsPDF)throw Error('No se pudo cargar el generador PDF. Recargá la app e intentá nuevamente.');
  o=await hydrateOrderClientV37(o);
  const c=clientDataFromOrderV37(o);
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  const logo=await pdfLogoDataV4();
  const PW=210,M=14,R=196,FOOTER_TOP=255;
  let y=14;

  function drawHeader(first=true){
    if(first){
      try{doc.addImage(logo,'PNG',M,13,56,11.3);}catch{}
      doc.setTextColor(17,17,17);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('Confirmación de pedido Adhome',R,17,{align:'right'});
      doc.setTextColor(...PDF_DARK_BLUE);doc.setFontSize(11);doc.text('Feria Presentes 2026',R,23,{align:'right'});
      doc.setDrawColor(210,214,220);doc.line(M,29,R,29);y=36;
    }else{
      try{doc.addImage(logo,'PNG',M,11,40,8.1);}catch{}
      doc.setTextColor(...PDF_DARK_BLUE);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(`Feria Presentes 2026 · Pedido ${o.numero}`,R,16,{align:'right'});
      doc.setDrawColor(225,225,225);doc.line(M,21,R,21);y=28;
    }
  }
  function drawFooter(){
    doc.setDrawColor(200,205,212);doc.line(M,FOOTER_TOP,R,FOOTER_TOP);
    try{doc.addImage(logo,'PNG',M,262,34,6.9);}catch{}
    doc.setTextColor(65,70,78);doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text('Eklis S.A.',54,263.5);
    doc.setFont('helvetica','normal');doc.setFontSize(7.6);doc.text('CUIT: 30701266192 · IVA Responsable Inscripto',54,268);doc.text('Av. Espora 2051, Burzaco, Buenos Aires (1852).',54,272.5);doc.text('ventas@adhome.com.ar · 1128492161',54,277);
    doc.setTextColor(...PDF_DARK_BLUE);doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.text('Designed by LTapps',PW/2,292,{align:'center'});
  }
  function ensureSpace(h){if(y+h>FOOTER_TOP-6)newPage();}
  function sectionTitle(t){ensureSpace(10);doc.setFillColor(242,245,249);doc.rect(M,y,182,8,'F');doc.setTextColor(...PDF_DARK_BLUE);doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(t,M+2,y+5.3);y+=11;}
  function drawItemsHead(){doc.setFillColor(248,248,248);doc.rect(M,y,182,8,'F');doc.setTextColor(75,75,75);doc.setFont('helvetica','bold');doc.setFontSize(7.8);doc.text('Artículo / SKU',M+2,y+5.2);doc.text('Cantidad',147,y+5.2,{align:'right'});doc.text('Precio unit.',171,y+5.2,{align:'right'});doc.text('Total',194,y+5.2,{align:'right'});y+=10;}
  function newPage(){doc.addPage();drawHeader(false);sectionTitle('Productos (continuación)');drawItemsHead();}

  drawHeader(true);
  sectionTitle('Datos del cliente');
  doc.setTextColor(25,25,25);doc.setFont('helvetica','bold');doc.setFontSize(9.2);doc.text(String(c.nombre||'Sin cliente'),M+2,y);
  if(c.cuit){doc.setFont('helvetica','normal');doc.setFontSize(8.3);doc.text(`CUIT: ${c.cuit}`,R-2,y,{align:'right'});}y+=5;
  if(c.condicion_fiscal){doc.setTextColor(85,85,85);doc.setFontSize(7.8);doc.text(String(c.condicion_fiscal),M+2,y);y+=4;}
  const entrega=c.domicilio_entrega||c.domicilio||'';
  const zona=[c.localidad,c.provincia].filter(Boolean).join(', ');
  if(entrega){const lines=doc.splitTextToSize(`Dirección de entrega: ${entrega}${zona?' · '+zona:''}`,178);doc.setTextColor(35,35,35);doc.setFont('helvetica','normal');doc.setFontSize(8.2);doc.text(lines,M+2,y);y+=lines.length*4+1;}
  const contacto=[c.telefono,c.email].filter(Boolean).join(' · ');if(contacto){doc.setTextColor(90,90,90);doc.setFontSize(7.6);doc.text(doc.splitTextToSize(contacto,178),M+2,y);y+=5;}
  y+=3;

  sectionTitle('Datos del pedido');
  doc.setTextColor(35,35,35);doc.setFont('helvetica','normal');doc.setFontSize(8.2);
  doc.text(`Pedido: ${o.numero}`,M+2,y);doc.text(`Fecha: ${new Date(o.created_at).toLocaleString('es-AR')}`,78,y);y+=5;
  doc.setFont('helvetica','bold');doc.text('Vendedor:',M+2,y);doc.setFont('helvetica','normal');doc.text(String(o.vendedor_nombre_snapshot||''),34,y);y+=5;
  doc.setFont('helvetica','bold');doc.text('Pago:',M+2,y);doc.setFont('helvetica','normal');doc.text(String(o.forma_pago||''),27,y);y+=5;
  doc.setFont('helvetica','bold');doc.text('Envío:',M+2,y);doc.setFont('helvetica','normal');const envio=`${o.modalidad_entrega||'Retiro en fábrica'}${o.modalidad_entrega==='Expreso'&&o.transporte_snapshot?' · '+o.transporte_snapshot:''}`;doc.text(doc.splitTextToSize(envio,158),29,y);y+=7;

  sectionTitle('Productos');
  drawItemsHead();
  for(const i of (o.pedido_items||[])){
    const details=[i.sku,i.color_snapshot,i.medida_snapshot,i.observacion_item].filter(Boolean).join(' · ');
    const descLines=doc.splitTextToSize(String(i.descripcion_snapshot||i.sku||''),102);
    const detailLines=doc.splitTextToSize(details,102);
    const rowH=Math.max(11,4.2*descLines.length+3.5*detailLines.length+3);
    ensureSpace(rowH+2);
    doc.setDrawColor(235,235,235);doc.line(M,y+rowH,R,y+rowH);
    doc.setTextColor(25,25,25);doc.setFont('helvetica','bold');doc.setFontSize(8.4);doc.text(descLines,M+2,y+4.5);
    doc.setTextColor(105,105,105);doc.setFont('helvetica','normal');doc.setFontSize(7.1);doc.text(detailLines,M+2,y+4.5+4.2*descLines.length);
    doc.setTextColor(25,25,25);doc.setFontSize(8.2);doc.text(String(i.cantidad),147,y+5,{align:'right'});doc.text(money(Number(i.precio_unitario)),171,y+5,{align:'right'});doc.setFont('helvetica','bold');doc.text(money(Number(i.cantidad)*Number(i.precio_unitario)),194,y+5,{align:'right'});y+=rowH;
  }

  ensureSpace(48);y+=5;const lx=130,vx=194;doc.setFontSize(8.8);doc.setTextColor(55,55,55);doc.setFont('helvetica','normal');doc.text('Subtotal s/IVA',lx,y);doc.text(money(o.subtotal_sin_iva),vx,y,{align:'right'});y+=5;doc.text(`Descuento ${Number(o.descuento_pct||0)}%`,lx,y);doc.text(money(o.descuento_importe),vx,y,{align:'right'});y+=5;doc.setFont('helvetica','bold');doc.text('Neto s/IVA',lx,y);doc.text(money(o.neto_sin_iva),vx,y,{align:'right'});y+=5;doc.setFont('helvetica','normal');doc.text('IVA 21%',lx,y);doc.text(money(o.iva_importe),vx,y,{align:'right'});y+=6;doc.setDrawColor(80,80,80);doc.line(lx,y-3.5,vx,y-3.5);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('Total c/IVA',lx,y+1);doc.text(money(o.total_con_iva),vx,y+1,{align:'right'});y+=10;
  if(o.observaciones){const lines=doc.splitTextToSize(`Observaciones: ${o.observaciones}`,182);ensureSpace(lines.length*4+4);doc.setFontSize(8.2);doc.setFont('helvetica','normal');doc.setTextColor(35,35,35);doc.text(lines,M,y);y+=lines.length*4;}

  const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);drawFooter();doc.setTextColor(130,130,130);doc.setFont('helvetica','normal');doc.setFontSize(6.8);doc.text(`Página ${p} de ${pages}`,R,292,{align:'right'});}
  return {doc,blob:doc.output('blob'),filename:pdfFileNameV4(o)};
}

async function shareOrderPdfV4(o,target){
  try{const built=await buildOrderPdfV4(o);const file=new File([built.blob],built.filename,{type:'application/pdf'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({title:`Pedido ADHOME ${o.numero} - Feria Presentes 2026`,text:'Confirmación de pedido Adhome - Feria Presentes 2026',files:[file]});return;}built.doc.save(built.filename);toast(`Se descargó ${built.filename} para compartirlo.`);}catch(e){if(e?.name!=='AbortError')toast(e.message||String(e));}
}
async function downloadOrderPdfV4(o){try{const built=await buildOrderPdfV4(o);built.doc.save(built.filename);}catch(e){toast(e.message||String(e));}}

summaryHtml=function(){
  const s=cart.reduce((a,x)=>a+x.qty*Number(x.precio),0),p=Math.min(30,Math.max(0,Number($('#discount').value||0))),d=s*p/100,n=s-d,iv=n*.21,miss=missingClient(client);
  const c={nombre:client?.razon_social||'Sin cliente',codigo:client?.codigo||'',cuit:client?.cuit||'',telefono:client?.telefono||'',email:client?.email||'',localidad:client?.localidad||'',provincia:client?.provincia||'',condicion_fiscal:client?.condicion_fiscal||'',domicilio:client?.domicilio||'',domicilio_entrega:client?.domicilio_entrega||''};
  const envio=`${$('#delivery').value}${$('#delivery').value==='Expreso'&&$('#transport').value?' · '+esc($('#transport').value):''}`;
  return `<div class="copy-card confirmation-sheet-v4"><div class="confirmation-body-v4"><div class="doc-head"><img src="./logo.png" alt="ADHOME"><div class="doc-name"><b>Confirmación de pedido Adhome</b><div class="fair-v4">Feria Presentes 2026</div></div></div>${clientPreviewHtmlV37(c)}<div class="doc-section-v37"><div class="doc-section-title-v37">Datos del pedido</div><div><b>Vendedor:</b> ${esc(profile?.full_name||profile?.email||'')}<br><b>Pago:</b> ${esc($('#payment').value)}<br><b>Envío:</b> ${envio}</div></div><div class="products-title-v37">Productos</div><div class="order-lines">${cart.map(x=>`<div class="order-line"><div><b>${esc(x.descripcion)}</b><div class="meta">${esc([x.sku,x.color,x.medida,x.observacion_item].filter(Boolean).join(' · '))}</div></div><div>${x.qty} u.</div><div class="right"><div>${money(x.precio)} c/u</div><b>${money(x.qty*x.precio)}</b></div></div>`).join('')}</div><div class="totals"><div><span>Subtotal s/IVA</span><b>${money(s)}</b></div><div><span>Descuento ${p}%</span><b>${money(d)}</b></div><div><span>Neto s/IVA</span><b>${money(n)}</b></div><div><span>IVA 21%</span><b>${money(iv)}</b></div><div class="grand"><span>Total c/IVA</span><b>${money(n+iv)}</b></div></div>${$('#obs').value?`<div style="margin-top:8px"><b>Observaciones:</b> ${esc($('#obs').value)}</div>`:''}${miss.length?`<div class="warn tiny">Datos de cliente incompletos: ${miss.join(', ')}. No bloquea.</div>`:''}${cart.reduce((a,x)=>a+x.qty,0)<60?'<div class="warn tiny">Pedido menor a 60 unidades. No bloquea.</div>':''}</div>${footerPreviewHtmlV37()}</div><button id="doConfirm" class="btn primary big" style="width:100%;margin-top:12px">Confirmar pedido</button>`;
};

orderCopyHtml=function(o){
  const c=clientDataFromOrderV37(o);const envio=`${o.modalidad_entrega||'Retiro en fábrica'}${o.modalidad_entrega==='Expreso'&&o.transporte_snapshot?' · '+esc(o.transporte_snapshot):''}`;
  return `<div class="copy-card confirmation-sheet-v4"><div class="confirmation-body-v4"><div class="doc-head"><img src="./logo.png" alt="ADHOME"><div class="doc-name"><b>Confirmación de pedido Adhome</b><div class="fair-v4">Feria Presentes 2026</div><span>Pedido ${o.numero} · ${new Date(o.created_at).toLocaleString('es-AR')}</span></div></div>${clientPreviewHtmlV37(c)}<div class="doc-section-v37"><div class="doc-section-title-v37">Datos del pedido</div><div><b>Vendedor:</b> ${esc(o.vendedor_nombre_snapshot||'')}<br><b>Pago:</b> ${esc(o.forma_pago||'')}<br><b>Envío:</b> ${envio}</div></div><div class="products-title-v37">Productos</div><div class="order-lines">${(o.pedido_items||[]).map(i=>`<div class="order-line"><div><b>${esc(i.descripcion_snapshot)}</b><div class="meta">${esc([i.sku,i.color_snapshot,i.medida_snapshot,i.observacion_item].filter(Boolean).join(' · '))}</div></div><div>${i.cantidad} u.</div><div class="right"><div>${money(i.precio_unitario)} c/u</div><b>${money(i.cantidad*Number(i.precio_unitario))}</b></div></div>`).join('')}</div><div class="totals"><div><span>Subtotal s/IVA</span><b>${money(o.subtotal_sin_iva)}</b></div><div><span>Descuento ${Number(o.descuento_pct||0)}%</span><b>${money(o.descuento_importe)}</b></div><div><span>Neto s/IVA</span><b>${money(o.neto_sin_iva)}</b></div><div><span>IVA 21%</span><b>${money(o.iva_importe)}</b></div><div class="grand"><span>Total c/IVA</span><b>${money(o.total_con_iva)}</b></div></div>${o.observaciones?`<div style="margin-top:8px"><b>Observaciones:</b> ${esc(o.observaciones)}</div>`:''}</div>${footerPreviewHtmlV37()}</div>`;
};

openOrder=async function(o,justConfirmed=false){
  o=await hydrateOrderClientV37(o);
  modal(justConfirmed?'Pedido confirmado':'Detalle de pedido',`${orderCopyHtml(o)}${o.unidades_pendientes?`<div class="warn tiny no-print">Interno: ${o.unidades_pendientes} unidad/es pendientes por stock. Este dato no se incluye en la confirmación del cliente.</div>`:''}<div class="share-row no-print" style="margin-top:12px"><button id="ow" class="btn">WhatsApp</button><button id="oe" class="btn">Email</button><button id="odl" class="btn">Descargar</button><button id="op" class="btn">Imprimir</button></div>`);
  $('#ow').onclick=()=>shareOrderPdfV4(o,'WhatsApp');$('#oe').onclick=()=>shareOrderPdfV4(o,'Email');$('#odl').onclick=()=>downloadOrderPdfV4(o);$('#op').onclick=()=>{const p=$('#printArea');p.innerHTML=orderCopyHtml(o);p.classList.remove('hidden');window.print();p.classList.add('hidden');};
};

$('#confirm').onclick=()=>{
  if(!cart.length)return toast('Agregá al menos un artículo');
  if($('#delivery').value==='Expreso'&&!$('#transport').value.trim())return toast('Indicá el expreso');
  modal('Revisar pedido',summaryHtml());$('#doConfirm').onclick=confirmOrder;
};

// Mobile browser/PWA back navigation: close modal, return to prior tab, keep Pedido as app root.
let historyReadyV37=false,historySkipV37=false;
const baseModalV37=modal,baseCloseV37=closeModal;
function activeViewV37(){return document.querySelector('.view.active')?.id||'pedido';}
function activateViewV37(v){
  if(!document.getElementById(v))v='pedido';
  $$('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.v===v));$$('.view').forEach(x=>x.classList.toggle('active',x.id===v));
  if(v==='pedidos')loadOrders();if(v==='dash')loadDash();if(v==='admin')loadAdmin();
}
modal=function(t,b){baseModalV37(t,b);if(historyReadyV37&&!historySkipV37&&!history.state?.modal)history.pushState({presentes:true,view:activeViewV37(),modal:true},'',location.href);};
closeModal=function(){baseCloseV37();if(historyReadyV37&&history.state?.modal){historySkipV37=true;history.back();}};
$('#mclose').onclick=closeModal;
$$('.nav button').forEach(b=>{const old=b.onclick;b.onclick=e=>{if(old)old.call(b,e);if(historyReadyV37&&!historySkipV37&&history.state?.view!==b.dataset.v)history.pushState({presentes:true,view:b.dataset.v},'',location.href);};});
window.addEventListener('popstate',e=>{
  if(historySkipV37){historySkipV37=false;return;}
  if(!$('#modal').classList.contains('hidden'))baseCloseV37();
  const st=e.state;
  if(st?.presentesGuard){activateViewV37('pedido');history.pushState({presentes:true,view:'pedido'},'',location.href);return;}
  if(st?.presentes){activateViewV37(st.view||'pedido');return;}
});
if(!history.state?.presentes&&!history.state?.presentesGuard){history.replaceState({presentesGuard:true},'',location.href);history.pushState({presentes:true,view:'pedido'},'',location.href);}historyReadyV37=true;

toggleTransport();
