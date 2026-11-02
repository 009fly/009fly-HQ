/* 009fly approved smoke 02: independent lightweight video playback for both viewports. */
(() => {
  const hero = document.querySelector('.hero');
  const surface = hero?.querySelector('.hero-video-backdrop');
  if (!hero || !surface) return;
  const mobile = matchMedia('(max-width:800px)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const sources = {
    desktop:'assets/009fly-smoke02-desktop-1080p.mp4?v=20261101-smooth60',
    mobile:'assets/009fly-smoke02-mobile-720p.mp4?v=20261101-smooth30'
  };
  let video = null;
  let active = true;
  function sync() {
    if (!video) return;
    if (document.hidden || !active || reduced.matches) {
      video.pause();
    } else if (video.paused) {
      const promise = video.play();
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    }
  }
  function update() {
    if (reduced.matches) {
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.remove();
        video = null;
      }
      return;
    }
    if (!video) {
      video = document.createElement('video');
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.controls = false;
      video.disablePictureInPicture = true;
      video.poster = 'assets/009fly-smoke02-poster.jpg?v=20261101-smooth';
      video.setAttribute('aria-hidden','true');
      video.setAttribute('tabindex','-1');
      video.addEventListener('playing', () => video?.classList.add('is-playing'));
      video.addEventListener('error', () => video?.classList.remove('is-playing'));
      surface.appendChild(video);
    }
    const source = mobile.matches ? sources.mobile : sources.desktop;
    if (video.getAttribute('src') !== source) {
      video.classList.remove('is-playing');
      video.src = source;
      video.load();
    }
    sync();
  }
  const observer = new IntersectionObserver(entries => {
    active = !!entries[0]?.isIntersecting;
    sync();
  },{threshold:.01});
  observer.observe(hero);
  document.addEventListener('visibilitychange', sync);
  mobile.addEventListener('change', update);
  reduced.addEventListener('change', update);
  window.addEventListener('pagehide', () => video?.pause(), {once:true});
  update();
})();
