// Генератор страниц сайта «Встреча» из материалов админки.
// Работает и в браузере (админка), и в Node (проверки). Ничего не знает о GitHub.

export const SITE_URL = 'https://vstrecha.mpda.ru/';

const ARROW_UP = '<svg class="icon-arrow" viewbox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12"></path></svg>';
const ARROW_UP_CARD = '<svg class="icon-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 18 18 6M6 6h12v12"></path></svg>';
const ARROW_RIGHT = '<svg class="icon-arrow" viewbox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h16M13 5l7 7-7 7"></path></svg>';
const ARROW_LEFT = '<svg class="icon-arrow" viewbox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 12H4m7-7-7 7 7 7"></path></svg>';
const PHOTO = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="m3 16 5-5 5 5 4-3 4 4"></path><circle cx="16" cy="9" r="1"></circle></svg>';
const MDA_LICENSE = 'Текст воспроизведён без сокращений. Условия использования: <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/deed.ru" target="_blank" rel="noopener">CC BY-NC-ND 4.0</a>; <a href="https://mpda.ru/terms-of-use/" target="_blank" rel="noopener">правила МДА</a>.';

export const DEFAULT_SETTINGS = {
  directions: [
    { id: 'forum', name: 'Форум', page: 'forum.html', color: 'blue', events: true, card: 'Форум' },
    { id: 'festival', name: 'Фестиваль', page: 'festival.html', color: 'red', events: true, card: 'Фестиваль' },
    { id: 'chteniya', name: 'Чтения', page: 'chteniya.html', color: 'green', events: true, card: 'Чтения' },
    { id: 'journal', name: 'Журнал', page: 'zhurnal.html', color: 'burgundy', events: false, card: 'Журнал' },
    { id: 'dvizhenie', name: 'Движение', page: 'dvizhenie.html', color: 'ink', events: false, card: 'Движение' },
    { id: 'iniciativy', name: 'Инициативы', page: 'iniciativy.html', color: 'ink', events: false, card: 'Инициативы' },
    { id: 'general', name: 'Общее', page: 'novosti.html', color: 'red', events: false, card: 'Новости' },
  ],
  rubrics: ['В мире', 'В Церкви', 'В науке'],
  authors: [],
  home_event: null,
  journal_hero: null,
  journal_hero_text: '',
  flickr_users: { mpda: '164238858@N03' },
};

// ---------- утилиты ----------
export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export function dateLabel(start, end) {
  if (!start) return '';
  const [y, m, d] = start.split('-').map(Number);
  if (!end || end === start) return `${d} ${MONTHS[m - 1]} ${y}`;
  const [y2, m2, d2] = end.split('-').map(Number);
  if (y === y2 && m === m2) return `${d}–${d2} ${MONTHS[m - 1]} ${y}`;
  if (y === y2) return `${d} ${MONTHS[m - 1]} – ${d2} ${MONTHS[m2 - 1]} ${y}`;
  return `${d} ${MONTHS[m - 1]} ${y} – ${d2} ${MONTHS[m2 - 1]} ${y2}`;
}
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
export function slugify(text) {
  return String(text || '').toLowerCase().split('').map(c => TR[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 6).join('-') || 'material';
}
export function plainText(html) { return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim(); }
export function bodyWords(item) {
  return (item.body || []).map(b => b.type === 'list' ? (b.items || []).join(' ') : (b.html || b.text || '')).map(plainText).join(' ').split(' ').filter(Boolean).length;
}
export function autoMinutes(item) { return Math.max(1, Math.round(bodyWords(item) / 180)); }
export function articleMinutes(item) { const n = item.minutes || autoMinutes(item); return item.article?.minutes_label || (n + ' ' + minutesWord(n)); }
export function articleLetter(item) { return item.article?.letter || (item.title || '').replace(/^[^A-Za-zА-Яа-яЁё0-9]+/, '').charAt(0).toUpperCase(); }
function minutesWord(n) { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return 'минута'; if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return 'минуты'; return 'минут'; }

export function dirOf(settings, id) { return settings.directions.find(d => d.id === id) || settings.directions[settings.directions.length - 1]; }
export function itemDateLabel(item) { return item.date_label || dateLabel(item.date, item.date_end); }
export function pageOf(item) {
  if (item.slug) return item.slug;
  return (item.type === 'article' ? 'statya-' : 'novost-') + slugify(item.title) + '.html';
}
export function isListed(item) { return item.status === 'published'; }

// ---------- блоки тела ----------
export function renderBlocks(blocks, kind) {
  const out = [];
  for (const b of blocks || []) {
    switch (b.type) {
      case 'lead': out.push(kind === 'article' ? `<p class="lead">${b.html}</p>` : `<p class="lead">${b.html}</p>`); break;
      case 'p': out.push(`<p>${b.html}</p>`); break;
      case 'h': out.push(`<h${b.level === 3 ? 3 : 2}>${b.html}</h${b.level === 3 ? 3 : 2}>`); break;
      case 'list': { const t = b.ordered ? 'ol' : 'ul'; out.push(`<${t}>\n${(b.items || []).map(i => `<li>${i}</li>`).join('\n')}\n</${t}>`); break; }
      case 'quote':
        if (kind === 'article') out.push(`<div class="pull">${b.html}</div>`);
        else out.push(`<blockquote><p>${b.html}</p>${b.cite ? `<cite>${esc(b.cite)}</cite>` : ''}</blockquote>`);
        break;
      case 'image': out.push(`<figure class="body-figure"><img src="${esc(b.src)}" alt="${esc(b.alt || '')}" loading="lazy" decoding="async">${b.caption ? `<figcaption>${esc(b.caption)}</figcaption>` : ''}</figure>`); break;
      case 'info': out.push(`<dl class="body-info">${(b.rows || []).map(r => `<div><dt>${esc(r.k)}</dt><dd>${r.v}</dd></div>`).join('')}</dl>`); break;
      case 'html': out.push(b.html); break;
    }
  }
  return out.join(kind === 'article' ? '\n      ' : '\n');
}

// ---------- карточки новостей (как в инструменты/обновить_новости.py) ----------
function posterTitle(item) { return item.event?.card_title || item.category || ''; }
export function newsCard(item, settings) {
  const url = esc(pageOf(item)), title = esc(item.title), dir = dirOf(settings, item.direction);
  const label = itemDateLabel(item);
  const cover = item.cover?.src
    ? `<a class="news-cover" href="${url}" tabindex="-1" aria-hidden="true"><img src="${esc(item.cover.src)}" alt="" loading="lazy" decoding="async" width="960" height="600" style="object-position:${esc(item.cover.position || 'center')}"></a>`
    : `<a class="news-announcement-art" href="${url}" tabindex="-1" aria-hidden="true"><span class="roman">${esc(posterTitle(item))}</span><span>${esc(label)}</span><span>Московская духовная академия</span></a>`;
  const n = item.gallery?.photos?.length || 0;
  const photos = n ? `<a class="news-photo-count" href="${url}#gallery" aria-label="Фотогалерея: ${title}">${PHOTO}${n} фото</a>` : '';
  const src = item.source?.url ? `<a class="source-link" href="${esc(item.source.url)}" target="_blank" rel="noopener" aria-label="Источник ${esc(item.source.label || 'МДА')}: ${title}">${esc(item.source.label || 'МДА')} ${ARROW_UP_CARD}</a>` : '';
  return `<article class="news-card news-card--${dir.id}" data-theme="${dir.id}"><div class="news-media">${cover}${photos}</div><div class="news-card-body"><div class="news-card-meta"><span class="news-card-topic">${esc(item.category || dir.card)}</span> <time datetime="${esc(item.date)}">${esc(label)}</time></div><h3><a href="${url}">${title}</a></h3><p>${esc(item.excerpt)}</p><div class="news-card-actions"><a href="${url}" aria-label="Читать: ${title}">Читать ${ARROW_UP_CARD}</a>${src}</div></div></article>`;
}
function newsBlock(items, settings, title, related) {
  const link = title === 'Все публикации' ? '' : '<a class="all-news" href="novosti.html">Все новости ' + ARROW_UP_CARD + '</a>';
  const cls = related ? 'project-news related-news' : 'project-news';
  const hc = title === 'Все публикации' ? 'news-heading visually-hidden' : 'news-heading';
  return `<section class="${cls}" id="${related ? 'related-news' : 'news'}" aria-label="${esc(title)}"><div class="${hc}"><h2>${esc(title)}</h2>${link}</div><div class="news-grid">${items.map(i => newsCard(i, settings)).join('\n')}</div></section>`;
}

// ---------- страница новости / события ----------
function crumbs(parts) {
  return '<nav class="breadcrumbs" aria-label="Путь к странице">' + parts.map((p, i) => i === parts.length - 1 ? `<span aria-current="page">${esc(p[0])}</span>` : `<a href="${p[1]}">${esc(p[0])}</a><span aria-hidden="true">/</span>`).join('') + '</nav>';
}
function headMeta(title, desc, url, image) {
  return `<meta name="description" content="${esc(desc)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="article"><meta property="og:url" content="${SITE_URL}${url}"><meta property="og:locale" content="ru_RU"><link rel="canonical" href="${SITE_URL}${url}"><link rel="icon" href="assets/favicon.svg" type="image/svg+xml">${image ? `<meta property="og:image" content="${esc(absUrl(image))}">` : ''}`;
}
function absUrl(u) { return /^https?:/.test(u) ? u : SITE_URL + u.replace(/^\//, ''); }
function fill(tpl, map) { return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? ''); }
function sortByDate(list) { return [...list].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.order ?? 0) - (b.order ?? 0)); }

export function renderGallery(item) {
  const g = item.gallery; const photos = g?.photos || [];
  if (!photos.length) return '';
  const gid = 'album-' + (item.id || slugify(item.title));
  const a = (p, i) => `<a href="${esc(p.b)}" data-photo data-gallery="${gid}" data-title="${esc(item.title)}" data-flickr="${esc(p.page)}" target="_blank" rel="noopener"><img src="${esc(p.z)}" alt="${esc(item.title)} — фото ${i + 1}" loading="lazy" decoding="async" width="${p.w || 640}" height="${p.h || 427}"></a>`;
  const first = photos.slice(0, 6).map(a).join('');
  const rest = photos.slice(6).map((p, i) => a(p, i + 6)).join('');
  return `<section class="event-gallery" id="gallery" aria-label="Фотогалерея события"><div class="gallery-heading"><h2>ФОТОГАЛЕРЕЯ</h2><a href="${esc(g.album_url)}" target="_blank" rel="noopener">Весь альбом на Flickr ${ARROW_UP}</a></div>${g.credit ? `<p class="gallery-credit">${esc(g.credit)}</p>` : ''}<div class="album-grid">${first}</div>${rest ? `<details class="more-photos"><summary>Ещё фотографии (${photos.length - 6})</summary><div class="album-grid">${rest}</div></details>` : ''}</section>`;
}

function sourceBlock(item) {
  const s = item.source || {};
  if (!s.author && !s.url) return '';
  if (s.kind === 'mda') return `<div class="story-source">Автор: ${esc(s.author || 'Пресс-служба МДА')}. <a href="${esc(s.url)}" target="_blank" rel="noopener">Оригинал публикации на сайте Московской духовной академии</a>.<br>${MDA_LICENSE}</div>`;
  return `<div class="story-source">${s.author ? `Автор: ${esc(s.author)}.` : ''}${s.url ? ` <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.link_text || 'Источник')}</a>.` : ''}</div>`;
}
function untilAttr(ev) { return ev?.register_until ? ` data-until="${esc(ev.register_until)}"` : ''; }

export function renderNewsPage(item, ctx) {
  const { settings, templates, items } = ctx;
  const dir = dirOf(settings, item.direction);
  const page = pageOf(item);
  const label = itemDateLabel(item);
  const full = item.full_title || item.title;
  const ev = item.type === 'event' ? (item.event || {}) : null;
  const minutes = item.minutes || autoMinutes(item);
  const back = dir.page === 'novosti.html' ? 'novosti.html' : dir.page + '#news';
  const backLabel = item.back_label || (item.category || dir.name).toLowerCase();
  const tools = [];
  if (item.gallery?.photos?.length) tools.push(`<a href="#gallery">Фотогалерея · ${item.gallery.photos.length} фото ${ARROW_RIGHT}</a>`);
  if (ev?.register_url) tools.push(`<a href="${esc(ev.register_url)}" target="_blank" rel="noopener"${untilAttr(ev)}>Регистрация ${ARROW_UP}</a>`);
  tools.push('<button type="button" data-copy-link hidden>Скопировать ссылку</button><output aria-live="polite"></output>');
  let main = `<header class="story-header"><a class="story-back" href="${back}">${ARROW_LEFT} К новостям: ${esc(backLabel)}</a><h1>${esc(full)}</h1><p class="story-meta">${esc(item.category || dir.card)} · <time datetime="${esc(item.date)}">${esc(label)}</time><span class="reading-time"> · ${minutes} мин чтения</span></p><div class="story-tools">${tools.join('')}</div></header>`;
  if (item.cover?.src) main += `<img class="story-cover" src="${esc(item.cover.src)}" alt="${esc(item.cover.alt || item.title)}" width="1600" height="900" fetchpriority="high" decoding="async"${item.cover.position && item.cover.position !== 'center' ? ` style="object-position:${esc(item.cover.position)}"` : ''}>`;
  main += `<article class="story-body">${renderBlocks(item.body, 'news')}</article>`;
  main += sourceBlock(item);
  if (ev?.register_url) main += `<section class="cta"${untilAttr(ev)}><h2>${esc(ev.cta_title || 'Регистрация открыта')}</h2><p>${esc(ev.cta_text || [label, ev.place].filter(Boolean).join(' · '))}</p><a href="${esc(ev.register_url)}" target="_blank" rel="noopener">Зарегистрироваться</a></section>`;
  main += renderGallery(item);
  // «По теме»: две публикации того же направления, иначе любые
  const pool = sortByDate(items.filter(i => i.type !== 'article' && isListed(i) && i.id !== item.id));
  let rel = pool.filter(i => i.direction === item.direction).slice(0, 2);
  if (!rel.length) rel = pool.slice(0, 2);
  main += `<!-- NEWS:related:START -->\n${newsBlock(rel, settings, 'По теме', true)}\n<!-- NEWS:related:END -->`;
  const parts = [['Главная', 'index.html']];
  if (dir.events) parts.push(['События', 'sobytiya.html']);
  if (dir.page !== 'novosti.html') parts.push([dir.name, dir.page]); else parts.push(['Новости', 'novosti.html']);
  parts.push([item.crumb || full, '']);
  return fill(templates.news, {
    TITLE: esc(full) + ' — Встреча',
    ACCENT: dir.color === 'ink' ? 'ink' : dir.color,
    META: headMeta(full + ' — Встреча', item.excerpt, page, item.og_image || item.cover?.src),
    CRUMBS: crumbs(parts),
    MAIN: main,
  });
}

// ---------- статьи журнала ----------
function articleRelatedCard(a) {
  const ph = a.article?.card_image
    ? `<div class="ph ph--img" style="background-image:url('${esc(a.article.card_image)}')"></div>`
    : `<div class="ph ph--${esc(a.article?.color || 'red')}"><div class="g">${esc(a.article?.related_letter || articleLetter(a))}</div></div>`;
  return `
          <a class="card live" href="${esc(pageOf(a))}">
            ${ph}
            <div class="card-in">
              <h3>${esc(a.title)}</h3>
              <div class="byline">${esc(a.article?.rubric || '')} · ${esc(a.article?.author_name || '')}</div>
            </div>
          </a>`;
}
export function renderArticlePage(item, ctx) {
  const { templates, items } = ctx;
  const a = item.article || {};
  const page = pageOf(item);
  const minutes = articleMinutes(item);
  const others = sortByDate(items.filter(i => i.type === 'article' && isListed(i) && i.id !== item.id)).slice(0, 2);
  const initial = (a.author_name || '?').trim()[0];
  let main = `<div class="article-mast"><a href="zhurnal.html">ЖУРНАЛ <em>В</em>СТРЕЧА</a></div><div class="art">
    <div class="art-hero art-hero--${esc(a.color || 'blue')}">
      <div class="wrap">
        <span class="tag tag--dark">${esc(a.rubric)}</span>
        <h1>${esc(item.title)}</h1>
        <p class="deck">${esc(a.deck || item.excerpt)}</p>
        <div class="byline">Текст: <b>${esc(a.author_name)}</b>${a.author_byline ? ', ' + esc(a.author_byline) : ''} · ${esc(minutes)}</div>
      </div>
    </div>
    <div class="art-body">
      ${renderBlocks(item.body, 'article')}
    </div>
    <div class="art-author">
      <div class="ava ava--${esc(a.color || 'blue')}">${esc(initial)}</div>
      <div>
        <b>${esc(a.author_name)}</b>
        <span>${esc(a.author_full || a.author_byline || '')}</span>
      </div>
    </div>`;
  if (others.length) main += `
    <section class="related">
      <div class="wrap">
        <div class="sect-head"><h2>Читать <span>дальше</span></h2></div>
        <div class="cards">${others.map(articleRelatedCard).join('')}
        </div>
      </div>
    </section>`;
  main += `
  </div>

`;
  return fill(templates.article, {
    TITLE: esc(item.title) + ' — Встреча',
    META: headMeta(item.title + ' — Встреча', a.deck || item.excerpt, page, item.cover?.src),
    CRUMBS: crumbs([['Главная', 'index.html'], ['Журнал', 'zhurnal.html'], ['Статья', '']]),
    MAIN: main,
  });
}

function journalGrid(articles) {
  return `<section class="wrap" id="materialy"><div class="sect-head"><h2>Материалы <span>журнала</span></h2></div><div class="journal-grid">${articles.map(a => `<a class="card live" href="${esc(pageOf(a))}"><div class="ph ph--${esc(a.article?.color || 'red')}"><div class="g">${esc(articleLetter(a))}</div></div><div class="card-in"><span class="tag">${esc(a.article?.rubric)}</span><h2>${esc(a.title)}</h2><p>${esc(a.article?.deck || a.excerpt)}</p><div class="byline">${esc(a.article?.author_name)}</div></div></a>`).join('')}</div></section>`;
}
function journalHero(a, settings) {
  if (!a) return '';
  const art = a.article || {};
  return `<section class="hero">
<div class="hero-grid">
<div class="hero-art hero-art--type">${esc(articleLetter(a))}<div class="cap">${esc(art.rubric)} · ${esc(art.author_name)}</div></div><div class="hero-body">
<span class="tag">${esc(art.rubric)}</span>
<h2 class="hero-title"><a href="${esc(pageOf(a))}">${esc(a.title)}</a></h2>
<p class="hero-deck">${esc(settings.journal_hero_text && settings.journal_hero === a.id ? settings.journal_hero_text : (art.deck || a.excerpt))}</p>
<div class="byline">Текст: <b>${esc(art.author_name)}</b>${art.author_short ? ' · ' + esc(art.author_short) : ''} · ${esc(articleMinutes(a))}</div>
<a class="readmore" href="${esc(pageOf(a))}">Читать ${ARROW_RIGHT}</a>
</div>
</div>
</section>`;
}

// ---------- анонс события на главной и в «Событиях» ----------
function homeAnnounce(ev) {
  if (!ev) return '';
  const e = ev.event || {}, page = esc(pageOf(ev)), label = itemDateLabel(ev);
  const reg = e.register_url ? `<a class="register" href="${esc(e.register_url)}" target="_blank" rel="noopener"${untilAttr(e)}>Зарегистрироваться ${ARROW_UP}</a>` : '';
  return `<section class="mainnews featured-forum" aria-label="${esc(e.home_aria || 'Анонс: ' + (e.home_title || ev.title))}">
<a class="forum-poster" href="${page}"><span class="poster-top">${esc(e.poster_top || 'Ближайшее событие')}</span><span class="poster-title">${e.poster_title ? esc(e.poster_title).replace(/\n/g, '<br>') : esc(ev.title)}</span><span class="poster-date">${e.poster_date ? esc(e.poster_date).replace(/\n/g, '<br>') : esc(label)}</span></a>
<div class="mn-body"><span class="chip">Ближайшая встреча</span><h2>${esc(e.home_title || ev.full_title || ev.title)}</h2><p>${esc(e.home_text || ev.excerpt)}</p><div class="meta">${esc(e.home_meta || [label, e.place].filter(Boolean).join(' · '))}</div><div class="featured-actions">${reg}<a href="${page}">${esc(e.more_label || 'Подробнее')} ${ARROW_UP}</a></div></div>
</section>`;
}
function eventsAnnounce(ev) {
  if (!ev) return '';
  const e = ev.event || {}, page = esc(pageOf(ev)), label = itemDateLabel(ev);
  const reg = e.register_url ? `<a class="primary" href="${esc(e.register_url)}" target="_blank" rel="noopener"${untilAttr(e)}>Зарегистрироваться ${ARROW_UP}</a>` : '';
  return `<section class="next-event" aria-label="${esc(e.short_aria || 'Ближайшее событие')}"><div><h2>${esc(e.short_title || ev.title)}</h2><p>${esc(e.short_meta || [label, e.place].filter(Boolean).join(' · '))}</p></div><div class="action-row">${reg}<a href="${page}">${esc(e.short_more || 'Программа и подробности')} ${ARROW_RIGHT}</a></div></section>`;
}

// ---------- сборка сайта ----------
export function replaceMarker(text, name, value) {
  const re = new RegExp('<!-- ' + name.replace(/[:]/g, '\\:') + ':START -->[\\s\\S]*?<!-- ' + name + ':END -->');
  if (!re.test(text)) return text;
  return text.replace(re, () => `<!-- ${name}:START -->\n${value}\n<!-- ${name}:END -->`);
}

const LISTING_PAGES = ['index.html', 'o-proekte.html', '404.html', 'novosti.html', 'forum.html', 'festival.html', 'chteniya.html', 'zhurnal.html', 'o-zhurnale.html', 'dvizhenie.html', 'iniciativy.html', 'sobytiya.html'];
export const SITE_FILES_NEEDED = [...LISTING_PAGES, 'sitemap.xml', 'data/news.json'];

export function selectionFor(file, news, settings, today) {
  const sorted = sortByDate(news);
  if (['index.html', 'o-proekte.html', '404.html'].includes(file)) return sorted.filter(n => n.type !== 'event' || n.date < today).slice(0, 3);
  if (file === 'novosti.html') return sorted;
  const map = { 'o-zhurnale.html': 'journal' };
  const d = settings.directions.find(x => x.page === file);
  const dirId = map[file] || d?.id;
  if (!dirId) return [];
  return sorted.filter(n => n.direction === dirId || (n.show_on || []).includes(dirId));
}

// files: { 'index.html': '...', ... } — текущие файлы сайта. Возвращает { write: {path: content}, remove: [paths] }.
export function buildSite({ items, settings, templates, files, today, knownPages = [] }) {
  today = today || new Date().toISOString().slice(0, 10);
  const ctx = { items, settings, templates };
  const write = {}, remove = [];
  const published = items.filter(isListed);
  const news = published.filter(i => i.type !== 'article');
  const articles = sortByDate(published.filter(i => i.type === 'article'));
  for (const it of published) write[pageOf(it)] = it.type === 'article' ? renderArticlePage(it, ctx) : renderNewsPage(it, ctx);
  for (const it of items) if (!isListed(it) && it.slug && !published.some(p => pageOf(p) === it.slug)) remove.push(it.slug);

  const usedDirs = settings.directions.filter(d => news.some(n => n.direction === d.id));
  const homeEv = settings.home_event ? published.find(i => i.id === settings.home_event && i.type === 'event') : null;
  for (const f of LISTING_PAGES) {
    let s = files[f]; if (s == null) continue;
    if (s.includes('<!-- NEWS:main:START -->')) s = replaceMarker(s, 'NEWS:main', newsBlock(selectionFor(f, news, settings, today), settings, f === 'novosti.html' ? 'Все публикации' : 'Новости', false));
    if (f === 'novosti.html') {
      s = s.replace(/(<p class="news-count"[^>]*>)[\s\S]*?(<\/p>)/, (_, a, b) => a + 'Публикаций: ' + news.length + b);
      s = s.replace(/<nav class="news-filters"[^>]*>[\s\S]*?<\/nav>/, '<nav class="news-filters" aria-label="Темы новостей"><a href="novosti.html" data-news-filter="all" aria-current="true">Все</a>' + usedDirs.map(d => `<a href="novosti.html?tema=${d.id}" data-news-filter="${d.id}" aria-current="false">${esc(d.name)}</a>`).join('') + '</nav>');
    }
    if (f === 'zhurnal.html') {
      const hero = articles.find(a => a.id === settings.journal_hero) || articles[0];
      s = replaceMarker(s, 'JOURNAL:hero', journalHero(hero, settings));
      s = replaceMarker(s, 'JOURNAL:grid', journalGrid(articles));
    }
    if (f === 'index.html') s = replaceMarker(s, 'ANNOUNCE:home', homeAnnounce(homeEv));
    if (f === 'sobytiya.html') s = replaceMarker(s, 'ANNOUNCE:events', eventsAnnounce(homeEv));
    if (s !== files[f]) write[f] = s;
  }
  // sitemap
  if (files['sitemap.xml'] != null) {
    const locs = [...files['sitemap.xml'].matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1].replace(SITE_URL, '') || 'index.html');
    const own = new Set([...items.map(i => i.slug).filter(Boolean), ...knownPages]);
    const set = new Set(locs.filter(l => !own.has(l) || published.some(p => pageOf(p) === l)));
    for (const p of published) set.add(pageOf(p));
    const sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + [...set].sort().map(l => `<url><loc>${SITE_URL}${l === 'index.html' ? '' : l}</loc></url>`).join('') + '</urlset>';
    if (sm.trim() !== files['sitemap.xml'].trim()) write['sitemap.xml'] = sm + (files['sitemap.xml'].endsWith('\n') ? '\n' : '');
  }
  // data/news.json — для совместимости со старым скриптом
  const json = JSON.stringify(sortByDate(news).map(n => ({
    id: n.id, slug: pageOf(n), title: n.title, source_title: n.full_title || n.title, theme: n.direction, category: n.category || dirOf(settings, n.direction).card,
    event_date: n.date, date_label: itemDateLabel(n), excerpt: n.excerpt, cover: n.cover?.src || null, cover_position: n.cover?.position || 'center',
    source_url: n.source?.url || null, album_url: n.gallery?.album_url || null, photo_count: n.gallery?.photos?.length || 0, photo_credit: n.gallery?.credit || null, announcement: n.type === 'event',
  })), null, 2) + '\n';
  if (files['data/news.json'] == null || json !== files['data/news.json']) write['data/news.json'] = json;
  return { write, remove };
}

// Что видит сайт: у опубликованных — сохранённая при публикации версия (live), у остальных — только адрес для удаления.
export function snapshot(item) { const { live, ...rest } = item; return JSON.parse(JSON.stringify({ ...rest, status: 'published' })); }
export function siteItems(items) {
  return items.map(i => {
    if (i.status === 'published' && i.live) return { ...i.live, status: 'published', id: i.id };
    return { id: i.id, type: i.type, slug: i.slug || null, status: i.status === 'published' ? 'draft' : i.status, title: i.title };
  });
}
export function hasUnpublished(item) {
  if (!item.live) return false;
  const a = snapshot(item), b = { ...item.live, status: 'published' };
  for (const k of ['updated', 'created', 'published_at']) { delete a[k]; delete b[k]; }
  return JSON.stringify(a) !== JSON.stringify(b);
}

// ---------- проверка перед публикацией ----------
export function validate(item, items) {
  const errs = [];
  if (!item.title?.trim()) errs.push('Нет названия');
  if (!item.excerpt?.trim() && !(item.type === 'article' && item.article?.deck)) errs.push('Нет короткого описания');
  if (!item.date) errs.push('Нет даты');
  if (!(item.body || []).some(b => plainText(b.html || (b.items || []).join(' ')).length)) errs.push('Пустой текст');
  if (item.type === 'article') {
    if (!item.article?.author_name) errs.push('Не указан автор статьи');
    if (!item.article?.rubric) errs.push('Не выбрана рубрика');
  } else if (!item.direction) errs.push('Не выбрано направление');
  if (item.type === 'news' && !item.cover?.src) errs.push('Нет обложки');
  const page = pageOf(item);
  if (items.some(i => i.id !== item.id && pageOf(i) === page)) errs.push('Адрес страницы уже занят: ' + page);
  if (item.gallery?.album_url && !item.gallery?.photos?.length) errs.push('Альбом Flickr не загружен');
  return errs;
}
