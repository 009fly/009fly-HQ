/* 009fly hero: approved HD 009 animation on desktop and mobile.
 * The previous smoke source is retained solely as an error fallback.
 * Ticker and navigation remain independent of the video. */
(() => {
  const hero = document.querySelector('.hero');
  const surface = hero?.querySelector('.hero-video-backdrop');
  if (!hero || !surface) return;

  const mobile = matchMedia('(max-width:800px)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const currentSources = {
    desktop:'assets/009fly-smoke02-desktop-1080p.mp4?v=20261101-smooth60',
    mobile:'assets/009fly-smoke02-mobile-720p.mp4?v=20261101-smooth30'
  };
  const preferredSources = {
    desktop:'assets/009_render_header_desktop_HD_1080p.mp4?v=20261102-hd',
    mobile:'assets/009_render_header_mobile_HD_720p.mp4?v=20261102-hd'
  };

  let video = null;
  let active = true;
  let revision = 0;
  function sync() {
    if (!video) return;
    if (document.hidden || !active || reduced.matches) {
      video.pause();
    } else if (video.paused) {
      const promise = video.play();
      if (promise && typeof promise.catch === 'function') promise.catch(() => {});
    }
  }
  // The verified HD files are deployed. Direct loading avoids a redundant
  // network HEAD request before playback can start.
  function chooseSource(viewport) {
    return preferredSources[viewport];
  }
  function update() {
    const token = ++revision;
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
    const viewport = mobile.matches ? 'mobile' : 'desktop';
    const source = chooseSource(viewport);
    if (token !== revision || reduced.matches) return;

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
      video.poster = 'assets/009_render_header_poster.jpg?v=20261102';
      video.setAttribute('aria-hidden','true');
      video.setAttribute('tabindex','-1');
      video.addEventListener('playing', () => video?.classList.add('is-playing'));
      video.addEventListener('error', () => {
        if (!video) return;
        video.classList.remove('is-playing');
        const fallback = currentSources[mobile.matches ? 'mobile' : 'desktop'];
        if (video.getAttribute('src') !== fallback) {
          video.src = fallback;
          video.load();
          sync();
        }
      });
      surface.appendChild(video);
    }
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
  document.addEventListener('visibilitychange',sync);
  mobile.addEventListener('change',update);
  reduced.addEventListener('change',update);
  window.addEventListener('pagehide', () => video?.pause(), {once:true});
  update();
})();
