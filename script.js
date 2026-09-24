const toggle=document.querySelector(".menu-toggle");const links=document.querySelector(".nav-links");if(toggle){toggle.addEventListener("click",()=>{const open=links.classList.toggle("open");toggle.setAttribute("aria-expanded",open)})}document.querySelectorAll(".nav-links a").forEach(a=>a.addEventListener("click",()=>links.classList.remove("open")));

// Keep this one-page site at the clean root URL while preserving section scrolling.
function cleanHash(){if(window.location.hash){history.replaceState(null,"",window.location.pathname+window.location.search)}}
cleanHash();
window.addEventListener("hashchange",cleanHash);

document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",event=>{const targetId=a.getAttribute("href").slice(1);const target=document.getElementById(targetId);if(!target)return;event.preventDefault();target.scrollIntoView({behavior:"smooth",block:"start"});history.replaceState(null,"",window.location.pathname+window.location.search);}));

function updateTickerTime(){const now=new Date();const time=now.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});document.querySelectorAll(".ticker-time").forEach(el=>el.textContent=time)}
updateTickerTime();
setInterval(updateTickerTime,30000);