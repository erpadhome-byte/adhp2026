// PRESENTES 2026 CLOUD V0.4.5 - categorias controladas en SKU manual
const CATEGORY_FALLBACK_V10=['Alfombra','Almohadon','Camino','Cuadro','Cubrecama','F. Edredon','Manta','Mantel','Pie de cama'];

function normCatV10(s){
  return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(x=>!['de','del','la','el','los','las'].includes(x)).join(' ');
}
function levV10(a,b){
  a=normCatV10(a);b=normCatV10(b);const m=a.length,n=b.length,dp=Array(n+1).fill(0).map((_,j)=>j);
  for(let i=1;i<=m;i++){let prev=dp[0];dp[0]=i;for(let j=1;j<=n;j++){const cur=dp[j];dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=cur}}
  return dp[n];
}
function categoriesLocalV10(){
  const vals=[...CATEGORY_FALLBACK_V10,...(productCache||[]).map(p=>p.tipo)].filter(x=>String(x||'').trim()).map(x=>String(x).trim());
  const map=new Map();vals.forEach(x=>{const k=normCatV10(x);if(k&&!map.has(k))map.set(k,x)});return [...map.values()].sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
}
async function categoriesOnlineV10(){
  const local=categoriesLocalV10();
  if(!navigator.onLine)return local;
  try{
    const {data,error}=await sb.from('productos').select('tipo').eq('activo',true).not('tipo','is',null).limit(2000);
    if(error)throw error;
    const map=new Map(local.map(x=>[normCatV10(x),x]));
    (data||[]).forEach(r=>{const x=String(r.tipo||'').trim(),k=normCatV10(x);if(k&&!map.has(k))map.set(k,x)});
    return [...map.values()].sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));
  }catch{return local}
}
function catOptionsV10(cats,selected=''){
  return `<option value="">Seleccionar categoría *</option>${cats.map(c=>`<option value="${esc(c)}" ${c===selected?'selected':''}>${esc(c)}</option>`).join('')}<option value="__NEW__">+ Nueva categoría…</option>`;
}
function visibleCategoryV10(sel,newInput){
  if(sel.value==='__NEW__')return String(newInput.value||'').trim();
  const opt=sel.selectedOptions&&sel.selectedOptions.length?sel.selectedOptions[0]:sel.options[sel.selectedIndex];
  const text=String(opt?.textContent||'').trim();
  const value=String(opt?.value||sel.value||'').trim();
  if(value&&value!=='__NEW__')return value;
  if(text&&!/^Seleccionar categoría/i.test(text)&&text!=='+ Nueva categoría…')return text;
  return '';
}

openManual=function(prefill=''){
  const cats=categoriesLocalV10();
  modal('SKU manual',`<div class="warn tiny">Stock inicial 0. No bloquea la confirmación.</div><div class="tiny muted" style="margin:4px 0 8px">* Campos obligatorios</div><input id="msku" placeholder="SKU *" value="${esc(prefill)}"><input id="mdesc" placeholder="Artículo / descripción *"><div class="grid2"><div><select id="mcat" autocomplete="off">${catOptionsV10(cats)}</select><input id="mcatnew" class="hidden" placeholder="Nueva categoría *" style="margin-top:7px"></div><input id="mprod" placeholder="Producto"><input id="mcolor" placeholder="Color"><input id="msize" placeholder="Medida"></div><input id="mprice" type="number" min="0.01" step="0.01" placeholder="Precio s/IVA *"><textarea id="mobs" placeholder="Observación del SKU manual"></textarea><button id="msave" class="btn primary">Crear y agregar</button>`);

  const sel=$('#mcat'),newInput=$('#mcatnew');
  sel.onchange=()=>{const isNew=sel.value==='__NEW__';newInput.classList.toggle('hidden',!isNew);if(isNew)setTimeout(()=>newInput.focus(),20)};

  categoriesOnlineV10().then(fresh=>{
    if(!document.body.contains(sel))return;
    const current=visibleCategoryV10(sel,newInput);
    sel.innerHTML=catOptionsV10(fresh,current&&current!=='__NEW__'?current:'');
    if(current==='__NEW__'){sel.value='__NEW__';newInput.classList.remove('hidden')}
  });

  $('#msave').onclick=async()=>{
    const sku=$('#msku').value.trim().toUpperCase().replace(/\s+/g,''),desc=$('#mdesc').value.trim(),priceRaw=$('#mprice').value.trim(),price=Number(priceRaw);
    let category=visibleCategoryV10(sel,newInput);
    const faltan=[];if(!sku)faltan.push('SKU');if(!desc)faltan.push('Descripción');if(!category)faltan.push('Categoría');if(!priceRaw||!Number.isFinite(price)||price<=0)faltan.push('Precio s/IVA');
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
