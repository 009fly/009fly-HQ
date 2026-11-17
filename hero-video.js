/* 009fly hero — approved desktop clean loop and optimized mobile v2.
 * A static 009 render poster stays visible whenever playback is unavailable.
 * No deliberate pause while scrolling or in other tabs.
 * Browser autoplay/background policies may still suspend playback.
 * Ticker and navigation stay independent.
 */
(() => {
  const hero = document.querySelector('.hero');
  const surface = hero?.querySelector('.hero-video-backdrop');
  if (!hero || !surface) return;

  const mobile = matchMedia('(max-width:800px)');
  const sources = {
    desktop: 'assets/009fly_cleanloop_desktop_HD_1080p.mp4?v=20261102-cleancut',
    mobile: 'assets/009_render_mobile_bg_optimized_720x1280.mp4?v=20261102-mobile-v2'
  };

  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.controls = false;
  video.poster = 'assets/009_render_header_poster.jpg?v=20261117';
  video.disablePictureInPicture = true;
  video.setAttribute('muted', '');
  video.setAttribute('autoplay', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('loop', '');
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('tabindex', '-1');
  surface.appendChild(video);

  function attemptPlay() {
    if (!video.paused) return;
    // Call directly in trusted gestures as well as normal autoplay events.
    try {
      const promise = video.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {
          if (video.paused) video.classList.remove('is-playing');
        });
      }
    } catch (_) {
      if (video.paused) video.classList.remove('is-playing');
    }
  }

  video.addEventListener('playing', () => video.classList.add('is-playing'));
  video.addEventListener('pause', () => {
    if (video.paused) video.classList.remove('is-playing');
  });
  video.addEventListener('error', () => {
    video.classList.remove('is-playing');
  });

  function updateSource() {
    const source = sources[mobile.matches ? 'mobile' : 'desktop'];
    if (video.getAttribute('src') !== source) {
      video.classList.remove('is-playing');
      video.src = source;
      video.load();
    }
    attemptPlay();
  }

  // Never intentionally pause playback when the hero scrolls offscreen or when
  // the document becomes hidden. Restore playback if a browser suspended it.
  if (mobile.addEventListener) mobile.addEventListener('change', updateSource);
  else if (mobile.addListener) mobile.addListener(updateSource);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) attemptPlay();
  });
  window.addEventListener('focus', attemptPlay);
  window.addEventListener('pageshow', attemptPlay);
  video.addEventListener('canplay', attemptPlay);
  // In-app iOS browsers may require a user gesture before muted playback.
  // Keep retries active until playback is allowed, without blocking navigation.
  document.addEventListener('pointerup', attemptPlay, {passive:true});
  document.addEventListener('touchend', attemptPlay, {passive:true});
  document.addEventListener('click', attemptPlay, {passive:true});
  document.addEventListener('keydown', attemptPlay);
  let lastScrollRetry = 0;
  window.addEventListener('scroll', () => {
    const now = Date.now();
    if (video.paused && now - lastScrollRetry > 1200) {
      lastScrollRetry = now;
      attemptPlay();
    }
  }, {passive:true});
  updateSource();
})();
