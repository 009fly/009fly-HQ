/* Desktop-only hero video. No video download/decode on mobile. */
(() => {
  const hero=document.querySelector('.hero');
  const surface=hero?.querySelector('.hero-video-backdrop');
  if(!hero||!surface)return;
  const desktop=matchMedia('(min-width:801px)');
  // Diagnostic switches: ?smoke=60 compares the original video, ?smoke=off uses the static poster.
  const smokeMode=new URLSearchParams(window.location.search).get('smoke');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let video=null;
  let visible=true;
  function syncPlayback(){
    if(!video)return;
    if(!desktop.matches || reduced.matches || document.hidden || !visible){
      video.pause();
      return;
    }
    if(video.paused){
      const attempt=video.play();
      if(attempt && typeof attempt.catch==='function')attempt.catch(()=>{});
    }
  }
  function updateViewport(){
    const enabled=desktop.matches&&!reduced.matches&&smokeMode!=='off';
    if(!enabled){
      if(video){
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.remove();
        video=null;
      }
      return;
    }
    if(!video){
      video=document.createElement('video');
      video.autoplay=true;
      video.loop=true;
      video.muted=true;
      video.defaultMuted=true;
      video.playsInline=true;
      video.preload='auto';
      video.controls=false;
      video.disablePictureInPicture=true;
      video.setAttribute('aria-hidden','true');
      video.setAttribute('tabindex','-1');
      video.poster='assets/009fly-hero-ink-poster.jpg';
      video.addEventListener('playing',()=>video.classList.add('is-playing'),{once:true});
      video.src=smokeMode==='60'
        ? 'assets/009fly-hero-ink-seamless-720p60.mp4?v=20261030-compare'
        : 'assets/009fly-hero-ink-seamless-720p30.mp4?v=20261030-light';
      surface.appendChild(video);
    }
    syncPlayback();
  }
  const observer=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    syncPlayback();
  },{threshold:0.01});
  observer.observe(hero);
  document.addEventListener('visibilitychange',syncPlayback);
  desktop.addEventListener('change',updateViewport);
  reduced.addEventListener('change',updateViewport);
  window.addEventListener('pagehide',()=>{if(video)video.pause()},{once:true});
  updateViewport();
})();
