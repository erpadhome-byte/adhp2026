// PRESENTES 2026 CLOUD V0.3.9 - dashboard cantidades + pesos

function dashDataV6(orders){
  const sales=orders.reduce((s,o)=>s+Number(o.neto_sin_iva||0),0);
  const units=orders.reduce((s,o)=>s+Number(o.unidades||0),0);
  const pending=orders.reduce((s,o)=>s+Number(o.unidades_pendientes||0),0);
  const clients=new Set(orders.map(o=>o.cliente_id).filter(Boolean)).size;
  const sellers={},products={},cats={},hours={};

  orders.forEach(o=>{
    const seller=o.vendedor_nombre_snapshot||'Sin vendedor';
    sellers[seller]??={venta:0,unidades:0,pedidos:0};
    sellers[seller].venta+=Number(o.neto_sin_iva||0);
    sellers[seller].unidades+=Number(o.unidades||0);
    sellers[seller].pedidos+=1;

    const d=new Date(o.created_at);
    const h=`${d.toLocaleDateString('es-AR')} ${String(d.getHours()).padStart(2,'0')}:00`;
    hours[h]??={venta:0,unidades:0,pedidos:0};
    hours[h].venta+=Number(o.neto_sin_iva||0);
    hours[h].unidades+=Number(o.unidades||0);
    hours[h].pedidos+=1;

    (o.pedido_items||[]).forEach(i=>{
      const factor=1-Number(o.descuento_pct||0)/100;
      const venta=Number(i.subtotal||0)*factor;
      const cantidad=Number(i.cantidad||0);
      const pk=i.descripcion_snapshot||i.sku||'Sin nombre';
      products[pk]??={venta:0,unidades:0};
      products[pk].venta+=venta;
      products[pk].unidades+=cantidad;

      const cat=i.tipo_snapshot||'Sin categoría';
      cats[cat]??={venta:0,unidades:0};
      cats[cat].venta+=venta;
      cats[cat].unidades+=cantidad;
    });
  });

  return {
    sales,
    orders:orders.length,
    clients,
    ticket:orders.length?sales/orders.length:0,
    units,
    pending,
    sellers:Object.entries(sellers).sort((a,b)=>b[1].venta-a[1].venta),
    products:Object.entries(products).sort((a,b)=>b[1].venta-a[1].venta),
    cats:Object.entries(cats).sort((a,b)=>b[1].venta-a[1].venta),
    hours:Object.entries(hours).sort((a,b)=>a[0].localeCompare(b[0]))
  };
}

function dashBarV6(label,info,max){
  const pct=max?Math.max(2,Math.round(Number(info.venta||0)/max*100)):0;
  return `<div class="barrow"><div class="tiny">${esc(label)}</div><div class="bar"><i style="width:${pct}%"></i></div><div class="tiny right"><b>${Number(info.unidades||0)} u.</b><br>${money(info.venta)} s/IVA</div></div>`;
}

loadDash=async function(){
  const {data,error}=await sb.from('pedidos').select('*,pedido_items(*)').eq('estado','CONFIRMADO').order('created_at',{ascending:false}).limit(1200);
  if(error)return;
  const orders=data||[],d=dashDataV6(orders);
  $('#ksales').textContent=money(d.sales);
  $('#korders').textContent=d.orders;
  $('#kclients').textContent=d.clients;
  $('#kticket').textContent=money(d.ticket);
  $('#kunits').textContent=d.units;
  $('#kpending').textContent=d.pending;

  const maxSeller=d.sellers[0]?.[1]?.venta||0;
  $('#bySeller').innerHTML=d.sellers.map(([k,v])=>dashBarV6(k,v,maxSeller)).join('')||'<div class="muted tiny">Sin ventas.</div>';

  const today=new Date().toLocaleDateString('es-AR');
  const todayHours=d.hours.filter(([k])=>k.startsWith(today));
  const maxHour=Math.max(0,...todayHours.map(([,v])=>v.venta));
  $('#byHour').innerHTML=todayHours.map(([k,v])=>dashBarV6(k.split(' ')[1],v,maxHour)).join('')||'<div class="muted tiny">Sin ventas hoy.</div>';

  $('#topProducts').innerHTML=d.products.slice(0,10).map(([k,v])=>`<div class="result"><b>${esc(k)}</b><div class="meta"><b>${v.unidades} u.</b> · ${money(v.venta)} s/IVA</div></div>`).join('')||'<div class="muted tiny">Sin datos.</div>';
  $('#topCats').innerHTML=d.cats.slice(0,10).map(([k,v])=>`<div class="result"><b>${esc(k)}</b><div class="meta"><b>${v.unidades} u.</b> · ${money(v.venta)} s/IVA</div></div>`).join('')||'<div class="muted tiny">Sin datos.</div>';
  $('#recent').innerHTML=orders.slice(0,12).map(o=>`<div class="result"><b>Pedido ${o.numero} · ${Number(o.unidades||0)} u. · ${money(o.neto_sin_iva)} s/IVA</b><div class="meta">${esc(o.cliente_nombre_snapshot||'Sin cliente')} · ${esc(o.vendedor_nombre_snapshot||'')}</div></div>`).join('')||'<div class="muted tiny">Sin pedidos.</div>';
};

async function dashExcelV6(){
  try{
    const orders=await allOrdersV5(true),d=dashDataV6(orders),wb=XLSX.utils.book_new();
    addSheetV5(wb,'Resumen',[
      {Indicador:'Ventas s/IVA',Valor:d.sales},
      {Indicador:'Unidades vendidas',Valor:d.units},
      {Indicador:'Pedidos',Valor:d.orders},
      {Indicador:'Clientes',Valor:d.clients},
      {Indicador:'Ticket promedio',Valor:d.ticket},
      {Indicador:'Pendientes',Valor:d.pending}
    ],[24,20]);
    addSheetV5(wb,'Vendedores',d.sellers.map(([Vendedor,x])=>({Vendedor,Unidades:x.unidades,Pedidos:x.pedidos,Venta_sin_IVA:x.venta})),[30,14,12,20]);
    addSheetV5(wb,'Top Productos',d.products.map(([Articulo,x])=>({Articulo,Unidades:x.unidades,Venta_sin_IVA:x.venta})),[45,14,20]);
    addSheetV5(wb,'Categorias',d.cats.map(([Categoria,x])=>({Categoria,Unidades:x.unidades,Venta_sin_IVA:x.venta})),[30,14,20]);
    addSheetV5(wb,'Por Hora',d.hours.map(([Fecha_Hora,x])=>({Fecha_Hora,Unidades:x.unidades,Pedidos:x.pedidos,Venta_sin_IVA:x.venta})),[24,14,12,20]);
    addSheetV5(wb,'Pedidos',orderRowsV5(orders),[10,19,30,16,35,18,18,24,22,20,22,14,18,18,18,16,18,12,12,35,14]);
    addSheetV5(wb,'Detalle',detailRowsV5(orders),[10,19,28,22,24,40,18,24,18,14,12,18,18,12,12]);
    await shareBlobV5(workbookBlobV5(wb),'Dashboard_ADHOME_Feria_Presentes_2026.xlsx','Dashboard ADHOME · Feria Presentes 2026');
  }catch(e){toast(e.message||String(e))}
}

async function dashPdfV6(){
  try{
    const orders=await allOrdersV5(true),d=dashDataV6(orders);
    if(!window.jspdf?.jsPDF)throw Error('No se pudo cargar el generador PDF.');
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:'mm',format:'a4'});
    const logo=typeof pdfLogoDataV4==='function'?await pdfLogoDataV4():null;
    const M=14,R=196,FOOT=282;
    let y=14;
    if(logo)try{doc.addImage(logo,'PNG',M,12,48,9.7)}catch{}
    doc.setFont('helvetica','bold');doc.setFontSize(17);doc.setTextColor(20,20,20);doc.text('Dashboard · Feria Presentes 2026',R,17,{align:'right'});
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,100,100);doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`,R,23,{align:'right'});
    doc.setDrawColor(210,210,210);doc.line(M,29,R,29);y=36;

    const kpis=[['Ventas s/IVA',money(d.sales)],['Unidades',String(d.units)],['Pedidos',String(d.orders)],['Clientes',String(d.clients)],['Ticket promedio',money(d.ticket)],['Pendientes',String(d.pending)]];
    kpis.forEach((k,i)=>{const col=i%3,row=Math.floor(i/3),x=M+col*61,yy=y+row*22;doc.setFillColor(247,247,248);doc.roundedRect(x,yy,57,18,2,2,'F');doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(100,100,100);doc.text(k[0],x+3,yy+5);doc.setFont('helvetica','bold');doc.setFontSize(11.5);doc.setTextColor(25,25,25);doc.text(k[1],x+3,yy+13)});
    y+=50;

    function ensure(h){if(y+h>FOOT){doc.addPage();y=18}}
    function section(title,rows){
      ensure(12);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(23,54,93);doc.text(title,M,y);y+=6;
      if(!rows.length){doc.setFont('helvetica','normal');doc.setTextColor(120,120,120);doc.setFontSize(8);doc.text('Sin datos.',M,y);y+=7;return}
      rows.forEach(r=>{ensure(6);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(35,35,35);const name=doc.splitTextToSize(String(r[0]),105)[0];doc.text(name,M,y);doc.setFont('helvetica','bold');doc.text(`${Number(r[1].unidades||0)} u.`,145,y,{align:'right'});doc.text(money(r[1].venta),R,y,{align:'right'});y+=5});y+=3;
    }

    section('Ventas por vendedor',d.sellers.slice(0,12));
    section('Top productos',d.products.slice(0,12));
    section('Top categorías',d.cats.slice(0,12));
    const today=new Date().toLocaleDateString('es-AR');
    section('Ventas por hora de hoy',d.hours.filter(([k])=>k.startsWith(today)).map(([k,v])=>[k.split(' ')[1],v]));

    const pages=doc.getNumberOfPages();
    for(let p=1;p<=pages;p++){
      doc.setPage(p);doc.setDrawColor(210,210,210);doc.line(M,286,R,286);doc.setTextColor(23,54,93);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text('Designed by LTapps',105,292,{align:'center'});doc.setTextColor(130,130,130);doc.setFont('helvetica','normal');doc.text(`Página ${p} de ${pages}`,R,292,{align:'right'});
    }
    const blob=doc.output('blob');
    await shareBlobV5(blob,'Dashboard_ADHOME_Feria_Presentes_2026.pdf','Dashboard ADHOME · Feria Presentes 2026');
  }catch(e){toast(e.message||String(e))}
}

// Reasigna los botones ya creados por V0.3.8 para que las exportaciones coincidan con la pantalla.
if($('#dashPdfV5'))$('#dashPdfV5').onclick=dashPdfV6;
if($('#dashExcelV5'))$('#dashExcelV5').onclick=dashExcelV6;

// Si el dashboard está visible al actualizar la versión, refresca inmediatamente.
if($('#dash')?.classList.contains('active') && session)loadDash();
