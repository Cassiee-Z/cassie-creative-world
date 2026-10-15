(() => {
  'use strict';
  const tracks = window.PORTFOLIO_TRACKS || [];
  if (!tracks.length) return;
  const audio = document.getElementById('music-audio');
  const feature = document.getElementById('music-feature');
  const list = document.getElementById('music-track-list');
  const toggle = document.getElementById('music-toggle');
  const cover = document.getElementById('music-cover');
  const fallback = document.getElementById('music-cover-fallback');
  const status = document.getElementById('music-status');
  const error = document.getElementById('music-error');
  const filters = [...document.querySelectorAll('[data-music-filter]')];
  const media = [...document.querySelectorAll('audio,video')];
  const labels = {rock:'律动摇滚',chinese:'中文歌曲',english:'英文歌曲',soundtrack:'影视配乐'};
  const rows = [];
  let current = 0;
  let filter = 'all';
  let playRequest = 0;
  audio.volume = 0.75;

  function durationLabel(seconds) {
    const whole = Math.floor(seconds);
    return `${String(Math.floor(whole / 60)).padStart(2,'0')}:${String(whole % 60).padStart(2,'0')}`;
  }
  function element(tag,className,text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  tracks.forEach((track,index) => {
    const item = element('li');
    const button = element('button','music-track');
    button.type = 'button';
    button.dataset.trackIndex = index;
    button.setAttribute('aria-controls','music-audio');
    let thumbnail;
    if (track.cover) {
      thumbnail = element('img','music-track-cover');
      thumbnail.src = track.cover;
      thumbnail.alt = '';
      thumbnail.loading = 'lazy';
      thumbnail.width = thumbnail.height = 50;
    } else {
      thumbnail = element('span','music-track-cover music-track-initial','SH');
      thumbnail.setAttribute('aria-hidden','true');
    }
    const copy = element('span','music-track-copy');
    copy.append(element('span','music-track-title',track.title));
    const info = element('span','music-track-info');
    info.append(element('span','',labels[track.category]),element('span','music-track-duration',durationLabel(track.duration)));
    copy.append(info);
    const symbol = element('span','music-track-symbol','▶');
    symbol.setAttribute('aria-hidden','true');
    button.append(thumbnail,copy,symbol);
    item.append(button);
    list.append(item);
    rows.push({item,button,symbol});
  });

  function updatePlayback() {
    const playing = !audio.paused && !audio.ended;
    feature.classList.toggle('is-playing',playing);
    toggle.setAttribute('aria-label',`${playing ? '暂停' : '播放'} ${tracks[current].title}`);
    document.getElementById('music-cover-symbol').textContent = playing ? 'Ⅱ' : '▶';
    rows.forEach(({button,symbol},index) => {
      const active = index === current;
      if (active) button.setAttribute('aria-current','true');
      else button.removeAttribute('aria-current');
      const pause = active && playing;
      symbol.textContent = pause ? 'Ⅱ' : '▶';
      button.setAttribute('aria-label',`${pause ? '暂停' : '播放'} ${tracks[index].title}，${durationLabel(tracks[index].duration)}`);
    });
  }
  function updateTrackDetails() {
    const track = tracks[current];
    document.getElementById('music-title').textContent = track.title;
    document.getElementById('music-kind').textContent = labels[track.category];
    document.getElementById('music-position').textContent = `${String(current + 1).padStart(2,'0')} / ${tracks.length} · ${durationLabel(track.duration)}`;
    document.getElementById('music-fallback-title').textContent = track.title;
    document.getElementById('music-open').href = track.src;
    cover.hidden = !track.cover;
    fallback.hidden = Boolean(track.cover);
    if (track.cover) {
      cover.src = track.cover;
      cover.alt = `${track.title} 音频封面`;
    }
    updatePlayback();
  }
  cover.addEventListener('error', () => {
    cover.hidden = true;
    fallback.hidden = false;
  });
  function pauseOtherMedia(active) {
    media.forEach(other => { if (other !== active && !other.paused) other.pause(); });
  }
  async function playCurrent() {
    const request = ++playRequest;
    error.hidden = true;
    status.textContent = '加载中…';
    pauseOtherMedia(audio);
    try {
      await audio.play();
    } catch (reason) {
      // Switching tracks aborts the older play request; only the latest may report errors.
      if (request !== playRequest || reason.name === 'AbortError') return;
      if (audio.error) {
        error.hidden = false;
        status.textContent = '播放遇到问题';
      } else {
        status.textContent = '点击播放，开始试听';
      }
      updatePlayback();
    }
  }
  function selectTrack(index) {
    ++playRequest;
    audio.pause();
    current = index;
    audio.src = tracks[index].src;
    error.hidden = true;
    updateTrackDetails();
    playCurrent();
  }
  function toggleCurrent() {
    if (audio.paused || audio.ended) {
      if (audio.error) audio.load();
      playCurrent();
    } else audio.pause();
  }
  function filteredIndexes() {
    return tracks.map((track,index) => index).filter(index => filter === 'all' || tracks[index].category === filter);
  }
  function adjacentTrack(direction,wrap = true) {
    const indexes = filteredIndexes();
    const position = indexes.indexOf(current);
    const next = position < 0 ? (direction > 0 ? 0 : indexes.length - 1) : position + direction;
    if (!wrap && next >= indexes.length) return;
    selectTrack(indexes[(next + indexes.length) % indexes.length]);
  }
  toggle.addEventListener('click',toggleCurrent);
  list.addEventListener('click',event => {
    const button = event.target.closest('[data-track-index]');
    if (!button) return;
    const index = Number(button.dataset.trackIndex);
    if (index === current) toggleCurrent();
    else selectTrack(index);
  });
  document.getElementById('music-previous').addEventListener('click',() => adjacentTrack(-1));
  document.getElementById('music-next').addEventListener('click',() => adjacentTrack(1));
  filters.forEach(button => button.addEventListener('click',() => {
    filter = button.dataset.musicFilter;
    filters.forEach(option => option.setAttribute('aria-pressed',String(option === button)));
    rows.forEach(({item},index) => { item.hidden = filter !== 'all' && tracks[index].category !== filter; });
    document.getElementById('music-library-count').textContent = `${filteredIndexes().length} 首作品`;
  }));
  audio.addEventListener('play',() => { status.textContent = '正在播放';updatePlayback(); });
  audio.addEventListener('playing',() => { status.textContent = '正在播放';feature.removeAttribute('aria-busy'); });
  audio.addEventListener('waiting',() => { status.textContent = '加载中…';feature.setAttribute('aria-busy','true'); });
  audio.addEventListener('pause',() => {
    status.textContent = audio.ended ? '播放完成' : '已暂停';
    feature.removeAttribute('aria-busy');
    updatePlayback();
  });
  audio.addEventListener('ended',() => { status.textContent = '播放完成';updatePlayback();adjacentTrack(1,false); });
  audio.addEventListener('error',() => {
    error.hidden = false;
    status.textContent = '播放遇到问题';
    feature.removeAttribute('aria-busy');
    updatePlayback();
  });

  // Any newly played song or video pauses the other media, including a future digital human video.
  media.forEach(active => active.addEventListener('play',() => {
    // A queued play event can arrive after this media has already been paused.
    if (!active.paused && !active.ended) pauseOtherMedia(active);
  }));
  updateTrackDetails();
})();
