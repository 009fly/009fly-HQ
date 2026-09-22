const toggle=document.querySelector(".menu-toggle");const links=document.querySelector(".nav-links");if(toggle){toggle.addEventListener("click",()=>{const open=links.classList.toggle("open");toggle.setAttribute("aria-expanded",open)})}document.querySelectorAll(".nav-links a").forEach(a=>a.addEventListener("click",()=>links.classList.remove("open")));

function updateTickerTime(){const now=new Date();const time=now.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});document.querySelectorAll(".ticker-time").forEach(el=>el.textContent=time)}
updateTickerTime();
setInterval(updateTickerTime,30000);