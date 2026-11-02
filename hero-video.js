/* 009fly hero — clean-cut HD 009 animation, mandatory video-first background.
 * No poster image and no deliberate pausing while scrolling or in other tabs.
 * Browser autoplay/background policies can still prevent continuous playback.
 * The previous verified HD animation is retained as a VIDEO-only error fallback.
 * Ticker and navigation remain independent of this player.
 */
(() => {
  const hero = document.querySelector('.hero');
  const surface = hero?.querySelector('.hero-video-backdrop');
  if (!hero || !surface) return;

  const mobile = matchMedia('(max-width:800px)');
  const sources = {
    desktop: 'assets/009fly_cleanloop_desktop_HD_1080p.mp4?v=20261102-cleancut',
    mobile: 'assets/009fly_cleanloop_mobile_HD_720p.mp4?v=20261102-cleancut'
  };
  const fallbackSources = {
    desktop: 'assets/009_render_header_desktop_HD_1080p.mp4?v=20261102-hd',
    mobile: 'assets/009_render_header_mobile_HD_720p.mp4?v=20261102-hd'
  };

  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.controls = false;
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
    const promise = video.play();
    if (promise && typeof promise.catch === 'function') promise.catch(() => {});
  }

  video.addEventListener('playing', () => video.classList.add('is-playing'));
  video.addEventListener('error', () => {
    video.classList.remove('is-playing');
    const fallback = fallbackSources[mobile.matches ? 'mobile' : 'desktop'];
    if (video.getAttribute('src') === fallback) return;
    video.src = fallback;
    video.load();
    attemptPlay();
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
  mobile.addEventListener('change', updateSource);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) attemptPlay();
  });
  window.addEventListener('focus', attemptPlay);
  window.addEventListener('pageshow', attemptPlay);
  video.addEventListener('canplay', attemptPlay);
  updateSource();
})();
