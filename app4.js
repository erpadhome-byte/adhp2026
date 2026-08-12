// PRESENTES 2026 CLOUD V0.3.6 - PDF confirmation + native file sharing
const PDF_DARK_BLUE=[23,54,93];
let pdfLogoDataPromise=null;

function footerPreviewHtmlV4(){
  return `<div class="company-footer-v4"><div class="company-footer-main"><img src="./logo.png" alt="ADHOME"><div><b>Eklis S.A.</b><br>CUIT: 30701266192 · IVA Responsable Inscripto<br>Av. Espora 2051, Burzaco, Buenos Aires (1852).<br>ventas@adhome.com.ar · 1128492161</div></div><div class="designed-v4">Designed by LTapps</div></div>`;
}

const pdfPatchStyle=document.createElement('style');
pdfPatchStyle.textContent=`
.confirmation-sheet-v4{min-height:720px;display:flex;flex-direction:column}
.confirmation-body-v4{flex:1}
.fair-v4{font-size:13px;font-weight:800;color:#17365d;margin-top:3px}
.company-footer-v4{margin-top:auto;padding-top:14px;border-top:1px solid #d1d5db;color:#4b5563;font-size:10.5px;line-height:1.45}
.company-footer-main{display:flex;align-items:center;gap:12px}.company-footer-main img{width:88px;height:auto;flex:0 0 auto}
.designed-v4{text-align:center;color:#17365d;font-weight:700;font-size:10px;margin-top:10px;letter-spacing:.02em}
@media(max-width:520px){.confirmation-sheet-v4{min-height:650px}.company-footer-main{align-items:flex-start}.company-footer-main img{width:72px}}
@media print{.confirmation-sheet-v4{min-height:270mm}.company-footer-v4{break-inside:avoid}}
`;
document.head.appendChild(pdfPatchStyle);

async function pdfLogoDataV4(){
  if(pdfLogoDataPromise)return pdfLogoDataPromise;
  pdfLogoDataPromise=(async()=>{
    const r=await fetch('./logo.png');
    if(!r.ok)throw Error('No se pudo cargar el logo');
    const b=await r.blob();
    return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(b)});
  })();
  return pdfLogoDataPromise;
}

function pdfFileNameV4(o){return `Pedido_ADHOME_Feria_Presentes_2026_${o.numero}.pdf`;}

async function buildOrderPdfV4(o){
  if(!window.jspdf?.jsPDF)throw Error('No se pudo cargar el generador PDF. Recargá la app e intentá nuevamente.');
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  const logo=await pdfLogoDataV4();
  const PW=210,PH=297,M=14,CONTENT_RIGHT=196,FOOTER_TOP=255;
  let y=14;

  function drawHeader(first=true){
    if(first){
      try{doc.addImage(logo,'PNG',M,13,56,11.3)}catch{}
      doc.setTextColor(17,17,17);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('Confirmación de pedido Adhome',CONTENT_RIGHT,17,{align:'right'});
      doc.setTextColor(...PDF_DARK_BLUE);doc.setFontSize(11);doc.text('Feria Presentes 2026',CONTENT_RIGHT,23,{align:'right'});
      doc.setDrawColor(210,214,220);doc.line(M,29,CONTENT_RIGHT,29);y=36;
    }else{
      try{doc.addImage(logo,'PNG',M,11,40,8.1)}catch{}
      doc.setTextColor(...PDF_DARK_BLUE);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(`Feria Presentes 2026 · Pedido ${o.numero}`,CONTENT_RIGHT,16,{align:'right'});
      doc.setDrawColor(225,225,225);doc.line(M,21,CONTENT_RIGHT,21);y=28;
    }
  }

  function drawFooter(){
    doc.setDrawColor(200,205,212);doc.line(M,FOOTER_TOP,CONTENT_RIGHT,FOOTER_TOP);
    try{doc.addImage(logo,'PNG',M,262,34,6.9)}catch{}
    doc.setTextColor(65,70,78);doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text('Eklis S.A.',54,263.5);
    doc.setFont('helvetica','normal');doc.setFontSize(7.6);
    doc.text('CUIT: 30701266192 · IVA Responsable Inscripto',54,268);
    doc.text('Av. Espora 2051, Burzaco, Buenos Aires (1852).',54,272.5);
    doc.text('ventas@adhome.com.ar · 1128492161',54,277);
    doc.setTextColor(...PDF_DARK_BLUE);doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.text('Designed by LTapps',PW/2,292,{align:'center'});
  }

  function newPage(){drawFooter();doc.addPage();drawHeader(false);drawItemsHead();}
  function ensureSpace(h){if(y+h>FOOTER_TOP-6)newPage();}
  function drawItemsHead(){
    doc.setFillColor(245,246,248);doc.rect(M,y,182,8,'F');
    doc.setTextColor(70,70,70);doc.setFont('helvetica','bold');doc.setFontSize(8);
    doc.text('Artículo',M+2,y+5.2);doc.text('Cant.',145,y+5.2,{align:'right'});doc.text('Precio',169,y+5.2,{align:'right'});doc.text('Importe',194,y+5.2,{align:'right'});y+=10;
  }

  drawHeader(true);
  doc.setTextColor(30,30,30);doc.setFontSize(9);doc.setFont('helvetica','normal');
  doc.text(`Pedido: ${o.numero}`,M,y);doc.text(`Fecha: ${new Date(o.created_at).toLocaleString('es-AR')}`,74,y);y+=6;
  doc.setFont('helvetica','bold');doc.text('Cliente:',M,y);doc.setFont('helvetica','normal');doc.text(String(o.cliente_nombre_snapshot||'Sin cliente'),31,y);y+=5;
  doc.setFont('helvetica','bold');doc.text('Vendedor:',M,y);doc.setFont('helvetica','normal');doc.text(String(o.vendedor_nombre_snapshot||''),34,y);y+=9;
  drawItemsHead();

  for(const i of (o.pedido_items||[])){
    const desc=String(i.descripcion_snapshot||i.sku||'');
    const sku=String(i.sku||'');
    const obs=String(i.observacion_item||'');
    const descLines=doc.splitTextToSize(desc,102);
    const skuLine=obs?`${sku} · ${obs}`:sku;
    const skuLines=doc.splitTextToSize(skuLine,102);
    const rowH=Math.max(11,4.2*descLines.length+3.6*skuLines.length+3);
    ensureSpace(rowH+2);
    doc.setDrawColor(235,235,235);doc.line(M,y+rowH,CONTENT_RIGHT,y+rowH);
    doc.setTextColor(25,25,25);doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(descLines,M+2,y+4.5);
    const descH=4.2*descLines.length;
    doc.setTextColor(105,105,105);doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.text(skuLines,M+2,y+4.5+descH);
    doc.setTextColor(25,25,25);doc.setFontSize(8.4);doc.text(String(i.cantidad),145,y+5,{align:'right'});
    doc.text(money(Number(i.precio_unitario)),169,y+5,{align:'right'});
    doc.setFont('helvetica','bold');doc.text(money(Number(i.cantidad)*Number(i.precio_unitario)),194,y+5,{align:'right'});
    y+=rowH;
  }

  ensureSpace(48);
  y+=5;
  const labelX=131,valueX=194;
  doc.setFontSize(8.8);doc.setTextColor(55,55,55);doc.setFont('helvetica','normal');
  doc.text('Subtotal s/IVA',labelX,y);doc.text(money(o.subtotal_sin_iva),valueX,y,{align:'right'});y+=5;
  doc.text(`Descuento ${Number(o.descuento_pct||0)}%`,labelX,y);doc.text(money(o.descuento_importe),valueX,y,{align:'right'});y+=5;
  doc.setFont('helvetica','bold');doc.text('Neto s/IVA',labelX,y);doc.text(money(o.neto_sin_iva),valueX,y,{align:'right'});y+=5;
  doc.setFont('helvetica','normal');doc.text('IVA 21%',labelX,y);doc.text(money(o.iva_importe),valueX,y,{align:'right'});y+=6;
  doc.setDrawColor(80,80,80);doc.line(labelX,y-3.5,valueX,y-3.5);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('Total c/IVA',labelX,y+1);doc.text(money(o.total_con_iva),valueX,y+1,{align:'right'});y+=10;
  doc.setFontSize(8.2);doc.setFont('helvetica','normal');doc.setTextColor(70,70,70);
  const entrega=`Pago: ${o.forma_pago||''} · Entrega: ${o.modalidad_entrega||''}${o.transporte_snapshot?' · '+o.transporte_snapshot:''}`;
  doc.text(doc.splitTextToSize(entrega,182),M,y);y+=7;
  if(o.observaciones){const lines=doc.splitTextToSize(`Observaciones: ${o.observaciones}`,182);ensureSpace(lines.length*4+4);doc.setTextColor(35,35,35);doc.text(lines,M,y);y+=lines.length*4;}

  const pages=doc.getNumberOfPages();
  for(let p=1;p<=pages;p++){doc.setPage(p);drawFooter();doc.setTextColor(130,130,130);doc.setFont('helvetica','normal');doc.setFontSize(6.8);doc.text(`Página ${p} de ${pages}`,CONTENT_RIGHT,292,{align:'right'});}
  return {doc,blob:doc.output('blob'),filename:pdfFileNameV4(o)};
}

async function shareOrderPdfV4(o,target){
  try{
    const built=await buildOrderPdfV4(o);
    const file=new File([built.blob],built.filename,{type:'application/pdf'});
    if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
      await navigator.share({title:`Pedido ADHOME ${o.numero} - Feria Presentes 2026`,text:`Confirmación de pedido Adhome - Feria Presentes 2026${target?` · ${target}`:''}`,files:[file]});
      return;
    }
    built.doc.save(built.filename);
    toast(`El navegador no permite adjuntar el PDF directamente. Se descargó ${built.filename} para compartirlo.`);
  }catch(e){if(e?.name!=='AbortError')toast(e.message||String(e));}
}

async function downloadOrderPdfV4(o){try{const built=await buildOrderPdfV4(o);built.doc.save(built.filename)}catch(e){toast(e.message||String(e))}}

summaryHtml=function(){
  const s=cart.reduce((a,x)=>a+x.qty*Number(x.precio),0),p=Math.min(30,Math.max(0,Number($('#discount').value||0))),d=s*p/100,n=s-d,iv=n*.21,miss=missingClient(client);
  return `<div class="copy-card confirmation-sheet-v4"><div class="confirmation-body-v4"><div class="doc-head"><img src="./logo.png" alt="ADHOME"><div class="doc-name"><b>Confirmación de pedido Adhome</b><div class="fair-v4">Feria Presentes 2026</div></div></div><div class="meta"><b>Cliente:</b> ${esc(client?.razon_social||'Sin cliente')}<br><b>Vendedor:</b> ${esc(profile?.full_name||profile?.email||'')}</div><div class="order-lines">${cart.map(x=>`<div class="order-line"><div><b>${esc(x.descripcion)}</b><div class="meta">${esc(x.sku)}${x.observacion_item?' · '+esc(x.observacion_item):''}</div></div><div>${x.qty} u.</div><div class="right">${money(x.qty*x.precio)}</div></div>`).join('')}</div><div class="totals"><div><span>Subtotal s/IVA</span><b>${money(s)}</b></div><div><span>Descuento ${p}%</span><b>${money(d)}</b></div><div><span>Neto s/IVA</span><b>${money(n)}</b></div><div><span>IVA 21%</span><b>${money(iv)}</b></div><div class="grand"><span>Total c/IVA</span><b>${money(n+iv)}</b></div></div><div class="meta"><b>Pago:</b> ${esc($('#payment').value)} · <b>Entrega:</b> ${esc($('#delivery').value)}${$('#delivery').value==='Transporte'?' · '+esc($('#transport').value):''}</div>${$('#obs').value?`<div style="margin-top:8px"><b>Observaciones:</b> ${esc($('#obs').value)}</div>`:''}${miss.length?`<div class="warn tiny">Datos de cliente incompletos: ${miss.join(', ')}. No bloquea.</div>`:''}${cart.reduce((a,x)=>a+x.qty,0)<60?'<div class="warn tiny">Pedido menor a 60 unidades. No bloquea.</div>':''}</div>${footerPreviewHtmlV4()}</div><button id="doConfirm" class="btn primary big" style="width:100%;margin-top:12px">Confirmar pedido</button>`;
};

orderCopyHtml=function(o){
  return `<div class="copy-card confirmation-sheet-v4"><div class="confirmation-body-v4"><div class="doc-head"><img src="./logo.png" alt="ADHOME"><div class="doc-name"><b>Confirmación de pedido Adhome</b><div class="fair-v4">Feria Presentes 2026</div><span>Pedido ${o.numero} · ${new Date(o.created_at).toLocaleString('es-AR')}</span></div></div><div><b>Cliente:</b> ${esc(o.cliente_nombre_snapshot||'Sin cliente')}<br><b>Vendedor:</b> ${esc(o.vendedor_nombre_snapshot||'')}</div><div class="order-lines">${(o.pedido_items||[]).map(i=>`<div class="order-line"><div><b>${esc(i.descripcion_snapshot)}</b><div class="meta">${esc(i.sku)}${i.observacion_item?' · '+esc(i.observacion_item):''}</div></div><div>${i.cantidad} u.</div><div class="right">${money(i.cantidad*Number(i.precio_unitario))}</div></div>`).join('')}</div><div class="totals"><div><span>Subtotal s/IVA</span><b>${money(o.subtotal_sin_iva)}</b></div><div><span>Descuento ${Number(o.descuento_pct||0)}%</span><b>${money(o.descuento_importe)}</b></div><div><span>Neto s/IVA</span><b>${money(o.neto_sin_iva)}</b></div><div><span>IVA 21%</span><b>${money(o.iva_importe)}</b></div><div class="grand"><span>Total c/IVA</span><b>${money(o.total_con_iva)}</b></div></div><div class="meta" style="margin-top:8px"><b>Pago:</b> ${esc(o.forma_pago||'')} · <b>Entrega:</b> ${esc(o.modalidad_entrega||'')}${o.transporte_snapshot?' · '+esc(o.transporte_snapshot):''}</div>${o.observaciones?`<div style="margin-top:8px"><b>Observaciones:</b> ${esc(o.observaciones)}</div>`:''}</div>${footerPreviewHtmlV4()}</div>`;
};

openOrder=function(o,justConfirmed=false){
  modal(justConfirmed?'Pedido confirmado':'Detalle de pedido',`${orderCopyHtml(o)}${o.unidades_pendientes?`<div class="warn tiny no-print">Interno: ${o.unidades_pendientes} unidad/es pendientes por stock. Este dato no se incluye en el PDF del cliente.</div>`:''}<div class="share-row no-print" style="margin-top:12px"><button id="ow" class="btn">WhatsApp PDF</button><button id="oe" class="btn">Email PDF</button><button id="odl" class="btn">Descargar PDF</button><button id="op" class="btn">Imprimir</button></div>`);
  $('#ow').onclick=()=>shareOrderPdfV4(o,'WhatsApp');
  $('#oe').onclick=()=>shareOrderPdfV4(o,'Email');
  $('#odl').onclick=()=>downloadOrderPdfV4(o);
  $('#op').onclick=()=>{const p=$('#printArea');p.innerHTML=orderCopyHtml(o);p.classList.remove('hidden');window.print();p.classList.add('hidden')};
};
