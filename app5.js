// PRESENTES 2026 CLOUD V0.3.8 - admin search, stock Excel import, order/dashboard exports
const V5_BLUE=[23,54,93];
let stockImportRowsV5=[];

const v5Style=document.createElement('style');
v5Style.textContent=`
.admin-suggest{max-height:260px;overflow:auto;border:1px solid #e5e7eb;border-radius:11px;margin:-5px 0 10px;background:#fff}
.admin-suggest:empty{display:none}.admin-suggest .result{padding:9px 10px}
.admin-divider{border:0;border-top:1px solid #e5e7eb;margin:16px 0}
.import-preview{max-height:260px;overflow:auto;border:1px solid #e5e7eb;border-radius:10px;margin:10px 0}.import-preview table{width:100%;border-collapse:collapse}.import-preview th,.import-preview td{font-size:11px;padding:6px;border-bottom:1px solid #eee;text-align:left}.import-preview th{position:sticky;top:0;background:#f7f7f8}
.report-actions{display:flex;gap:7px;flex-wrap:wrap;margin:4px 0 10px}.report-actions .btn{flex:0 0 auto}
.danger-action{background:#fff5f5!important;border-color:#f0b8b8!important;color:#9f1c1c!important}
`;
document.head.appendChild(v5Style);

function safeSearchV5(q){return String(q||'').trim().replace(/[,%()]/g,' ')}
async function adminProductSearchV5(q,box,onPick){
  q=safeSearchV5(q);if(!q){box.innerHTML='';return}
  const {data,error}=await sb.from('productos').select('*').or(`sku.ilike.%${q}%,descripcion.ilike.%${q}%,producto.ilike.%${q}%,color.ilike.%${q}%,medida.ilike.%${q}%`).order('descripcion').limit(12);
  if(error){box.innerHTML=`<div class="errorbox tiny">${esc(error.message)}</div>`;return}
  box.innerHTML=(data||[]).length?(data||[]).map((p,i)=>`<div class="result" data-v5idx="${i}"><b>${esc(p.descripcion)}</b><div class="meta">${esc(p.sku)} · Stock ${p.stock_disponible} · ${money(p.precio)} + IVA</div></div>`).join(''):'<div class="search-empty">Sin coincidencias.</div>';
  box.onclick=e=>{const r=e.target.closest('[data-v5idx]');if(!r)return;const p=data[Number(r.dataset.v5idx)];box.innerHTML='';onPick(p)};
}
function renderProductAdminV5(p){
  $('#pskuAdmin').value=p.sku;
  $('#prodAdmin').innerHTML=`<div class="okbox tiny"><b>${esc(p.descripcion)}</b><br>${esc(p.sku)} · Stock actual ${p.stock_disponible}</div><label>Descripción</label><input id="apdesc" value="${esc(p.descripcion)}"><label>Precio s/IVA</label><input id="apprice" type="number" min="0" value="${Number(p.precio)}"><label class="tiny"><input id="apactive" type="checkbox" ${p.activo?'checked':''} style="width:auto;margin-right:6px">Activo</label><br><button id="apsave" class="btn primary">Guardar producto</button>`;
  $('#apsave').onclick=async()=>{const {error}=await sb.rpc('actualizar_producto_admin',{p_sku:p.sku,p_precio:Number($('#apprice').value),p_descripcion:$('#apdesc').value.trim(),p_activo:$('#apactive').checked});if(error)return toast(error.message);toast('Producto actualizado');await Promise.all([loadProducts(''),cacheMasters(),loadAdmin()]);$('#loadProdAdmin').click()};
}
async function loadProductAdminV5(){
  const q=$('#pskuAdmin').value.trim();if(!q)return;
  const exact=await sb.from('productos').select('*').ilike('sku',q).limit(1);
  if(exact.data?.length)return renderProductAdminV5(exact.data[0]);
  await adminProductSearchV5(q,$('#adminPriceSuggest'),renderProductAdminV5);
}

function normalizeHeaderV5(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'')}
function parseStockWorkbookV5(file){
  return file.arrayBuffer().then(buf=>{
    if(!window.XLSX)throw Error('No se pudo cargar el lector de Excel. Recargá la app.');
    const wb=XLSX.read(buf,{type:'array'});if(!wb.SheetNames.length)throw Error('El Excel no tiene hojas.');
    const ws=wb.Sheets[wb.SheetNames[0]];const raw=XLSX.utils.sheet_to_json(ws,{defval:'',raw:true});if(!raw.length)throw Error('El Excel no tiene filas de datos.');
    const keys=Object.keys(raw[0]);const map={};keys.forEach(k=>map[normalizeHeaderV5(k)]=k);
    const kSku=map.SKU,kNom=map.NOMBRE||map.DESCRIPCION||map.ARTICULO,kCant=map.CANTIDAD||map.CANT||map.QTY;
    if(!kSku||!kNom||!kCant)throw Error('La primera fila debe tener las columnas SKU, NOMBRE y CANTIDAD.');
    const rows=[];for(let idx=0;idx<raw.length;idx++){
      const r=raw[idx],sku=String(r[kSku]??'').trim().toUpperCase(),nombre=String(r[kNom]??'').trim(),n=Number(r[kCant]);
      if(!sku&&!nombre&&String(r[kCant]??'').trim()==='')continue;
      if(!sku)throw Error(`Fila ${idx+2}: falta SKU.`);if(!Number.isInteger(n)||n<0)throw Error(`Fila ${idx+2} (${sku}): CANTIDAD debe ser un entero mayor o igual a 0.`);
      rows.push({sku,nombre,cantidad:n});
    }
    if(!rows.length)throw Error('No hay filas válidas.');return rows;
  });
}
function renderStockPreviewV5(){
  const box=$('#stockImportPreview');if(!stockImportRowsV5.length){box.innerHTML='';return}
  const sample=stockImportRowsV5.slice(0,12);box.innerHTML=`<div class="okbox tiny"><b>${stockImportRowsV5.length} filas listas para validar.</b> Se muestran las primeras ${sample.length}.</div><div class="import-preview"><table><thead><tr><th>SKU</th><th>NOMBRE</th><th>CANTIDAD</th></tr></thead><tbody>${sample.map(r=>`<tr><td>${esc(r.sku)}</td><td>${esc(r.nombre)}</td><td>${r.cantidad}</td></tr>`).join('')}</tbody></table></div>`;
  $('#stockReplaceBtn').disabled=false;$('#stockAddBtn').disabled=false;
}
async function runStockImportV5(mode){
  if(!stockImportRowsV5.length)return toast('Seleccioná un Excel primero.');
  if(mode==='REEMPLAZAR'&&!confirm('PISAR TODO EL STOCK ACTUAL\n\nEsta opción pondrá en 0 el stock de todos los SKU y luego cargará exactamente las cantidades del Excel.\n\n¿Continuar?'))return;
  const btn=mode==='REEMPLAZAR'?$('#stockReplaceBtn'):$('#stockAddBtn');btn.disabled=true;btn.textContent='Procesando...';
  try{
    const {data,error}=await sb.rpc('importar_stock_excel',{p_rows:stockImportRowsV5,p_modo:mode});if(error)throw error;
    if(!data?.ok){
      const parts=[];if(data.no_encontrados?.length)parts.push(`SKU no encontrados: ${data.no_encontrados.slice(0,15).join(', ')}`);if(data.duplicados?.length)parts.push(`SKU duplicados: ${data.duplicados.slice(0,15).join(', ')}`);if(data.invalidos?.length)parts.push(`Filas inválidas: ${data.invalidos.slice(0,15).join(', ')}`);
      $('#stockImportResult').innerHTML=`<div class="errorbox tiny"><b>No se modificó ningún stock.</b><br>${esc(parts.join('\n'))}</div>`;return;
    }
    $('#stockImportResult').innerHTML=`<div class="okbox tiny"><b>Importación aplicada.</b><br>Modo: ${mode==='REEMPLAZAR'?'Pisar stock':'Sumar stock'} · ${data.filas} SKU.<br>Stock total antes: ${data.stock_total_antes} · después: ${data.stock_total_despues}.</div>`;
    stockImportRowsV5=[];$('#stockFile').value='';$('#stockImportPreview').innerHTML='';$('#stockReplaceBtn').disabled=true;$('#stockAddBtn').disabled=true;await Promise.all([cacheMasters(),loadProducts(''),loadAdmin()]);
  }catch(e){$('#stockImportResult').innerHTML=`<div class="errorbox tiny">${esc(e.message||String(e))}</div>`}finally{btn.disabled=false;btn.textContent=mode==='REEMPLAZAR'?'1. Pisar todo el stock actual':'2. Sumar al stock actual'}
}
function stockTemplateV5(){
  const ws=XLSX.utils.aoa_to_sheet([['SKU','NOMBRE','CANTIDAD']]);ws['!cols']=[{wch:24},{wch:45},{wch:14}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'STOCK');XLSX.writeFile(wb,'Plantilla_Stock_ADHOME.xlsx');
}

async function allOrdersV5(confirmedOnly=false){
  let q=sb.from('pedidos').select('*,pedido_items(*)').order('created_at',{ascending:false}).limit(5000);if(confirmedOnly)q=q.eq('estado','CONFIRMADO');const {data,error}=await q;if(error)throw error;return data||[];
}
function orderRowsV5(orders){return orders.map(o=>({
  Pedido:o.numero,Fecha:new Date(o.created_at),Cliente:o.cliente_nombre_snapshot||'',CUIT:o.cliente_cuit_snapshot||'',Direccion_Entrega:o.cliente_domicilio_entrega_snapshot||'',Localidad:o.cliente_localidad_snapshot||'',Provincia:o.cliente_provincia_snapshot||'',Vendedor:o.vendedor_nombre_snapshot||'',Pago:o.forma_pago||'',Envio:o.modalidad_entrega||'',Expreso:o.transporte_snapshot||'',Descuento_Pct:Number(o.descuento_pct||0),Subtotal_sin_IVA:Number(o.subtotal_sin_iva||0),Descuento_Importe:Number(o.descuento_importe||0),Neto_sin_IVA:Number(o.neto_sin_iva||0),IVA:Number(o.iva_importe||0),Total_con_IVA:Number(o.total_con_iva||0),Unidades:Number(o.unidades||0),Pendientes:Number(o.unidades_pendientes||0),Observaciones:o.observaciones||'',Estado:o.estado||''
}))}
function detailRowsV5(orders){const rows=[];orders.forEach(o=>(o.pedido_items||[]).forEach(i=>rows.push({Pedido:o.numero,Fecha:new Date(o.created_at),Cliente:o.cliente_nombre_snapshot||'',Vendedor:o.vendedor_nombre_snapshot||'',SKU:i.sku||'',Articulo:i.descripcion_snapshot||'',Tipo:i.tipo_snapshot||'',Producto:i.producto_snapshot||'',Color:i.color_snapshot||'',Medida:i.medida_snapshot||'',Cantidad:Number(i.cantidad||0),Precio_Unitario_sin_IVA:Number(i.precio_unitario||0),Total_Linea_sin_IVA:Number(i.subtotal||0),Con_Stock:Number(i.cantidad_con_stock||0),Pendiente:Number(i.cantidad_pendiente||0)})));return rows}
function addSheetV5(wb,name,rows,widths){const ws=XLSX.utils.json_to_sheet(rows,{cellDates:true});if(widths)ws['!cols']=widths.map(w=>({wch:w}));XLSX.utils.book_append_sheet(wb,ws,name)}
function workbookBlobV5(wb){const arr=XLSX.write(wb,{bookType:'xlsx',type:'array'});return new Blob([arr],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
function downloadBlobV5(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)}
async function shareBlobV5(blob,name,title){const file=new File([blob],name,{type:blob.type});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){try{await navigator.share({title,files:[file]});return}catch(e){if(e?.name==='AbortError')return}}downloadBlobV5(blob,name);toast('El navegador no permite compartir el archivo directamente; se descargó para que lo adjuntes.')}
async function exportOrdersExcelV5(){try{const orders=await allOrdersV5(false),wb=XLSX.utils.book_new();addSheetV5(wb,'Pedidos',orderRowsV5(orders),[10,19,30,16,35,18,18,24,22,20,22,14,18,18,18,16,18,12,12,35,14]);addSheetV5(wb,'Detalle',detailRowsV5(orders),[10,19,28,22,24,40,18,24,18,14,12,18,18,12,12]);downloadBlobV5(workbookBlobV5(wb),'Pedidos_ADHOME_Feria_Presentes_2026.xlsx')}catch(e){toast(e.message||String(e))}}

function dashDataV5(orders){
  const sales=orders.reduce((s,o)=>s+Number(o.neto_sin_iva||0),0),units=orders.reduce((s,o)=>s+Number(o.unidades||0),0),pending=orders.reduce((s,o)=>s+Number(o.unidades_pendientes||0),0),clients=new Set(orders.map(o=>o.cliente_id).filter(Boolean)).size;
  const sellers={},products={},cats={},hours={};
  orders.forEach(o=>{sellers[o.vendedor_nombre_snapshot||'Sin vendedor']=(sellers[o.vendedor_nombre_snapshot||'Sin vendedor']||0)+Number(o.neto_sin_iva||0);const d=new Date(o.created_at),h=`${d.toLocaleDateString('es-AR')} ${String(d.getHours()).padStart(2,'0')}:00`;hours[h]=(hours[h]||0)+Number(o.neto_sin_iva||0);(o.pedido_items||[]).forEach(i=>{const factor=1-Number(o.descuento_pct||0)/100,v=Number(i.subtotal||0)*factor,k=i.descripcion_snapshot||i.sku||'Sin nombre';products[k]??={unidades:0,venta:0};products[k].unidades+=Number(i.cantidad||0);products[k].venta+=v;const c=i.tipo_snapshot||'Sin categoría';cats[c]=(cats[c]||0)+v})});
  return {sales,orders:orders.length,clients,ticket:orders.length?sales/orders.length:0,units,pending,sellers:Object.entries(sellers).sort((a,b)=>b[1]-a[1]),products:Object.entries(products).sort((a,b)=>b[1].venta-a[1].venta),cats:Object.entries(cats).sort((a,b)=>b[1]-a[1]),hours:Object.entries(hours).sort((a,b)=>a[0].localeCompare(b[0]))};
}
async function dashExcelV5(){try{const orders=await allOrdersV5(true),d=dashDataV5(orders),wb=XLSX.utils.book_new();addSheetV5(wb,'Resumen',[{Indicador:'Ventas s/IVA',Valor:d.sales},{Indicador:'Pedidos',Valor:d.orders},{Indicador:'Clientes',Valor:d.clients},{Indicador:'Ticket promedio',Valor:d.ticket},{Indicador:'Unidades',Valor:d.units},{Indicador:'Pendientes',Valor:d.pending}],[24,20]);addSheetV5(wb,'Vendedores',d.sellers.map(([Vendedor,Venta_sin_IVA])=>({Vendedor,Venta_sin_IVA})),[30,20]);addSheetV5(wb,'Top Productos',d.products.map(([Articulo,x])=>({Articulo,Unidades:x.unidades,Venta_sin_IVA:x.venta})),[45,14,20]);addSheetV5(wb,'Categorias',d.cats.map(([Categoria,Venta_sin_IVA])=>({Categoria,Venta_sin_IVA})),[30,20]);addSheetV5(wb,'Por Hora',d.hours.map(([Fecha_Hora,Venta_sin_IVA])=>({Fecha_Hora,Venta_sin_IVA})),[24,20]);addSheetV5(wb,'Pedidos',orderRowsV5(orders),[10,19,30,16,35,18,18,24,22,20,22,14,18,18,18,16,18,12,12,35,14]);addSheetV5(wb,'Detalle',detailRowsV5(orders),[10,19,28,22,24,40,18,24,18,14,12,18,18,12,12]);await shareBlobV5(workbookBlobV5(wb),'Dashboard_ADHOME_Feria_Presentes_2026.xlsx','Dashboard ADHOME · Feria Presentes 2026')}catch(e){toast(e.message||String(e))}}
async function dashPdfV5(){
  try{
    const orders=await allOrdersV5(true),d=dashDataV5(orders);if(!window.jspdf?.jsPDF)throw Error('No se pudo cargar el generador PDF.');const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'}),logo=typeof pdfLogoDataV4==='function'?await pdfLogoDataV4():null;let y=14;
    if(logo)try{doc.addImage(logo,'PNG',14,12,48,9.7)}catch{}
    doc.setFont('helvetica','bold');doc.setFontSize(17);doc.setTextColor(20,20,20);doc.text('Dashboard · Feria Presentes 2026',196,17,{align:'right'});doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(100,100,100);doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`,196,23,{align:'right'});doc.setDrawColor(210,210,210);doc.line(14,29,196,29);y=36;
    const kpis=[['Ventas s/IVA',money(d.sales)],['Pedidos',String(d.orders)],['Clientes',String(d.clients)],['Ticket promedio',money(d.ticket)],['Unidades',String(d.units)],['Pendientes',String(d.pending)]];kpis.forEach((k,i)=>{const col=i%3,row=Math.floor(i/3),x=14+col*61,yy=y+row*22;doc.setFillColor(247,247,248);doc.roundedRect(x,yy,57,18,2,2,'F');doc.setFontSize(7.5);doc.setTextColor(100,100,100);doc.text(k[0],x+3,yy+5);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(25,25,25);doc.text(k[1],x+3,yy+13);doc.setFont('helvetica','normal')});y+=50;
    const section=(title,rows,format)=>{doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(...V5_BLUE);doc.text(title,14,y);y+=5;doc.setFont('helvetica','normal');doc.setTextColor(40,40,40);doc.setFontSize(8);rows.slice(0,8).forEach((r,i)=>{doc.text(`${i+1}. ${String(r[0]).slice(0,52)}`,16,y);doc.text(format(r[1]),194,y,{align:'right'});y+=5});y+=5};
    section('Ventas por vendedor',d.sellers,v=>money(v));section('Top productos',d.products.map(([k,v])=>[k,v.venta]),v=>money(v));section('Top categorías',d.cats,v=>money(v));
    if(y>245){doc.addPage();y=18}doc.setFont('helvetica','bold');doc.setTextColor(...V5_BLUE);doc.setFontSize(10);doc.text('Últimos pedidos',14,y);y+=6;doc.setFont('helvetica','normal');doc.setTextColor(40,40,40);doc.setFontSize(7.5);orders.slice(0,10).forEach(o=>{doc.text(`Pedido ${o.numero} · ${String(o.cliente_nombre_snapshot||'Sin cliente').slice(0,44)} · ${o.unidades} u.`,16,y);doc.text(money(o.neto_sin_iva),194,y,{align:'right'});y+=5});
    const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setDrawColor(220,220,220);doc.line(14,282,196,282);doc.setTextColor(...V5_BLUE);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text('Designed by LTapps',105,291,{align:'center'});doc.setTextColor(130,130,130);doc.setFont('helvetica','normal');doc.text(`Página ${p} de ${pages}`,196,291,{align:'right'})}
    const blob=doc.output('blob');await shareBlobV5(blob,'Dashboard_ADHOME_Feria_Presentes_2026.pdf','Dashboard ADHOME · Feria Presentes 2026');
  }catch(e){toast(e.message||String(e))}
}

function setupV5(){
  // Autocomplete en administración
  const asku=$('#asku'),psku=$('#pskuAdmin');if(asku&&!$('#adminStockSuggest')){const d=document.createElement('div');d.id='adminStockSuggest';d.className='admin-suggest';asku.insertAdjacentElement('afterend',d);asku.placeholder='Buscar por SKU o nombre';asku.addEventListener('input',debounce(()=>adminProductSearchV5(asku.value,d,p=>{asku.value=p.sku;$('#aresult').innerHTML=`<b>${esc(p.descripcion)}</b> · ${esc(p.sku)} · Stock actual ${p.stock_disponible}`}),220))}
  if(psku&&!$('#adminPriceSuggest')){const d=document.createElement('div');d.id='adminPriceSuggest';d.className='admin-suggest';psku.insertAdjacentElement('afterend',d);psku.placeholder='Buscar por SKU o nombre';psku.addEventListener('input',debounce(()=>adminProductSearchV5(psku.value,d,renderProductAdminV5),220));$('#loadProdAdmin').onclick=loadProductAdminV5}

  // Importación Excel stock
  const stockCard=asku?.closest('.card');if(stockCard&&!$('#stockImportBlock')){const b=document.createElement('div');b.id='stockImportBlock';b.innerHTML=`<hr class="admin-divider"><div class="section-title">Importar stock desde Excel</div><div class="tiny muted">Columnas obligatorias: <b>SKU · NOMBRE · CANTIDAD</b>. Primero se valida todo el archivo; si hay errores no se modifica stock.</div><input id="stockFile" type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"><div class="row"><button id="stockTemplate" class="btn">Descargar plantilla</button><button id="stockReplaceBtn" class="btn danger-action" disabled>1. Pisar todo el stock actual</button><button id="stockAddBtn" class="btn" disabled>2. Sumar al stock actual</button></div><div id="stockImportPreview"></div><div id="stockImportResult"></div>`;stockCard.appendChild(b);$('#stockFile').onchange=async e=>{stockImportRowsV5=[];$('#stockImportResult').innerHTML='';$('#stockReplaceBtn').disabled=true;$('#stockAddBtn').disabled=true;try{const f=e.target.files?.[0];if(!f)return;stockImportRowsV5=await parseStockWorkbookV5(f);renderStockPreviewV5()}catch(err){$('#stockImportPreview').innerHTML=`<div class="errorbox tiny">${esc(err.message||String(err))}</div>`}};$('#stockTemplate').onclick=stockTemplateV5;$('#stockReplaceBtn').onclick=()=>runStockImportV5('REEMPLAZAR');$('#stockAddBtn').onclick=()=>runStockImportV5('SUMAR')}

  // Exportar pedidos
  const orderHead=$('#pedidos > .row');if(orderHead&&!$('#exportOrdersExcel')){const b=document.createElement('button');b.id='exportOrdersExcel';b.className='btn';b.style.flex='0 0 auto';b.textContent='Exportar Excel';b.onclick=exportOrdersExcelV5;orderHead.appendChild(b)}

  // Compartir dashboard
  const dash=$('#dash'),h=dash?.querySelector('h2');if(h&&!$('#dashActionsV5')){const a=document.createElement('div');a.id='dashActionsV5';a.className='report-actions';a.innerHTML='<button id="dashPdfV5" class="btn">Compartir PDF</button><button id="dashExcelV5" class="btn">Excel</button>';h.insertAdjacentElement('afterend',a);$('#dashPdfV5').onclick=dashPdfV5;$('#dashExcelV5').onclick=dashExcelV5}
}
setupV5();
