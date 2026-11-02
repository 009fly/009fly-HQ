/* 009fly hero playback: responsive HD background with safe asset handoff.
 * The approved lightweight 009 render is used once its optimized file is in /assets.
 * Until then, the verified existing smoke asset remains the live fallback.
 * Ticker and navigation animation remain independent of video playback. */
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
    desktop:'assets/009_render_header_desktop_light.mp4',
    mobile:'assets/009_render_header_mobile_light.mp4'
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
  async function chooseSource(viewport) {
    const preferred = preferredSources[viewport];
    // Small HEAD request, no full-size video download until a valid asset exists.
    try {
      const response = await fetch(preferred,{method:'HEAD',cache:'no-store'});
      if (response.ok) return preferred;
    } catch (_) {}
    return currentSources[viewport];
  }
  async function update() {
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
    const source = await chooseSource(viewport);
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
      video.poster = 'assets/009fly-smoke02-poster.jpg?v=20261101-smooth';
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
