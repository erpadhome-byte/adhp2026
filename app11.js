// PRESENTES 2026 CLOUD V0.4.4 - alta SKU robusta + importacion stock con autocreacion
function normSkuV11(s){return String(s||'').trim().toUpperCase().replace(/\s+/g,'')}

// Corrige el caso en que el select muestra una categoria pero el valor leido queda vacio
// por restauracion/autofill del navegador o refresco asincronico de opciones.
openManual=function(prefill=''){
  const cats=categoriesLocalV10();
  modal('SKU manual',`<div class="warn tiny">Stock inicial 0. No bloquea la confirmación.</div><div class="tiny muted" style="margin:4px 0 8px">* Campos obligatorios</div><input id="msku" placeholder="SKU *" value="${esc(prefill)}"><input id="mdesc" placeholder="Artículo / descripción *"><div class="grid2"><div><select id="mcat" autocomplete="off">${catOptionsV10(cats)}</select><input id="mcatnew" class="hidden" placeholder="Nueva categoría *" style="margin-top:7px"></div><input id="mprod" placeholder="Producto"><input id="mcolor" placeholder="Color"><input id="msize" placeholder="Medida"></div><input id="mprice" type="number" min="0.01" step="0.01" placeholder="Precio s/IVA *"><textarea id="mobs" placeholder="Observación del SKU manual"></textarea><button id="msave" class="btn primary">Crear y agregar</button>`);

  const sel=$('#mcat'),newInput=$('#mcatnew');
  // Fuerza un estado inicial real y visible; evita valores visuales restaurados por mobile.
  sel.selectedIndex=0;sel.value='';sel.dataset.category='';
  const syncCategory=()=>{
    const isNew=sel.value==='__NEW__';
    newInput.classList.toggle('hidden',!isNew);
    sel.dataset.category=isNew?'':String(sel.value||'').trim();
    if(isNew)setTimeout(()=>newInput.focus(),20);
  };
  sel.onchange=syncCategory;sel.oninput=syncCategory;

  function selectedCategoryV11(){
    if(sel.value==='__NEW__')return newInput.value.trim();
    let value=String(sel.value||sel.dataset.category||'').trim();
    if(!value && sel.selectedIndex>0){
      const opt=sel.options[sel.selectedIndex];
      const candidate=String(opt?.value||opt?.textContent||'').trim();
      if(candidate && candidate!=='__NEW__' && !/^seleccionar categor/i.test(candidate))value=candidate;
    }
    return value;
  }

  $('#msave').onclick=async()=>{
    const sku=normSkuV11($('#msku').value),desc=$('#mdesc').value.trim(),priceRaw=$('#mprice').value.trim(),price=Number(priceRaw);
    let category=selectedCategoryV11();
    const faltan=[];
    if(!sku)faltan.push('SKU');
    if(!desc)faltan.push('Descripción');
    if(!category)faltan.push('Categoría');
    if(!priceRaw||!Number.isFinite(price)||price<=0)faltan.push('Precio s/IVA');
    if(faltan.length)return toast(`Completá los campos obligatorios: ${faltan.join(', ')}.`);

    const existing=await categoriesOnlineV10();
    const exact=existing.find(c=>normCatV10(c)===normCatV10(category));
    if(exact)category=exact;
    else if(sel.value==='__NEW__'){
      const similar=existing.find(c=>{const a=normCatV10(c),b=normCatV10(category);if(!a||!b)return false;if(a===b)return true;const d=levV10(a,b);return Math.min(a.length,b.length)>=5&&d<=2});
      if(similar)return toast(`Ya existe una categoría muy similar: “${similar}”. Elegila del listado para evitar duplicados.`);
    }

    const body={sku,descripcion:desc,tipo:category,producto:$('#mprod').value.trim()||null,color:$('#mcolor').value.trim()||null,medida:$('#msize').value.trim()||null,unidad_venta:'UN',precio:price,stock_inicial:0,stock_disponible:0,manual:true,activo:true,observacion_manual:$('#mobs').value.trim()||null};
    const {data,error}=await sb.from('productos').upsert(body,{onConflict:'sku'}).select().single();
    if(error)return toast(error.message);
    closeModal();addProduct({...data,observacion_item:body.observacion_manual||''});
    try{await cacheMasters()}catch{}
    loadProducts('');
    toast(`SKU ${sku} creado correctamente.`);
  };
};

// Preview real: indica cuantos SKU existen y cuantos se van a crear automaticamente.
renderStockPreviewV5=async function(){
  const box=$('#stockImportPreview');
  if(!stockImportRowsV5.length){box.innerHTML='';return}
  const sample=stockImportRowsV5.slice(0,12);
  let summary=`<div class="okbox tiny"><b>${stockImportRowsV5.length} filas listas para validar.</b></div>`;
  try{
    const {data,error}=await sb.from('productos').select('sku').limit(5000);
    if(error)throw error;
    const known=new Set((data||[]).map(p=>normSkuV11(p.sku)));
    const missing=stockImportRowsV5.filter(r=>!known.has(normSkuV11(r.sku)));
    const found=stockImportRowsV5.length-missing.length;
    summary=`<div class="${missing.length?'warn':'okbox'} tiny"><b>${stockImportRowsV5.length} filas · ${found} SKU encontrados · ${missing.length} SKU nuevos.</b>${missing.length?`<br>Los SKU nuevos se crearán automáticamente con NOMBRE, stock cargado y precio 0 para completar después.${missing.slice(0,8).length?`<br><b>Nuevos:</b> ${missing.slice(0,8).map(r=>esc(r.sku)).join(', ')}${missing.length>8?'…':''}`:''}`:'<br>Todos los SKU ya existen en el maestro.'}</div>`;
  }catch(e){summary=`<div class="warn tiny"><b>${stockImportRowsV5.length} filas listas.</b><br>No se pudo hacer la prevalidación online; la validación final se hará al importar.</div>`}
  box.innerHTML=`${summary}<div class="import-preview"><table><thead><tr><th>SKU</th><th>NOMBRE</th><th>CANTIDAD</th></tr></thead><tbody>${sample.map(r=>`<tr><td>${esc(r.sku)}</td><td>${esc(r.nombre)}</td><td>${r.cantidad}</td></tr>`).join('')}</tbody></table></div>`;
  $('#stockReplaceBtn').disabled=false;$('#stockAddBtn').disabled=false;
};

runStockImportV5=async function(mode){
  if(!stockImportRowsV5.length)return toast('Seleccioná un Excel primero.');
  if(mode==='REEMPLAZAR'&&!confirm('PISAR TODO EL STOCK ACTUAL\n\nEsta opción pondrá en 0 el stock de los SKU que no estén en el Excel y cargará exactamente las cantidades del archivo. Los SKU nuevos del Excel se crearán automáticamente.\n\n¿Continuar?'))return;
  const btn=mode==='REEMPLAZAR'?$('#stockReplaceBtn'):$('#stockAddBtn');
  btn.disabled=true;btn.textContent='Procesando...';
  try{
    const {data,error}=await sb.rpc('importar_stock_excel',{p_rows:stockImportRowsV5,p_modo:mode});
    if(error)throw error;
    if(!data?.ok){
      const parts=[];
      if(data.duplicados?.length)parts.push(`SKU duplicados en el Excel: ${data.duplicados.slice(0,15).join(', ')}`);
      if(data.invalidos?.length)parts.push(`Filas inválidas: ${data.invalidos.slice(0,15).join(', ')}`);
      if(data.no_encontrados?.length&&!data.creables?.length)parts.push(`SKU no encontrados: ${data.no_encontrados.slice(0,15).join(', ')}`);
      $('#stockImportResult').innerHTML=`<div class="errorbox tiny"><b>No se modificó ningún stock.</b><br>${esc(parts.join('\n')||'La importación no superó la validación.')}</div>`;
      return;
    }
    const created=Number(data.skus_creados||0),createdList=data.lista_skus_creados||[];
    $('#stockImportResult').innerHTML=`<div class="okbox tiny"><b>Importación aplicada.</b><br>Modo: ${mode==='REEMPLAZAR'?'Pisar stock':'Sumar stock'} · ${data.filas} SKU procesados.${created?`<br><b>${created} SKU nuevos creados automáticamente.</b>${createdList.length?` ${createdList.slice(0,10).map(esc).join(', ')}${createdList.length>10?'…':''}`:''}`:''}<br>Stock total antes: ${data.stock_total_antes} · después: ${data.stock_total_despues}.</div>`;
    stockImportRowsV5=[];$('#stockFile').value='';$('#stockImportPreview').innerHTML='';$('#stockReplaceBtn').disabled=true;$('#stockAddBtn').disabled=true;
    await Promise.all([cacheMasters(),loadProducts(''),loadAdmin()]);
  }catch(e){
    $('#stockImportResult').innerHTML=`<div class="errorbox tiny">${esc(e.message||String(e))}</div>`;
  }finally{
    btn.disabled=false;btn.textContent=mode==='REEMPLAZAR'?'1. Pisar todo el stock actual':'2. Sumar al stock actual';
  }
};
