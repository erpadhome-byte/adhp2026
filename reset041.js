// One-time fair reset: prevents old test drafts/offline queues from reappearing after server cleanup.
try{
  const key='presentes_fair_reset_20260814_v041';
  if(!localStorage.getItem(key)){
    localStorage.removeItem('presentes_draft');
    localStorage.removeItem('presentes_pending');
    localStorage.setItem(key,new Date().toISOString());
  }
}catch{}
