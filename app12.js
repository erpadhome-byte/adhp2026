// PRESENTES 2026 CLOUD V0.4.6 - importacion stock con PRECIO opcional para SKU nuevos
function parsePriceV12(v){
  if(v===null||v===undefined||String(v).trim()==='')return null;
  if(typeof v==='number'){if(!Number.isFinite(v)||v<0)throw Error('Precio inválido');return v;}
  let s=String(v).trim().replace(/\$/g,'').replace(/\s+/g,'');
  if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');
  else if(s.includes(','))s=s.replace(',','.');
  const n=Number(s);if(!Number.isFinite(n)||n<0)throw Error('Precio inválido');return n;
}

parseStockWorkbookV5=function(file){
  return file.arrayBuffer().then(buf=>{
    if(!window.XLSX)throw Error('No se pudo cargar el lector de Excel. Recargá la app.');
    const wb=XLSX.read(buf,{type:'array'});if(!wb.SheetNames.length)throw Error('El Excel no tiene hojas.');
    const ws=wb.Sheets[wb.SheetNames[0]],raw=XLSX.utils.sheet_to_json(ws,{defval:'',raw:true});if(!raw.length)throw Error('El Excel no tiene filas de datos.');
    const keys=Object.keys(raw[0]),map={};keys.forEach(k=>map[normalizeHeaderV5(k)]=k);
    const kSku=map.SKU,kNom=map.NOMBRE||map.DESCRIPCION||map.ARTICULO,kCant=map.CANTIDAD||map.CANT||map.QTY;
    const kPrecio=map.PRECIO||map.PRECIOSIVA||map.PRECIOSINIVA||map.PRECIOUNITARIO||null;
    if(!kSku||!kNom||!kCant)throw Error('La primera fila debe tener las columnas SKU, NOMBRE y CANTIDAD. PRECIO es opcional.');
    const rows=[];
    for(let idx=0;idx<raw.length;idx++){
      const r=raw[idx],sku=normSkuV11(r[kSku]),nombre=String(r[kNom]??'').trim(),n=Number(r[kCant]);
      if(!sku&&!nombre&&String(r[kCant]??'').trim()==='')continue;
      if(!sku)throw Error(`Fila ${idx+2}: falta SKU.`);
      if(!Number.isInteger(n)||n<0)throw Error(`Fila ${idx+2} (${sku}): CANTIDAD debe ser un entero mayor o igual a 0.`);
      let precio=null;
      if(kPrecio){
        try{precio=parsePriceV12(r[kPrecio])}catch{throw Error(`Fila ${idx+2} (${sku}): PRECIO inválido.`)}
      }
      rows.push({sku,nombre,cantidad:n,precio});
    }
    if(!rows.length)throw Error('No hay filas válidas.');
    return rows;
  });
};

renderStockPreviewV5=async function(){
  const box=$('#stockImportPreview');if(!stockImportRowsV5.length){box.innerHTML='';return}
  const sample=stockImportRowsV5.slice(0,12);let summary='';
  try{
    const {data,error}=await sb.from('productos').select('sku').limit(5000);if(error)throw error;
    const known=new Set((data||[]).map(p=>normSkuV11(p.sku)));
    const missing=stockImportRowsV5.filter(r=>!known.has(normSkuV11(r.sku)));
    const found=stockImportRowsV5.length-missing.length;
    const missingWithPrice=missing.filter(r=>r.precio!==null&&r.precio!==undefined).length;
    summary=`<div class="${missing.length?'warn':'okbox'} tiny"><b>${stockImportRowsV5.length} filas · ${found} SKU encontrados · ${missing.length} SKU nuevos.</b>${missing.length?`<br>Los SKU nuevos se crearán automáticamente.${missingWithPrice?` <b>${missingWithPrice}</b> tomarán el precio del Excel.`:''} Los nuevos sin precio quedarán en $0.<br><b>Importante:</b> el precio de SKU ya existentes no se modifica.`:'<br>Todos los SKU ya existen. Sus precios actuales no se modificarán.'}</div>`;
  }catch{summary=`<div class="warn tiny"><b>${stockImportRowsV5.length} filas listas.</b><br>PRECIO es opcional y sólo se aplica al crear SKU nuevos.</div>`}
  box.innerHTML=`${summary}<div class="import-preview"><table><thead><tr><th>SKU</th><th>NOMBRE</th><th>CANTIDAD</th><th>PRECIO</th></tr></thead><tbody>${sample.map(r=>`<tr><td>${esc(r.sku)}</td><td>${esc(r.nombre)}</td><td>${r.cantidad}</td><td>${r.precio===null||r.precio===undefined?'—':money(r.precio)}</td></tr>`).join('')}</tbody></table></div>`;
  $('#stockReplaceBtn').disabled=false;$('#stockAddBtn').disabled=false;
};

stockTemplateV5=function(){
  const ws=XLSX.utils.aoa_to_sheet([['SKU','NOMBRE','CANTIDAD','PRECIO']]);
  ws['!cols']=[{wch:24},{wch:45},{wch:14},{wch:16}];
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'STOCK');XLSX.writeFile(wb,'Plantilla_Stock_ADHOME.xlsx');
};
