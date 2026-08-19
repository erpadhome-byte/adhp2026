// PRESENTES 2026 CLOUD V0.4.7 - categoria libre en SKU manual
openManual=function(prefill=''){
  modal('SKU manual',`<div class="warn tiny">Stock inicial 0. No bloquea la confirmación.</div><div class="tiny muted" style="margin:4px 0 8px">* Campos obligatorios</div><input id="msku" placeholder="SKU *" value="${esc(prefill)}"><input id="mdesc" placeholder="Artículo / descripción *"><div class="grid2"><input id="mtype" placeholder="Categoría *"><input id="mprod" placeholder="Producto"><input id="mcolor" placeholder="Color"><input id="msize" placeholder="Medida"></div><input id="mprice" type="number" min="0.01" step="0.01" placeholder="Precio s/IVA *"><textarea id="mobs" placeholder="Observación del SKU manual"></textarea><button id="msave" class="btn primary">Crear y agregar</button>`);

  $('#msave').onclick=async()=>{
    const sku=(typeof normSkuV11==='function'?normSkuV11($('#msku').value):String($('#msku').value||'').trim().toUpperCase().replace(/\s+/g,''));
    const desc=$('#mdesc').value.trim();
    const category=$('#mtype').value.trim();
    const priceRaw=$('#mprice').value.trim();
    const price=Number(priceRaw);
    const faltan=[];
    if(!sku)faltan.push('SKU');
    if(!desc)faltan.push('Descripción');
    if(!category)faltan.push('Categoría');
    if(!priceRaw||!Number.isFinite(price)||price<=0)faltan.push('Precio s/IVA');
    if(faltan.length)return toast(`Completá los campos obligatorios: ${faltan.join(', ')}.`);

    const body={
      sku,
      descripcion:desc,
      tipo:category,
      producto:$('#mprod').value.trim()||null,
      color:$('#mcolor').value.trim()||null,
      medida:$('#msize').value.trim()||null,
      unidad_venta:'UN',
      precio:price,
      stock_inicial:0,
      stock_disponible:0,
      manual:true,
      activo:true,
      observacion_manual:$('#mobs').value.trim()||null
    };
    const {data,error}=await sb.from('productos').upsert(body,{onConflict:'sku'}).select().single();
    if(error)return toast(error.message);
    closeModal();
    addProduct({...data,observacion_item:body.observacion_manual||''});
    try{await cacheMasters()}catch{}
    loadProducts('');
    toast(`SKU ${sku} creado correctamente.`);
  };
};

import('./app14.js?v=050').then(()=>import('./app15.js?v=050')).then(()=>import('./app16.js?v=050')).catch(e=>console.error('No se pudo cargar módulos V0.5.0',e));
