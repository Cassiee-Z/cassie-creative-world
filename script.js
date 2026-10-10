(() => {
  'use strict';
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

  // IntersectionObserver reveals content in reading order without scroll listeners.
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
  }

  const artworks = [...document.querySelectorAll('[data-lightbox]')];
  const dialog = document.getElementById('lightbox');
  const image = document.getElementById('lightbox-image');
  const imageError = document.getElementById('image-error');
  let currentArt = 0;
  let returnFocus = null;
  function showArtwork(index) {
    currentArt = (index + artworks.length) % artworks.length;
    const source = artworks[currentArt];
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
    showArtwork(index);
    dialog.showModal();
    document.body.classList.add('modal-open');
  }));
  image.addEventListener('load', () => image.classList.remove('is-loading'));
  image.addEventListener('error', () => { image.classList.remove('is-loading'); imageError.hidden = false; });
  document.getElementById('close-lightbox').addEventListener('click', () => dialog.close());
  document.getElementById('previous-art').addEventListener('click', () => showArtwork(currentArt - 1));
  document.getElementById('next-art').addEventListener('click', () => showArtwork(currentArt + 1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); returnFocus?.focus({preventScroll:true}); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); showArtwork(currentArt + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); showArtwork(currentArt - 1); }
  });

  const filmVideo = document.getElementById('winter-video');
  const filmButton = document.getElementById('film-play');
  const filmError = document.getElementById('film-error');
  filmButton.addEventListener('click', async () => {
    filmButton.hidden = true;
    filmVideo.hidden = false;
    filmVideo.focus({preventScroll: true});
    try { await filmVideo.play(); } catch (_) {
      // Native controls remain available when a browser refuses automatic playback.
      if (filmVideo.error) filmError.hidden = false;
    }
  });
  filmVideo.addEventListener('error', () => { filmError.hidden = false; });

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
