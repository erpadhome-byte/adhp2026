// PRESENTES 2026 CLOUD V0.5.1 - selector de familia al escanear QR
// Cambio aislado de UX: no modifica stock, RPCs ni confirmacion de pedidos.

function normFamV17(v){
  return String(v||'').trim().toLocaleUpperCase('es-AR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
}

function sameFamilyV17(a,b){
  if(!a||!b)return false;
  const ta=normFamV17(a.tipo),tb=normFamV17(b.tipo),pa=normFamV17(a.producto),pb=normFamV17(b.producto);
  return !!ta&&!!pa&&ta===tb&&pa===pb;
}

async function getFamilyV17(scanned){
  if(!scanned?.tipo||!scanned?.producto)return [scanned].filter(Boolean);
  let rows=[];
  if(navigator.onLine){
    // Traemos por categoria y filtramos producto de forma normalizada para tolerar mayusculas/acentos.
    const {data,error}=await sb.from('productos').select('*').eq('activo',true).eq('tipo',scanned.tipo).limit(500);
    if(error)throw error;
    rows=(data||[]).filter(p=>sameFamilyV17(scanned,p));
  }else{
    rows=(productCache||[]).filter(p=>p.activo!==false&&sameFamilyV17(scanned,p));
  }
  // Evita filas incompletas de catalogo que no son vendibles.
  rows=rows.filter(p=>p?.sku&&p?.descripcion&&Number(p.precio||0)>0);
  if(!rows.some(p=>String(p.sku).toUpperCase()===String(scanned.sku).toUpperCase())&&Number(scanned.precio||0)>0)rows.push(scanned);
  rows.sort((a,b)=>String(a.medida||'').localeCompare(String(b.medida||''),'es',{numeric:true})||String(a.color||a.descripcion||'').localeCompare(String(b.color||b.descripcion||''),'es',{numeric:true}));
  return rows.length?rows:[scanned];
}

function addFamilySelectionsV17(rows,quantities){
  let addedUnits=0,addedSkus=0;
  rows.forEach((p,i)=>{
    const qty=Math.max(0,Math.floor(Number(quantities[i]||0)));
    if(!qty)return;
    const ex=cart.find(x=>String(x.sku).toUpperCase()===String(p.sku).toUpperCase());
    if(ex)ex.qty=Number(ex.qty||0)+qty;
    else cart.push({...p,qty,observacion_item:p.observacion_manual||''});
    addedUnits+=qty;addedSkus++;
  });
  if(!addedUnits)return false;
  renderCart();saveDraft();
  $('#psearch').value='';$('#presults').innerHTML='';
  toast(`${addedUnits} unidad/es agregadas en ${addedSkus} variante/s.`);
  return true;
}

function familyTitleV17(p){
  const tipo=String(p?.tipo||'').trim(),prod=String(p?.producto||'').trim();
  return [tipo,prod].filter(Boolean).join(' · ')||p?.descripcion||'Familia de productos';
}

function openFamilyPickerV17(scanned,rows){
  if(!Array.isArray(rows)||rows.length<=1){addProduct(scanned);return}
  const scannedSku=String(scanned.sku||'').toUpperCase();
  let lastMeasure=null;
  const body=rows.map((p,i)=>{
    const measure=String(p.medida||'Sin medida').trim()||'Sin medida';
    const header=measure!==lastMeasure?`<div style="font-weight:800;font-size:13px;margin:${i?'14':'5'}px 0 6px;color:#17365d">Medida ${esc(measure)}</div>`:'';
    lastMeasure=measure;
    const inCart=cart.find(x=>String(x.sku).toUpperCase()===String(p.sku).toUpperCase());
    const color=String(p.color||'').trim()||String(p.descripcion||'').replace(new RegExp(`^${String(p.tipo||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s+${String(p.producto||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*`,'i'),'').trim()||'Variante';
    const scannedMark=String(p.sku).toUpperCase()===scannedSku?' <span style="font-size:11px;background:#e7f0ff;color:#17365d;border-radius:999px;padding:2px 6px">ESCANEADO</span>':'';
    return `${header}<div style="display:grid;grid-template-columns:minmax(0,1fr) 82px;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #eee">
      <div style="min-width:0"><b>${esc(color)}</b>${scannedMark}<div class="meta">${esc(p.sku)} · ${money(p.precio)} + IVA · Stock ${Number(p.stock_disponible||0)}${inCart?` · <b>Ya en pedido: ${Number(inCart.qty||0)} u.</b>`:''}</div></div>
      <input data-famqty-v17="${i}" type="number" min="0" step="1" inputmode="numeric" placeholder="0" style="margin:0;text-align:center;font-size:17px;font-weight:700" aria-label="Cantidad ${esc(color)}">
    </div>`;
  }).join('');

  modal(familyTitleV17(scanned),`<div class="tiny muted" style="margin-bottom:8px">Ingresá cantidad sólo en los colores/medidas que pide el cliente. Podés cargar varias variantes de una sola vez.</div>${body}<div style="position:sticky;bottom:-18px;background:#fff;padding:12px 0 4px;margin-top:8px;border-top:1px solid #eee"><div id="famTotalV17" class="tiny" style="margin-bottom:7px;font-weight:700">0 unidades seleccionadas</div><button id="famAddV17" class="btn primary big" style="width:100%">Agregar seleccionados</button></div>`);

  const inputs=[...document.querySelectorAll('[data-famqty-v17]')];
  const updateTotal=()=>{const total=inputs.reduce((s,x)=>s+Math.max(0,Math.floor(Number(x.value||0))),0);const el=$('#famTotalV17');if(el)el.textContent=`${total} unidad${total===1?'':'es'} seleccionada${total===1?'':'s'}`};
  inputs.forEach(x=>{x.addEventListener('input',updateTotal);x.addEventListener('focus',()=>x.select())});
  // Enfoca la variante leida, pero no la precarga para evitar sumar unidades por accidente.
  const scanIndex=rows.findIndex(p=>String(p.sku).toUpperCase()===scannedSku);
  setTimeout(()=>{const x=document.querySelector(`[data-famqty-v17="${scanIndex>=0?scanIndex:0}"]`);x?.focus()},60);
  $('#famAddV17').onclick=()=>{
    const q=inputs.map(x=>x.value);
    if(!q.some(v=>Number(v)>0))return toast('Ingresá al menos una cantidad.');
    if(addFamilySelectionsV17(rows,q))closeModal();
  };
}

async function handleScannedProductV17(scanned){
  try{
    const family=await getFamilyV17(scanned);
    openFamilyPickerV17(scanned,family);
  }catch(e){
    // Si la busqueda de familia falla, no bloquea la venta: conserva comportamiento anterior.
    console.warn('Familia QR V17:',e);
    addProduct(scanned);
  }
}

function openScannerV17(){
  if(typeof Html5Qrcode==='undefined')return toast('No se pudo cargar el lector QR.');
  modal('Escanear producto','<div id="reader" class="scanner"></div><div class="tiny muted" style="margin-top:8px">Al leer el QR se mostrarán las variantes de la familia para cargar cantidades.</div>');
  const qr=new Html5Qrcode('reader');
  qr.start({facingMode:'environment'},{fps:12,qrbox:{width:240,height:240}},async text=>{
    try{await qr.stop()}catch{}
    closeModal();
    const sku=String(text||'').trim();
    let data=[],error=null;
    if(navigator.onLine){const r=await sb.from('productos').select('*').ilike('sku',sku).limit(1);data=r.data||[];error=r.error}
    else{const p=(productCache||[]).find(x=>String(x.sku).toUpperCase()===sku.toUpperCase());data=p?[p]:[]}
    if(error)return toast(error.message);
    if(data?.length)await handleScannedProductV17(data[0]);
    else if(confirm(`SKU no encontrado: ${sku}\n¿Crear manualmente?`))openManual(sku);
  },()=>{}).catch(e=>$('#reader').innerHTML=`<div class="errorbox">No se pudo abrir la cámara: ${esc(e)}</div>`);
}

// Reasigna exclusivamente los dos accesos de escaneo. El resto de la operatoria queda intacta.
openScanner=openScannerV17;
if($('#scanBtn'))$('#scanBtn').onclick=openScannerV17;
if($('#fabScan'))$('#fabScan').onclick=openScannerV17;
