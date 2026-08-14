// One-time fair reset: prevents old test drafts/offline queues from reappearing after server cleanup.
try{
  const key='presentes_fair_reset_20260814_v041';
  if(!localStorage.getItem(key)){
    localStorage.removeItem('presentes_draft');
    localStorage.removeItem('presentes_pending');
    localStorage.setItem(key,new Date().toISOString());
  }
}catch{}

// V0.4.2 - SKU manual: SKU, descripción, categoría y precio obligatorios.
window.addEventListener('load',()=>{
  if(typeof openManual!=='function'||window.__manualRequiredV042)return;
  window.__manualRequiredV042=true;
  const base=openManual;
  openManual=function(prefill=''){
    base(prefill);
    const sku=document.querySelector('#msku');
    const desc=document.querySelector('#mdesc');
    const cat=document.querySelector('#mtype');
    const price=document.querySelector('#mprice');
    const save=document.querySelector('#msave');
    if(sku)sku.placeholder='SKU *';
    if(desc)desc.placeholder='Artículo / descripción *';
    if(cat)cat.placeholder='Categoría *';
    if(price){price.placeholder='Precio s/IVA *';price.min='0.01';price.step='0.01';}
    if(sku&&!document.querySelector('#manualRequiredNoteV042')){
      const note=document.createElement('div');
      note.id='manualRequiredNoteV042';
      note.className='tiny muted';
      note.style.margin='4px 0 8px';
      note.textContent='* Campos obligatorios';
      sku.insertAdjacentElement('beforebegin',note);
    }
    const original=save?.onclick;
    if(save&&original)save.onclick=async()=>{
      const faltan=[];
      if(!sku?.value.trim())faltan.push('SKU');
      if(!desc?.value.trim())faltan.push('Descripción');
      if(!cat?.value.trim())faltan.push('Categoría');
      const p=Number(price?.value);
      if(!price?.value.trim()||!Number.isFinite(p)||p<=0)faltan.push('Precio s/IVA');
      if(faltan.length)return toast(`Completá los campos obligatorios: ${faltan.join(', ')}.`);
      return original();
    };
  };
});
