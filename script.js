const toggle=document.querySelector(".menu-toggle");const links=document.querySelector(".nav-links");if(toggle){toggle.addEventListener("click",()=>{const open=links.classList.toggle("open");toggle.setAttribute("aria-expanded",open)})}document.querySelectorAll(".nav-links a").forEach(a=>a.addEventListener("click",()=>links.classList.remove("open")));

// Honor incoming links (including flyOS → #contact) before cleaning the URL.
// Previously removing the fragment on first load prevented deep links from scrolling.
function scrollToIncomingSection(){
  const hash=window.location.hash;
  if(!hash||hash==="#")return;
  let id;
  try{id=decodeURIComponent(hash.slice(1))}catch(_){return}
  const target=document.getElementById(id);
  if(!target)return;
  window.requestAnimationFrame(()=>{
    target.scrollIntoView({behavior:"auto",block:"start"});
    history.replaceState(null,"",window.location.pathname+window.location.search);
  });
}
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",scrollToIncomingSection,{once:true});
}else{scrollToIncomingSection();}
window.addEventListener("hashchange",scrollToIncomingSection);
window.addEventListener("pageshow",scrollToIncomingSection);

document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",event=>{const targetId=a.getAttribute("href").slice(1);const target=document.getElementById(targetId);if(!target)return;event.preventDefault();target.scrollIntoView({behavior:"smooth",block:"start"});history.replaceState(null,"",window.location.pathname+window.location.search);}));

// Display each visitor's browser/device-local time; never rely on an upload,
// server timestamp, or a free-running 30-second interval that can lag a minute.
const tickerClockElements = document.querySelectorAll(".ticker-time");
let tickerClockTimer = null;

function updateTickerTime() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  tickerClockElements.forEach(el => {
    if (el.textContent !== time) el.textContent = time;
  });
}

function syncTickerTime() {
  if (tickerClockTimer !== null) clearTimeout(tickerClockTimer);
  updateTickerTime();
  // Recheck immediately after the next actual wall-clock minute boundary.
  // Scheduling from Date.now() avoids the up-to-30-second drift of setInterval.
  const nextMinuteDelay = 60000 - (Date.now() % 60000) + 75;
  tickerClockTimer = setTimeout(syncTickerTime, nextMinuteDelay);
}

syncTickerTime();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) syncTickerTime();
});
window.addEventListener("focus", syncTickerTime);
window.addEventListener("pageshow", syncTickerTime);