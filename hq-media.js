
(() => {
 'use strict';
 const grid=document.getElementById('hq-media-grid'),prev=document.getElementById('hq-media-prev'),next=document.getElementById('hq-media-next'),position=document.getElementById('hq-media-position');
 if(grid&&prev&&next&&position){
  const cards=Array.from(grid.querySelectorAll('.hq-media-card'));
  const current=()=>{let index=0,distance=Infinity;for(let i=0;i<cards.length;i++){let d=Math.abs(cards[i].offsetLeft-cards[0].offsetLeft-grid.scrollLeft);if(d<distance){distance=d;index=i;}}if(grid.scrollLeft>=grid.scrollWidth-grid.clientWidth-3&&grid.scrollWidth>grid.clientWidth+3)return cards.length-1;return index;};
  const render=()=>{const i=current();position.textContent=String(i+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');prev.disabled=i===0;next.disabled=i===cards.length-1;};
  const go=delta=>{const i=Math.min(cards.length-1,Math.max(0,current()+delta));grid.scrollTo({left:cards[i].offsetLeft-cards[0].offsetLeft,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  prev.addEventListener('click',()=>go(-1));next.addEventListener('click',()=>go(1));grid.addEventListener('scroll',render,{passive:true});window.addEventListener('resize',render);render();
 }
 const counter=document.getElementById('hq-presence'),count=document.getElementById('hq-presence-count'),label=document.getElementById('hq-presence-label');
 if(!counter||!count||!label||!window.crypto?.getRandomValues)return;
 const endpoint='https://hmpcoebfakmtmiqprdrh.supabase.co/functions/v1/hq-live-visitors';
 const apiKey='sb_publishable_NYGaLfohC2256B-5lZNTTw_KQU5pbvV';
 const storageKey='009fly-hq-presence-v1';
 let visitor=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
 try{const old=JSON.parse(localStorage.getItem(storageKey)||'null');if(old&&/^[a-f0-9]{32}$/.test(old.id)&&Date.now()-old.at<86400000)visitor=old.id;localStorage.setItem(storageKey,JSON.stringify({id:visitor,at:Date.now()}));}catch{}
 let pending=false,lastGood=0;
 async function heartbeat(){
  if(document.hidden||pending)return;pending=true;
  try{
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:apiKey},body:JSON.stringify({visitor}),cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!r.ok)throw Error('Unavailable');const data=await r.json();if(!Number.isSafeInteger(data.count)||data.count<0)throw Error('Invalid count');
   count.textContent=data.count.toLocaleString();label.textContent=data.count===1?'AGENT ONLINE':'AGENTS ONLINE';counter.dataset.state=data.count>0?'live':'dormant';lastGood=Date.now();
  }catch{if(Date.now()-lastGood>60000){count.textContent='—';label.textContent='AGENTS ONLINE';counter.dataset.state='unavailable';}}
  finally{pending=false;}
 }
 heartbeat();setInterval(heartbeat,25000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)heartbeat();});
 window.addEventListener('pageshow',heartbeat);
})();
