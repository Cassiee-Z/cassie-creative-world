(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-nav');
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    menuButton.querySelector('span').textContent = open ? '−' : '＋';
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.querySelector('span').textContent = '＋';
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      nav.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.querySelector('span').textContent = '＋';
    }
  });

  // The artwork and title move on separate layers. Only unsettled motion uses frames.
  const heroScene = document.querySelector('.hero-scene');
  let heroVisible = true;
  let motionFrame = null;
  let lastFrameTime = 0;
  const pointer = {x:0,y:0,targetX:0,targetY:0};
  function resetParallax() {
    if (motionFrame !== null) cancelAnimationFrame(motionFrame);
    motionFrame = null;
    lastFrameTime = 0;
    pointer.x = pointer.y = pointer.targetX = pointer.targetY = 0;
    ['--scene-x','--scene-y','--title-x','--title-y'].forEach(name => heroScene.style.removeProperty(name));
  }
  function updateParallaxAvailability() {
    const enabled = finePointer.matches && !reducedMotion.matches && heroVisible && !document.hidden;
    heroScene.classList.toggle('has-parallax', enabled);
    if (!enabled) resetParallax();
  }
  function moveParallax(time) {
    const elapsed = lastFrameTime ? Math.min(time-lastFrameTime,50) : 16;
    lastFrameTime = time;
    const ease = 1-Math.exp(-elapsed/90);
    pointer.x += (pointer.targetX-pointer.x)*ease;
    pointer.y += (pointer.targetY-pointer.y)*ease;
    heroScene.style.setProperty('--scene-x', `${(-pointer.x*8).toFixed(2)}px`);
    heroScene.style.setProperty('--scene-y', `${(-pointer.y*6).toFixed(2)}px`);
    heroScene.style.setProperty('--title-x', `${(pointer.x*12).toFixed(2)}px`);
    heroScene.style.setProperty('--title-y', `${(pointer.y*10).toFixed(2)}px`);
    if (Math.abs(pointer.targetX-pointer.x)+Math.abs(pointer.targetY-pointer.y)>0.002) {
      motionFrame = requestAnimationFrame(moveParallax);
    } else {
      motionFrame = null;
      lastFrameTime = 0;
    }
  }
  function requestParallax() {
    if (motionFrame === null) motionFrame = requestAnimationFrame(moveParallax);
  }
  heroScene.addEventListener('pointermove', event => {
    if (!heroScene.classList.contains('has-parallax') || event.pointerType !== 'mouse') return;
    const bounds = heroScene.getBoundingClientRect();
    pointer.targetX = Math.max(-1,Math.min(1,(event.clientX-bounds.left)/bounds.width*2-1));
    pointer.targetY = Math.max(-1,Math.min(1,(event.clientY-bounds.top)/bounds.height*2-1));
    requestParallax();
  }, {passive:true});
  heroScene.addEventListener('pointerleave', () => {
    if (!heroScene.classList.contains('has-parallax')) return;
    pointer.targetX = pointer.targetY = 0;
    requestParallax();
  });
  if ('IntersectionObserver' in window) {
    const heroObserver = new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      updateParallaxAvailability();
    });
    heroObserver.observe(heroScene);
  }
  finePointer.addEventListener('change', updateParallaxAvailability);
  reducedMotion.addEventListener('change', updateParallaxAvailability);
  document.addEventListener('visibilitychange', updateParallaxAvailability);
  updateParallaxAvailability();

  // Stagger each visible row from left to right, matching the responsive grid.
  const artworkGroups = [...document.querySelectorAll('.ad-grid,.color-grid,.film-stills,.process-asset-grid,.process-sequence-grid')];
  function updateRevealOrder() {
    artworkGroups.forEach(group => {
      const columns = getComputedStyle(group).gridTemplateColumns.split(' ').length;
      group.querySelectorAll('figure.reveal').forEach((element,index) => {
        element.style.setProperty('--reveal-delay', `${(index%columns)*95}ms`);
      });
    });
  }
  updateRevealOrder();
  if ('ResizeObserver' in window) {
    const gridObserver = new ResizeObserver(updateRevealOrder);
    artworkGroups.forEach(group => gridObserver.observe(group));
  }
  // IntersectionObserver reveals content without scroll listeners.
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold: 0.08});
    document.querySelectorAll('.reveal').forEach(element => {
      element.classList.add('will-reveal');
      observer.observe(element);
    });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) {
        observer.disconnect();
        document.querySelectorAll('.will-reveal').forEach(element => element.classList.add('is-visible'));
      }
    });
  }

  const artworks = [...document.querySelectorAll('[data-lightbox]')];
  const dialog = document.getElementById('lightbox');
  const image = document.getElementById('lightbox-image');
  const imageError = document.getElementById('image-error');
  const imageWrap = document.querySelector('.lightbox-image-wrap');
  const zoomToolbar = document.getElementById('lightbox-zoom');
  const zoomLevel = document.getElementById('zoom-level');
  const zoomIn = document.getElementById('zoom-in');
  const zoomOut = document.getElementById('zoom-out');
  const zoomFit = document.getElementById('zoom-fit');
  const zoomOriginal = document.getElementById('zoom-original');
  let imageScale = null;
  let zoomReady = false;
  let drag = null;
  let currentArt = 0;
  let returnFocus = null;
  let dialogAnimation = null;
  let imageAnimation = null;
  let dialogClosing = false;
  function fitImageScale() {
    if (!image.naturalWidth || !image.naturalHeight) return 1;
    const padding = getComputedStyle(imageWrap);
    const width = imageWrap.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
    const height = imageWrap.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom);
    return Math.min(1,width/image.naturalWidth,height/image.naturalHeight);
  }
  function updateZoomControls() {
    if (zoomToolbar.hidden) return;
    const fit = fitImageScale();
    const scale = imageScale ?? fit;
    zoomLevel.textContent = zoomReady ? `${Math.round(scale*100)}%` : '加载中';
    zoomIn.disabled = !zoomReady || scale >= 2;
    zoomOut.disabled = !zoomReady || scale <= fit + 0.001;
    zoomFit.disabled = zoomOriginal.disabled = !zoomReady;
  }
  function resetImageZoom() {
    imageScale = null;
    drag = null;
    image.style.removeProperty('width');
    image.style.removeProperty('height');
    imageWrap.classList.remove('is-zoomed','is-dragging');
    imageWrap.removeAttribute('tabindex');
    imageWrap.scrollLeft = imageWrap.scrollTop = 0;
    updateZoomControls();
  }
  function setImageScale(scale) {
    if (!zoomReady || zoomToolbar.hidden) return;
    const fit = fitImageScale();
    if (scale <= fit + 0.001) { resetImageZoom();return; }
    const previousScale = imageScale ?? fit;
    const viewport = imageWrap.getBoundingClientRect();
    const before = image.getBoundingClientRect();
    const viewportX = viewport.left + imageWrap.clientLeft + imageWrap.clientWidth/2;
    const viewportY = viewport.top + imageWrap.clientTop + imageWrap.clientHeight/2;
    const centerX = (viewportX - before.left)/previousScale;
    const centerY = (viewportY - before.top)/previousScale;
    imageScale = Math.min(2,Math.max(fit,scale));
    imageWrap.classList.add('is-zoomed');
    imageWrap.tabIndex = 0;
    image.style.width = `${image.naturalWidth*imageScale}px`;
    image.style.height = `${image.naturalHeight*imageScale}px`;
    const after = image.getBoundingClientRect();
    imageWrap.scrollLeft += after.left + centerX*imageScale - viewportX;
    imageWrap.scrollTop += after.top + centerY*imageScale - viewportY;
    updateZoomControls();
  }
  zoomIn.addEventListener('click',() => setImageScale((imageScale ?? fitImageScale())*1.5));
  zoomOut.addEventListener('click',() => setImageScale((imageScale ?? fitImageScale())/1.5));
  zoomFit.addEventListener('click',resetImageZoom);
  zoomOriginal.addEventListener('click',() => setImageScale(1));
  imageWrap.addEventListener('pointerdown',event => {
    if (imageScale === null || event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = {id:event.pointerId,x:event.clientX,y:event.clientY,left:imageWrap.scrollLeft,top:imageWrap.scrollTop};
    imageWrap.setPointerCapture(event.pointerId);
    imageWrap.classList.add('is-dragging');
    event.preventDefault();
  });
  imageWrap.addEventListener('pointermove',event => {
    if (!drag || drag.id !== event.pointerId) return;
    imageWrap.scrollLeft = drag.left + drag.x - event.clientX;
    imageWrap.scrollTop = drag.top + drag.y - event.clientY;
  });
  ['pointerup','pointercancel','lostpointercapture'].forEach(type => imageWrap.addEventListener(type,() => {
    drag = null;
    imageWrap.classList.remove('is-dragging');
  }));
  if ('ResizeObserver' in window) new ResizeObserver(updateZoomControls).observe(imageWrap);
  function closeLightbox() {
    if (!dialog.open || dialogClosing) return;
    dialogClosing = true;
    dialogAnimation?.cancel();
    if (reducedMotion.matches || !dialog.animate) {
      dialog.close();
      return;
    }
    dialog.classList.add('is-closing');
    dialogAnimation = dialog.animate([
      {opacity:1,transform:'translateY(0) scale(1)'},
      {opacity:0,transform:'translateY(8px) scale(.985)'}
    ], {duration:160,easing:'ease-out',fill:'forwards'});
    dialogAnimation.finished.then(() => { if (dialogClosing) dialog.close(); }).catch(() => {});
  }
  function showArtwork(index) {
    currentArt = (index + artworks.length) % artworks.length;
    const source = artworks[currentArt];
    zoomReady = false;
    zoomToolbar.hidden = source.dataset.zoomable !== 'true';
    resetImageZoom();
    imageError.hidden = true;
    image.classList.add('is-loading');
    image.src = source.dataset.lightbox;
    image.alt = source.querySelector('img')?.alt || source.dataset.title;
    document.getElementById('lightbox-title').textContent = source.dataset.title;
    document.getElementById('lightbox-description').textContent = source.dataset.description;
    document.getElementById('lightbox-counter').textContent = `${currentArt + 1} / ${artworks.length}`;
  }
  artworks.forEach((button,index) => button.addEventListener('click', () => {
    returnFocus = button;
    dialogClosing = false;
    dialog.classList.remove('is-closing');
    dialogAnimation?.cancel();
    showArtwork(index);
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('modal-open');
    if (!reducedMotion.matches && dialog.animate) {
      dialogAnimation = dialog.animate([
        {opacity:0,transform:'translateY(14px) scale(.975)'},
        {opacity:1,transform:'translateY(0) scale(1)'}
      ], {duration:280,easing:'cubic-bezier(.16,1,.3,1)'});
    }
  }));
  image.addEventListener('load', () => {
    zoomReady = true;
    updateZoomControls();
    image.classList.remove('is-loading');
    imageAnimation?.cancel();
    if (!reducedMotion.matches && dialog.open && !dialogClosing && image.animate) {
      imageAnimation = image.animate([
        {opacity:0,transform:'translateY(6px) scale(.99)'},
        {opacity:1,transform:'translateY(0) scale(1)'}
      ], {duration:260,easing:'cubic-bezier(.16,1,.3,1)'});
    }
  });
  image.addEventListener('error', () => { zoomReady = false;updateZoomControls();image.classList.remove('is-loading');imageError.hidden = false; });
  document.getElementById('close-lightbox').addEventListener('click', closeLightbox);
  document.getElementById('previous-art').addEventListener('click', () => showArtwork(currentArt - 1));
  document.getElementById('next-art').addEventListener('click', () => showArtwork(currentArt + 1));
  dialog.addEventListener('click', event => { if (event.target === dialog) closeLightbox(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeLightbox(); });
  dialog.addEventListener('close', () => {
    dialogClosing = false;
    dialog.classList.remove('is-closing');
    dialogAnimation?.cancel();
    imageAnimation?.cancel();
    resetImageZoom();
    document.body.classList.remove('modal-open');
    returnFocus?.focus({preventScroll:true});
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      dialogAnimation?.finish();
      imageAnimation?.finish();
    }
  });
  dialog.addEventListener('keydown', event => {
    if (!zoomToolbar.hidden && zoomReady) {
      if (event.key === '+' || event.key === '=') { event.preventDefault();setImageScale((imageScale ?? fitImageScale())*1.5);return; }
      if (event.key === '-') { event.preventDefault();setImageScale((imageScale ?? fitImageScale())/1.5);return; }
      // A focused, enlarged canvas uses the browser's native arrow-key scrolling.
      if (event.target === imageWrap && imageScale !== null) return;
    }
    if (event.key === 'ArrowRight') { event.preventDefault(); showArtwork(currentArt + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); showArtwork(currentArt - 1); }
  });

  [['winter-video', 'film-play', 'film-error'], ['joyo-ad-video', 'joyo-ad-play', 'joyo-ad-error']].forEach(([videoId, buttonId, errorId]) => {
    const video = document.getElementById(videoId);
    const button = document.getElementById(buttonId);
    const error = document.getElementById(errorId);
    button.addEventListener('click', async () => {
      button.hidden = true;
      video.hidden = false;
      error.hidden = true;
      video.focus({preventScroll: true});
      try { await video.play(); } catch (_) {
        // Native controls remain available when a browser refuses automatic playback.
        if (video.error) error.hidden = false;
      }
    });
    video.addEventListener('error', () => { error.hidden = false; });
    video.querySelectorAll('source').forEach(source => {
      source.addEventListener('error', () => { error.hidden = false; });
    });
  });

  const config = window.PORTFOLIO_CONFIG || {};
  if (config.digitalHumanVideo) {
    const digitalVideo = document.getElementById('digital-video');
    digitalVideo.src = config.digitalHumanVideo;
    if (config.digitalHumanPoster) digitalVideo.poster = config.digitalHumanPoster;
    digitalVideo.hidden = false;
    document.getElementById('digital-placeholder').hidden = true;
    digitalVideo.addEventListener('error', () => { document.getElementById('digital-error').hidden = false; });
    document.querySelector('.digital-note').textContent = '数字人介绍';
  }

  document.getElementById('copy-email').addEventListener('click', async () => {
    const email = 'CassieZhawenxin@163.com';
    const feedback = document.getElementById('copy-feedback');
    try {
      await navigator.clipboard.writeText(email);
      feedback.textContent = '邮箱已复制';
    } catch (_) {
      feedback.textContent = `请复制邮箱：${email}`;
    }
    window.setTimeout(() => { feedback.textContent = ''; }, 4500);
  });
})();
