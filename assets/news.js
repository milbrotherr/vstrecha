(() => {
  const photos = Array.from(document.querySelectorAll('a[data-photo]'));
  if (!photos.length || typeof HTMLDialogElement === 'undefined') return;
  const dialog = document.createElement('dialog');
  dialog.className = 'photo-viewer';
  dialog.setAttribute('aria-label', 'Просмотр фотографий');
  dialog.innerHTML = '<div class="viewer-top"><span class="viewer-title"></span><button type="button" data-close aria-label="Закрыть галерею">✕</button></div><img class="viewer-image" alt=""><p class="viewer-error" hidden>Не удалось загрузить фотографию. Откройте её на Flickr по ссылке ниже.</p><div class="viewer-bottom"><button type="button" data-prev aria-label="Предыдущая фотография">←</button><span class="viewer-count" aria-live="polite"></span><a target="_blank" rel="noopener">На Flickr ↗</a><button type="button" data-next aria-label="Следующая фотография">→</button></div>';
  document.body.appendChild(dialog);
  const img = dialog.querySelector('img');
  const error = dialog.querySelector('.viewer-error');
  let group = [], index = 0, trigger;
  function show(next) {
    index = (next + group.length) % group.length;
    const a = group[index];
    error.hidden = true; img.hidden = false;
    img.src = a.href; img.alt = a.querySelector('img').alt;
    dialog.querySelector('.viewer-title').textContent = a.dataset.title || img.alt;
    dialog.querySelector('.viewer-count').textContent = (index + 1) + ' / ' + group.length;
    dialog.querySelector('.viewer-bottom a').href = a.dataset.flickr || a.href;
  }
  img.addEventListener('error', () => { error.hidden = false; img.hidden = true; });
  photos.forEach(a => a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); trigger = a;
    group = photos.filter(p => p.dataset.gallery === a.dataset.gallery);
    show(group.indexOf(a)); dialog.showModal(); document.body.classList.add('photo-open');
  }));
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-prev]').addEventListener('click', () => show(index - 1));
  dialog.querySelector('[data-next]').addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
  });
  dialog.addEventListener('close', () => { document.body.classList.remove('photo-open'); if (trigger) trigger.focus(); });
  let startX = null;
  img.addEventListener('touchstart', e => { startX = e.changedTouches[0].clientX; }, {passive:true});
  img.addEventListener('touchend', e => {
    if (startX !== null) { const delta = e.changedTouches[0].clientX - startX; if (Math.abs(delta) > 55) show(index + (delta < 0 ? 1 : -1)); }
    startX = null;
  }, {passive:true});
})();
