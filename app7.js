// PRESENTES 2026 CLOUD V0.4.0 - Excel pedidos: categoria y precio visibles
function detailRowsV7(orders){
  const rows=[];
  orders.forEach(o=>(o.pedido_items||[]).forEach(i=>{
    const qty=Number(i.cantidad||0), precio=Number(i.precio_unitario||0), total=Number(i.subtotal||qty*precio);
    rows.push({
      Pedido:o.numero,
      Fecha:new Date(o.created_at),
      Cliente:o.cliente_nombre_snapshot||'',
      CUIT:o.cliente_cuit_snapshot||'',
      Direccion_Entrega:o.cliente_domicilio_entrega_snapshot||'',
      Localidad:o.cliente_localidad_snapshot||'',
      Provincia:o.cliente_provincia_snapshot||'',
      Vendedor:o.vendedor_nombre_snapshot||'',
      SKU:i.sku||'',
      Categoria:i.tipo_snapshot||'',
      Producto:i.producto_snapshot||'',
      Articulo:i.descripcion_snapshot||'',
      Color:i.color_snapshot||'',
      Medida:i.medida_snapshot||'',
      Cantidad:qty,
      Precio_Unitario_sin_IVA:precio,
      Precio_Unitario_con_IVA:precio*1.21,
      Total_Linea_sin_IVA:total,
      Total_Linea_con_IVA:total*1.21,
      Con_Stock:Number(i.cantidad_con_stock||0),
      Pendiente:Number(i.cantidad_pendiente||0),
      Forma_Pago:o.forma_pago||'',
      Envio:o.modalidad_entrega||'',
      Expreso:o.transporte_snapshot||'',
      Descuento_Pedido_Pct:Number(o.descuento_pct||0),
      Estado:o.estado||''
    });
  }));
  return rows;
}

async function exportOrdersExcelV7(){
  try{
    const orders=await allOrdersV5(false),wb=XLSX.utils.book_new();
    addSheetV5(wb,'Pedidos_Detalle',detailRowsV7(orders),[10,19,30,16,35,18,18,24,24,18,24,40,18,14,12,20,20,20,20,12,12,22,20,22,16,14]);
    addSheetV5(wb,'Resumen_Pedidos',orderRowsV5(orders),[10,19,30,16,35,18,18,24,22,20,22,14,18,18,18,16,18,12,12,35,14]);
    downloadBlobV5(workbookBlobV5(wb),'Pedidos_ADHOME_Feria_Presentes_2026.xlsx');
  }catch(e){toast(e.message||String(e))}
}

const expBtnV7=document.getElementById('exportOrdersExcel');
if(expBtnV7){expBtnV7.onclick=exportOrdersExcelV7;expBtnV7.textContent='Exportar Excel'}
