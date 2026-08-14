// PRESENTES 2026 CLOUD V0.4.2 - validacion de SKU manual
const openManualBaseV9=openManual;
openManual=function(prefill=''){
  openManualBaseV9(prefill);
  const sku=$('#msku'),desc=$('#mdesc'),cat=$('#mtype'),price=$('#mprice'),save=$('#msave');
  if(sku)sku.placeholder='SKU *';
  if(desc)desc.placeholder='Artículo / descripción *';
  if(cat)cat.placeholder='Categoría *';
  if(price){price.placeholder='Precio s/IVA *';price.min='0.01';price.step='0.01'}
  const note=document.createElement('div');note.className='tiny muted';note.style.margin='4px 0 8px';note.textContent='* Campos obligatorios';
  sku?.insertAdjacentElement('beforebegin',note);
  const originalSave=save?.onclick;
  if(save&&originalSave)save.onclick=async()=>{
    const faltan=[];
    if(!sku.value.trim())faltan.push('SKU');
    if(!desc.value.trim())faltan.push('Descripción');
    if(!cat.value.trim())faltan.push('Categoría');
    const p=Number(price.value);
    if(!price.value.trim()||!Number.isFinite(p)||p<=0)faltan.push('Precio s/IVA');
    if(faltan.length)return toast(`Completá los campos obligatorios: ${faltan.join(', ')}.`);
    return originalSave();
  };
};
