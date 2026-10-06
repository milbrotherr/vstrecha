(() => {
  const button = document.querySelector('.site-menu');
  const links = document.querySelector('.site-links');
  if (button && links) {
    document.documentElement.classList.add('has-js');
    const mobile = window.matchMedia('(max-width:700px)');
    let open = false;
    const hiddenRegions = [];
    function setMenu(value, restore = true) {
      open = value && mobile.matches;
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      links.classList.toggle('is-open', open);
      document.body.classList.toggle('site-menu-open', open);
      hiddenRegions.forEach(([node, before]) => { node.inert = before; });
      hiddenRegions.length = 0;
      if (open) {
        for (const node of document.body.children) {
          if (node.tagName !== 'SCRIPT' && node !== button.closest('nav') && !node.contains(button)) {
            hiddenRegions.push([node, node.inert]); node.inert = true;
          }
        }
        links.querySelector('a').focus();
      } else if (restore) button.focus();
    }
    button.addEventListener('click', () => setMenu(!open));
    links.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false, false); });
    document.addEventListener('keydown', e => {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); setMenu(false); }
      if (e.key === 'Tab') {
        const focusable = [button, ...links.querySelectorAll('a')];
        const i = focusable.indexOf(document.activeElement);
        if (e.shiftKey && i === 0) { e.preventDefault(); focusable.at(-1).focus(); }
        if (!e.shiftKey && i === focusable.length - 1) { e.preventDefault(); button.focus(); }
      }
    });
    mobile.addEventListener('change', () => setMenu(false, false));
  }
  const filterLinks = [...document.querySelectorAll('[data-news-filter]')];
  const cards = [...document.querySelectorAll('.news-page .news-card')];
  if (filterLinks.length) {
    function filter() {
      const requested = new URLSearchParams(location.search).get('tema') || 'all';
      const theme = ['forum','festival','chteniya'].includes(requested) ? requested : 'all';
      let count = 0;
      cards.forEach(card => { const visible = theme === 'all' || card.dataset.theme === theme; card.hidden = !visible; if (visible) count++; });
      filterLinks.forEach(link => link.setAttribute('aria-current', String(link.dataset.newsFilter === theme)));
      document.querySelector('.news-count').textContent = 'Публикаций: ' + count;
    }
    filterLinks.forEach(link => link.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault(); history.pushState(null, '', link.href); filter();
    }));
    addEventListener('popstate', filter); filter();
  }
  document.querySelectorAll('[data-copy-link]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const output = button.parentElement.querySelector('output');
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(location.href);
        else {
          const field = document.createElement('textarea'); field.value = location.href; field.style.position = 'fixed'; field.style.top = '-100px'; document.body.appendChild(field); field.select();
          const ok = document.execCommand('copy'); field.remove(); button.focus(); if (!ok) throw Error('copy');
        }
        output.textContent = 'Ссылка скопирована';
      } catch (_) { output.textContent = 'Скопируйте адрес из строки браузера'; }
    });
  });
  const oldArticles = {a1:'statya-ne-ubiy.html',a2:'statya-vygoranie.html',a3:'statya-chudesa.html'};
  if (location.pathname.endsWith('/zhurnal.html') && oldArticles[location.hash.slice(1)]) location.replace(oldArticles[location.hash.slice(1)]);
})();
