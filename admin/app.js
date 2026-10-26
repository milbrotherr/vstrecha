// Админка сайта «Встреча»
import {
  esc, dateLabel, slugify, pageOf, dirOf, itemDateLabel, autoMinutes, bodyWords, articleMinutes, articleLetter,
  buildSite, siteItems, snapshot, hasUnpublished, validate, renderNewsPage, renderArticlePage,
  SITE_FILES_NEEDED, DEFAULT_SETTINGS, SITE_URL,
} from './generator.js';
import { GitHub, CMS_REPO, SITE_REPO, CMS_DIR } from './github.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = $('#root');
const TOKEN_KEY = 'vstrecha_admin_token';

const S = {
  gh: null, settings: null, items: new Map(), templates: null,
  filters: { q: '', type: 'all', dir: 'all', status: 'all' },
  draft: null, dirty: false, blobUrls: new Map(),
};

// ---------- мелочи ----------
const ICONS = {
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-6h4v6"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 4h4v16H5zM10 4h4v16h-4zM15 5l3.5-.8 3 15.6-3.5.8z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  out: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9"/></svg>',
  grip: '<svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor"><circle cx="4" cy="4" r="1.6"/><circle cx="10" cy="4" r="1.6"/><circle cx="4" cy="9" r="1.6"/><circle cx="10" cy="9" r="1.6"/><circle cx="4" cy="14" r="1.6"/><circle cx="10" cy="14" r="1.6"/></svg>',
  photos: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 16 5-5 5 5 4-3 4 4"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
};
const TYPE_NAMES = { news: 'Новость', article: 'Статья журнала', event: 'Событие' };
const STATUS_NAMES = { draft: 'Черновик', published: 'Опубликован', hidden: 'Скрыт' };
const COLORS = { blue: '#0561D9', red: '#F23B13', burg: '#8C034E', green: '#05A56A' };
const DIR_COLORS = { blue: '#0561D9', red: '#F23B13', green: '#05A56A', burgundy: '#8C034E', ink: '#17130E' };
const BLOCKS = [
  { type: 'lead', name: 'Лид', note: 'Вводный абзац', icon: '≡' },
  { type: 'p', name: 'Текст', note: 'Абзац с форматированием', icon: '¶' },
  { type: 'h', name: 'Подзаголовок', note: 'Уровни H2–H3', icon: 'H' },
  { type: 'list', name: 'Список', note: 'Маркеры или нумерация', icon: '•' },
  { type: 'quote', name: 'Цитата', note: 'Выносная цитата', icon: '❝' },
  { type: 'image', name: 'Фото', note: 'Изображение с подписью', icon: '▣' },
  { type: 'info', name: 'Информация', note: 'Пары «поле — значение»', icon: 'i' },
  { type: 'html', name: 'HTML', note: 'Особый блок, код', icon: '<>' },
];
const today = () => new Date().toISOString().slice(0, 10);
const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => 'm-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
function fmtDate(iso) { if (!iso) return ''; const d = new Date(iso); return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }); }
function getPath(o, path) { return path.split('.').reduce((a, k) => a == null ? a : a[k], o); }
function setPath(o, path, v) { const ks = path.split('.'); let a = o; for (const k of ks.slice(0, -1)) { if (a[k] == null || typeof a[k] !== 'object') a[k] = {}; a = a[k]; } a[ks.at(-1)] = v; }

function toast(msg, kind = '') {
  const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
  $('#toasts').append(t); setTimeout(() => t.remove(), kind === 'err' ? 9000 : 4500);
}
async function busy(label, fn) {
  const b = document.createElement('div'); b.className = 'busy'; b.innerHTML = `<div><span class="spin"></span>${esc(label)}</div>`;
  document.body.append(b);
  try { return await fn(); } finally { b.remove(); }
}

// ---------- безопасный HTML для текстовых блоков ----------
const ALLOWED = { STRONG: [], EM: [], A: ['href', 'target', 'rel'], SUP: [], SUB: [], BR: [] };
export function cleanInline(html) {
  const box = document.createElement('div'); box.innerHTML = html;
  (function walk(node) {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 3) continue;
      if (ch.nodeType !== 1) { ch.remove(); continue; }
      walk(ch);
      let tag = ch.tagName; if (tag === 'B') tag = 'STRONG'; if (tag === 'I') tag = 'EM';
      if (!ALLOWED[tag]) { ch.replaceWith(...ch.childNodes); continue; }
      if (tag !== ch.tagName) { const n = document.createElement(tag); n.append(...ch.childNodes); ch.replaceWith(n); continue; }
      for (const a of [...ch.attributes]) if (!ALLOWED[tag].includes(a.name)) ch.removeAttribute(a.name);
      if (tag === 'A') { const h = ch.getAttribute('href') || ''; if (!/^(https?:|mailto:|tel:|#|[a-z0-9-]+\.html)/i.test(h)) ch.removeAttribute('href'); if (/^https?:/.test(h)) { ch.setAttribute('target', '_blank'); ch.setAttribute('rel', 'noopener'); } }
    }
  })(box);
  return box.innerHTML.replace(/<br>$/, '');
}

// ---------- данные ----------
function makeGH(token) { return window.__VSTRECHA_GH__ ? new window.__VSTRECHA_GH__(token) : new GitHub(token); }

async function loadAll() {
  const tree = await S.gh.tree(CMS_REPO);
  S.cmsFiles = tree.files;
  const settingsPath = CMS_DIR + 'settings.json';
  S.settings = { ...clone(DEFAULT_SETTINGS), ...(tree.files[settingsPath] ? JSON.parse(await S.gh.readBlobText(CMS_REPO, tree.files[settingsPath])) : {}) };
  const paths = Object.keys(tree.files).filter(p => p.startsWith(CMS_DIR + 'items/') && p.endsWith('.json'));
  const loaded = await Promise.all(paths.map(async p => JSON.parse(await S.gh.readBlobText(CMS_REPO, tree.files[p]))));
  S.items = new Map(loaded.map(i => [i.id, i]));
}
async function loadTemplates() {
  if (S.templates) return S.templates;
  const [news, article] = await Promise.all([S.gh.readText(SITE_REPO, 'admin/templates/news.html'), S.gh.readText(SITE_REPO, 'admin/templates/article.html')]);
  return (S.templates = { news, article });
}
function itemPath(id) { return CMS_DIR + 'items/' + id + '.json'; }
function itemJSON(item) { return JSON.stringify(item, null, 2) + '\n'; }

async function imageUrl(src) {
  if (!src) return '';
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  if (S.blobUrls.has(src)) return S.blobUrls.get(src);
  try {
    const bytes = await S.gh.readBytes(CMS_REPO, CMS_DIR + src);
    const type = /\.png$/i.test(src) ? 'image/png' : /\.webp$/i.test(src) ? 'image/webp' : 'image/jpeg';
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    S.blobUrls.set(src, url); return url;
  } catch (_) { return SITE_URL + src; }
}
async function hydrateImages(el) {
  for (const n of $$('[data-img]', el)) {
    const u = await imageUrl(n.dataset.img);
    if (n.tagName === 'IMG') n.src = u; else n.style.backgroundImage = `url("${u}")`;
  }
}

function usedUploads(list) {
  const out = new Set();
  for (const i of list) {
    const add = s => { if (s && s.startsWith('uploads/')) out.add(s); };
    add(i.cover?.src); add(i.article?.card_image); add(i.og_image);
    for (const b of i.body || []) if (b.type === 'image') add(b.src);
  }
  return [...out];
}

// Пересобрать сайт и записать изменения в репозиторий сайта.
async function rebuildSite(message) {
  const templates = await loadTemplates();
  const files = {};
  await Promise.all(SITE_FILES_NEEDED.map(async f => { try { files[f] = await S.gh.readText(SITE_REPO, f); } catch (e) { if (e.status !== 404) throw e; } }));
  const all = [...S.items.values()];
  const site = siteItems(all);
  const { write, remove } = buildSite({ items: site, settings: S.settings, templates, files, today: today(), knownPages: all.map(i => i.slug).filter(Boolean) });
  const changes = { ...write };
  for (const r of remove) changes[r] = null;
  const needed = usedUploads(site.filter(i => i.status === 'published'));
  if (needed.length) {
    const siteTree = await S.gh.tree(SITE_REPO);
    for (const u of needed) if (!siteTree.files[u]) changes[u] = await S.gh.readBytes(CMS_REPO, CMS_DIR + u);
  }
  await S.gh.commit(SITE_REPO, changes, message);
  return Object.keys(changes).length;
}
async function saveCms(changes, message) { await S.gh.commit(CMS_REPO, changes, message); }

// ---------- вход ----------
function renderLogin(error = '') {
  root.innerHTML = `<div class="login"><form class="login-card" id="login">
    <div class="eyebrow">Встреча · админка</div>
    <h1>Вход</h1>
    <p>Вставьте токен GitHub. Он хранится только в этом браузере и нужен, чтобы сохранять материалы и публиковать их на сайт.</p>
    <label class="field"><span>Токен GitHub</span><input class="input" name="token" type="password" autocomplete="off" required placeholder="github_pat_…"></label>
    <label class="chip" style="margin-bottom:18px"><input type="checkbox" name="remember" checked><span>Запомнить на этом устройстве</span></label>
    <button class="btn btn-primary" style="width:100%;justify-content:center">Войти</button>
    ${error ? `<div class="login-error">${esc(error)}</div>` : ''}
    <small class="hint" style="margin-top:16px">Нужен fine-grained токен с доступом к репозиториям vstrecha и vstrecha-project, право Contents: Read and write.</small>
  </form></div>`;
  $('#login').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target); const token = f.get('token').trim();
    try {
      const gh = makeGH(token);
      await busy('Проверяю доступ…', () => gh.checkAccess());
      try { (f.get('remember') ? localStorage : sessionStorage).setItem(TOKEN_KEY, token); } catch (_) { }
      S.gh = gh; await start();
    } catch (err) { renderLogin(err.message || 'Не удалось войти'); }
  });
}
function logout() {
  try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch (_) { }
  location.hash = ''; location.reload();
}

// ---------- каркас ----------
function shell(active, inner) {
  return `<div class="app"><aside class="side">
    <div class="side-brand"><b>Встреча · Админка</b><span>Сайт vstrecha.mpda.ru</span></div>
    <nav>
      <div class="group">Контент сайта</div>
      <a href="#/" ${active === 'list' ? 'aria-current="page"' : ''}>${ICONS.list}Публикации</a>
      <a href="#/home" ${active === 'home' ? 'aria-current="page"' : ''}>${ICONS.home}Главная страница</a>
      <a href="#/dicts" ${active === 'dicts' ? 'aria-current="page"' : ''}>${ICONS.book}Справочники</a>
      <div class="group">Настройки</div>
      <a href="#/settings" ${active === 'settings' ? 'aria-current="page"' : ''}>${ICONS.gear}Настройки</a>
    </nav>
    <a class="side-site" href="${SITE_URL}" target="_blank" rel="noopener">Открыть сайт ↗</a>
    <div class="side-foot"><span class="ava">В</span><span>Редакция «Встречи»</span><button type="button" data-act="logout" title="Выйти">${ICONS.out}</button></div>
  </aside><main class="main">${inner}</main></div>`;
}
document.addEventListener('click', e => { if (e.target.closest('[data-act="logout"]')) logout(); });

// ---------- список публикаций ----------
function statusOf(i) { return i.status || 'draft'; }
function renderList() {
  const f = S.filters, set = S.settings;
  const dirs = set.directions;
  let list = [...S.items.values()].sort((a, b) => (b.updated || '').localeCompare(a.updated || '') || (b.date || '').localeCompare(a.date || ''));
  list = list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const q = f.q.trim().toLowerCase();
  if (q) list = list.filter(i => (i.title + ' ' + (i.full_title || '') + ' ' + (i.excerpt || '')).toLowerCase().includes(q));
  if (f.type !== 'all') list = list.filter(i => i.type === f.type);
  if (f.dir !== 'all') list = list.filter(i => i.direction === f.dir);
  if (f.status !== 'all') list = list.filter(i => statusOf(i) === f.status);
  const cards = list.map(i => {
    const dir = dirOf(set, i.direction);
    const author = i.type === 'article' ? (i.article?.author_name || 'Автор не указан') : (i.source?.author || 'Редакция «Встречи»');
    const coverSrc = i.cover?.src || (i.type === 'article' ? i.article?.card_image : null);
    const cover = coverSrc ? `<div class="card-cover" data-img="${esc(coverSrc)}">`
      : `<div class="card-cover" style="background:${i.type === 'article' ? COLORS[i.article?.color] || COLORS.blue : DIR_COLORS[dir.color] || '#5B57F0'}"><div class="poster">${i.type === 'article' ? `<span style="font-size:56px;font-weight:400">${esc(articleLetter(i))}</span>` : esc(i.event?.card_title || i.category || dir.name)}<small>${esc(itemDateLabel(i))}</small></div>`;
    const st = statusOf(i);
    const n = i.gallery?.photos?.length || 0;
    return `<a class="card" href="#/edit/${encodeURIComponent(i.id)}">${cover}
      <span class="badge badge-status st-${st}">${STATUS_NAMES[st]}</span><span class="badge badge-type">${TYPE_NAMES[i.type]}</span>
      ${hasUnpublished(i) ? '<span class="badge badge-dirty">Есть правки</span>' : ''}</div>
      <div class="card-body"><div class="card-meta"><b>${esc(i.type === 'article' ? (i.article?.rubric || 'Журнал') : dir.name)}</b><span>${esc(itemDateLabel(i))}</span></div>
      <h3>${esc(i.title || 'Без названия')}</h3><p>${esc(i.type === 'article' ? (i.article?.deck || i.excerpt) : i.excerpt)}</p>
      <div class="card-foot"><span class="ava">${esc((author || '?')[0])}</span>${esc(author)}<span class="n">${n ? ICONS.photos + n : ''}</span></div></div></a>`;
  }).join('');
  const opt = (v, l, cur) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${esc(l)}</option>`;
  root.innerHTML = shell('list', `<div class="page">
    <div class="page-head"><div><div class="eyebrow">Контент сайта</div><h1>Публикации</h1><p>Новости, статьи журнала и события в одном месте.</p></div>
      <div class="menu-wrap"><button class="btn btn-primary" type="button" data-act="new">${ICONS.plus}Новая публикация</button>
        <div class="menu" id="new-menu" hidden>
          <button type="button" data-new="news"><b>Новость</b><span>Репортаж, новость с сайта МДА</span></button>
          <button type="button" data-new="article"><b>Статья журнала</b><span>Текст студента в журнале</span></button>
          <button type="button" data-new="event"><b>Событие</b><span>Анонс с датой и регистрацией</span></button>
        </div></div></div>
    <div class="filters">
      <label class="search"><span class="visually-hidden">Поиск</span>${ICONS.search}<input class="input" id="f-q" placeholder="Поиск по названию и описанию" value="${esc(f.q)}"></label>
      <select class="input" id="f-type" aria-label="Тип">${opt('all', 'Все типы', f.type)}${Object.entries(TYPE_NAMES).map(([k, v]) => opt(k, v, f.type)).join('')}</select>
      <select class="input" id="f-dir" aria-label="Направление">${opt('all', 'Все направления', f.dir)}${dirs.map(d => opt(d.id, d.name, f.dir)).join('')}</select>
      <select class="input" id="f-status" aria-label="Статус">${opt('all', 'Все статусы', f.status)}${Object.entries(STATUS_NAMES).map(([k, v]) => opt(k, v, f.status)).join('')}</select>
    </div>
    ${list.length ? `<div class="grid">${cards}</div>` : '<div class="empty">Ничего не найдено</div>'}
  </div>`);
  hydrateImages(root);
  $('#f-q').addEventListener('input', e => { S.filters.q = e.target.value; const pos = e.target.selectionStart; renderList(); const i = $('#f-q'); i.focus(); i.setSelectionRange(pos, pos); });
  for (const k of ['type', 'dir', 'status']) $('#f-' + k).addEventListener('change', e => { S.filters[k] = e.target.value; renderList(); });
  $('[data-act="new"]').addEventListener('click', e => { e.stopPropagation(); $('#new-menu').hidden = !$('#new-menu').hidden; });
  document.addEventListener('click', () => { const m = $('#new-menu'); if (m) m.hidden = true; }, { once: true });
  $$('[data-new]').forEach(b => b.addEventListener('click', () => { location.hash = '#/new/' + b.dataset.new; }));
}

// ---------- новый материал ----------
function newItem(type) {
  const base = { id: uid(), type, status: 'draft', title: '', full_title: '', excerpt: '', category: '', date: today(), date_end: '', date_label: '', cover: null, body: [{ type: type === 'article' ? 'lead' : 'p', html: '' }], show_on: [], gallery: null, created: new Date().toISOString() };
  if (type === 'news') Object.assign(base, { direction: 'forum', source: { kind: 'mda', author: 'Пресс-служба МДА', url: '', label: 'МДА' } });
  if (type === 'event') Object.assign(base, { direction: 'forum', category: 'Анонс', source: { kind: 'none' }, event: { place: 'Московская духовная академия, Сергиев Посад', register_url: '', register_until: '' } });
  if (type === 'article') Object.assign(base, { direction: 'journal', article: { rubric: S.settings.rubrics[0] || '', deck: '', author_name: '', author_byline: '', author_full: '', color: 'blue', letter: '', minutes_label: '' } });
  return base;
}

// ---------- редактор ----------
function openEditor(item, isNew = false) {
  S.draft = clone(item); S.isNew = isNew; S.dirty = isNew;
  renderEditor();
}
function field(label, key, opts = {}) {
  const v = getPath(S.draft, key) ?? '';
  const id = 'f-' + key.replace(/\./g, '-');
  const counter = opts.max ? `<span class="counter" data-count="${key}">${String(v).length}/${opts.max}</span>` : '';
  const ctl = opts.textarea
    ? `<textarea class="input" id="${id}" data-k="${key}" rows="${opts.rows || 3}" placeholder="${esc(opts.ph || '')}">${esc(v)}</textarea>`
    : `<input class="input ${opts.big ? 'input-big' : ''}" id="${id}" data-k="${key}" type="${opts.type || 'text'}" value="${esc(v)}" placeholder="${esc(opts.ph || '')}">`;
  return `<label class="field" for="${id}"><span>${esc(label)}${counter}</span>${ctl}${opts.hint ? `<small>${opts.hint}</small>` : ''}</label>`;
}
function select(label, key, options, opts = {}) {
  const v = getPath(S.draft, key) ?? '';
  return `<label class="field"><span>${esc(label)}</span><select class="input" data-k="${key}" ${opts.rerender ? 'data-rerender' : ''}>${options.map(([val, l]) => `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${opts.hint ? `<small>${opts.hint}</small>` : ''}</label>`;
}

function renderEditor() {
  const d = S.draft, set = S.settings, dir = dirOf(set, d.direction);
  const st = statusOf(d), published = !!S.items.get(d.id)?.live;
  const pageName = pageOf(d);
  const dirOpts = set.directions.filter(x => d.type === 'article' ? x.id === 'journal' : x.id !== 'journal' || d.type === 'news').map(x => [x.id, x.name]);
  const isHome = set.home_event === d.id;

  const main = [];
  // ---- карточка ----
  main.push(`<section class="panel"><div class="panel-head"><div><div class="eyebrow">Основное</div><h2>Карточка публикации</h2></div><span class="note">${TYPE_NAMES[d.type]}</span></div><div class="stack">
    ${field(d.type === 'article' ? 'Заголовок статьи' : 'Название на карточке', 'title', { big: true, max: 90, hint: d.type === 'article' ? '' : 'Короткое, 45–80 знаков: видно в ленте и на главной.' })}
    ${d.type !== 'article' ? field('Полный заголовок публикации', 'full_title', { ph: d.title || 'Если пусто — как название', hint: 'Заголовок на странице новости, например оригинальный заголовок МДА.' }) : ''}
    <label class="field"><span>Адрес страницы</span><div class="prefix"><span>vstrecha.mpda.ru/</span><input data-k="slug" value="${esc(d.slug || '')}" placeholder="${esc(pageName)}" ${published ? 'readonly' : ''}></div>
      <small>${published ? 'После публикации адрес закреплён и не меняется.' : 'Можно оставить пустым — адрес сделается из названия.'}</small></label>
    ${d.type === 'article'
      ? field('Подзаголовок (лид-описание)', 'article.deck', { textarea: true, max: 260, hint: 'Под заголовком статьи и на карточке журнала.' })
      : field('Короткое описание', 'excerpt', { textarea: true, max: 180, hint: 'Одно-два предложения, 100–180 знаков. Видно на карточке.' })}
    ${d.type === 'article' ? `<div class="row">
        ${select('Рубрика', 'article.rubric', set.rubrics.map(r => [r, r]))}
        <label class="field"><span>Цвет оформления</span><div class="swatches">${Object.entries(COLORS).map(([k, c]) => `<button type="button" class="swatch" data-color="${k}" style="background:${c}" aria-pressed="${d.article.color === k}" title="${k}"></button>`).join('')}</div></label>
      </div>
      <div class="row">${field('Автор', 'article.author_name', { ph: 'Имя Фамилия' })}${field('Подпись в строке автора', 'article.author_byline', { ph: 'студент 4 курса бакалавриата МДА' })}</div>
      ${field('Подпись в блоке об авторе (в конце статьи)', 'article.author_full', { ph: 'Студент 4 курса бакалавриата Московской духовной академии' })}
      <div class="row3">${field('Время чтения', 'article.minutes_label', { ph: articleMinutes({ ...d, article: { ...d.article, minutes_label: '' } }), hint: 'Пусто — посчитается само.' })}${field('Буква на карточке', 'article.letter', { ph: articleLetter({ ...d, article: { ...d.article, letter: '' } }) })}${field('Дата публикации', 'date', { type: 'date' })}</div>
      ${datalistAuthors()}`
      : `<div class="row">${select('Направление', 'direction', dirOpts, { rerender: true, hint: 'На странице какого направления появится материал.' })}${field('Подпись темы на карточке', 'category', { ph: dir.card, hint: 'Например: «Фестиваль», «Анонс форума».' })}</div>
      <label class="field"><span>Показывать также на страницах</span><div class="checks">${set.directions.filter(x => x.id !== d.direction && x.id !== 'general').map(x => `<label class="chip"><input type="checkbox" data-showon="${x.id}" ${(d.show_on || []).includes(x.id) ? 'checked' : ''}>${esc(x.name)}</label>`).join('')}</div></label>
      <div class="row3">${field(d.type === 'event' ? 'Дата начала' : 'Дата события', 'date', { type: 'date' })}${field('Дата окончания', 'date_end', { type: 'date', hint: 'Если событие длилось несколько дней.' })}${field('Как писать дату', 'date_label', { ph: dateLabel(d.date, d.date_end), hint: 'Пусто — посчитается само.' })}</div>`}
    ${coverBox()}
  </div></section>`);

  // ---- событие ----
  if (d.type === 'event') {
    const e = d.event || {};
    main.push(`<section class="panel"><div class="panel-head"><div><div class="eyebrow">Событие</div><h2>Место и регистрация</h2></div><span class="note">Регистрация на Timepad</span></div><div class="stack">
      ${field('Место', 'event.place')}
      <div class="row">${field('Ссылка на регистрацию', 'event.register_url', { ph: 'https://….timepad.ru/event/…' })}${field('Регистрация открыта до', 'event.register_until', { type: 'date', hint: 'После этой даты кнопки регистрации сами исчезнут с сайта.' })}</div>
      <div class="row">${field('Заголовок блока регистрации', 'event.cta_title', { ph: 'Регистрация открыта' })}${field('Текст блока регистрации', 'event.cta_text', { ph: [itemDateLabel(d), e.place].filter(Boolean).join(' · ') })}</div>
      ${field('Надпись на карточке без обложки', 'event.card_title', { ph: d.category || 'Анонс' })}
      <label class="chip" style="align-self:flex-start"><input type="checkbox" id="home-toggle" ${isHome ? 'checked' : ''}>Показывать анонсом на главной и в «Событиях»</label>
      <div id="home-fields" ${isHome ? '' : 'hidden'} class="stack">
        <div class="row3">${field('Строка над афишей', 'event.poster_top', { ph: 'Открыта регистрация' })}${field('Надпись на афише', 'event.poster_title', { textarea: true, rows: 2, ph: 'IV ФОРУМ\n«ВСТРЕЧА»' })}${field('Дата на афише', 'event.poster_date', { textarea: true, rows: 2, ph: '24–25\nОКТЯБРЯ 2026' })}</div>
        <div class="row">${field('Заголовок анонса на главной', 'event.home_title', { ph: d.full_title || d.title })}${field('Строка с датой и местом', 'event.home_meta', { ph: [itemDateLabel(d), e.place].filter(Boolean).join(' · ') })}</div>
        ${field('Текст анонса на главной', 'event.home_text', { textarea: true, ph: d.excerpt })}
        <div class="row">${field('Заголовок в «Событиях»', 'event.short_title', { ph: d.title })}${field('Строка в «Событиях»', 'event.short_meta', { ph: [itemDateLabel(d), e.place].filter(Boolean).join(' · ') })}</div>
      </div>
    </div></section>`);
  }

  // ---- тело ----
  main.push(`<section class="panel" id="body-panel"><div class="panel-head"><div><div class="eyebrow">Содержание</div><h2>Текст публикации</h2></div><span class="note" id="block-count">${d.body.length} блоков</span></div>
    <div class="blocks" id="blocks"></div>
    <div class="add-block"><button class="btn" type="button" data-act="add-pop">${ICONS.plus}Добавить блок</button><div class="add-pop" id="add-pop" hidden>${BLOCKS.filter(b => d.type === 'article' || b.type !== 'lead' || true).map(b => `<button type="button" data-add="${b.type}"><b>${b.name}</b><span>${b.note}</span></button>`).join('')}</div></div>
  </section>`);

  // ---- галерея и источник ----
  if (d.type !== 'article') {
    const g = d.gallery || {};
    main.push(`<section class="panel"><div class="panel-head"><div><div class="eyebrow">Дополнительно</div><h2>Фотогалерея Flickr</h2></div><span class="note">Необязательно</span></div><div class="stack">
      <label class="field"><span>Ссылка на альбом Flickr</span><div class="gal-line"><input class="input" id="album-url" value="${esc(g.album_url || '')}" placeholder="https://www.flickr.com/photos/mpda/albums/…"><button class="btn" type="button" data-act="flickr">${g.photos?.length ? 'Обновить' : 'Загрузить'}</button>${g.album_url ? '<button class="btn btn-danger" type="button" data-act="flickr-remove">Убрать</button>' : ''}</div>
        <small>${S.settings.flickr_key ? 'Фото подтянутся из альбома: на сайте будет галерея — 6 снимков и кнопка «Ещё фотографии».' : 'Сначала добавьте ключ Flickr в разделе «Настройки».'}</small></label>
      ${g.album_url ? field('Подпись фотографов', 'gallery.credit', { ph: 'Фото: Имя Фамилия · МДА / Flickr' }) : ''}
      <div id="gal-preview">${g.photos?.length ? `<div class="label">${g.photos.length} фото</div><div class="gal-grid">${g.photos.map(p => `<img src="${esc(p.z)}" alt="" loading="lazy">`).join('')}</div>` : ''}</div>
    </div></section>`);
    const s = d.source || {};
    main.push(`<section class="panel"><div class="panel-head"><div><div class="eyebrow">Дополнительно</div><h2>Источник и автор</h2></div></div><div class="stack">
      ${select('Откуда текст', 'source.kind', [['mda', 'Сайт МДА (с лицензией CC BY-NC-ND)'], ['link', 'Другой источник'], ['none', 'Свой текст']], { rerender: true })}
      ${s.kind !== 'none' ? `<div class="row">${field('Автор текста', 'source.author', { ph: 'Пресс-служба МДА' })}${field('Ссылка на оригинал', 'source.url', { ph: 'https://mpda.ru/news/…' })}</div>
        ${s.kind === 'link' ? field('Подпись ссылки на карточке', 'source.label', { ph: 'Источник' }) : ''}` : field('Автор текста (необязательно)', 'source.author')}
    </div></section>`);
  } else {
    main.push(`<section class="panel"><div class="panel-head"><div><div class="eyebrow">Дополнительно</div><h2>Карточка «Читать дальше»</h2></div><span class="note">Необязательно</span></div>
      ${imageBox('article.card_image', 'Картинка вместо цветной буквы', 'Показывается в блоке «Читать дальше» под другими статьями.')}</section>`);
  }

  const right = sideHTML();
  const changed = published && hasUnpublished({ ...d, live: S.items.get(d.id).live });

  const palette = `<div class="sticky"><section class="panel palette"><div class="eyebrow">Конструктор</div><h2>Блоки</h2><p>Перетащите блок в нужное место или нажмите, чтобы добавить его в конец.</p>
    ${BLOCKS.map(b => `<button type="button" class="pal-item" draggable="true" data-add="${b.type}"><i>${esc(b.icon)}</i><div><b>${b.name}</b><span>${b.note}</span></div></button>`).join('')}</section></div>`;

  const menuItems = [];
  if (st === 'published') menuItems.push(`<button type="button" data-act="hide"><b>Скрыть с сайта</b><span>Страница исчезнет, материал останется здесь</span></button>`);
  if (st === 'hidden') menuItems.push(`<button type="button" data-act="restore"><b>Вернуть на сайт</b><span>Опубликовать последнюю версию снова</span></button>`);
  if (st !== 'published' && !S.isNew) menuItems.push(`<button type="button" class="danger" data-act="delete"><b>Удалить</b><span>Убрать материал из админки навсегда</span></button>`);
  if (published && changed) menuItems.push(`<button type="button" data-act="revert"><b>Отменить правки</b><span>Вернуться к версии, которая на сайте</span></button>`);

  root.innerHTML = shell('list', `<div class="topbar">
      <a class="back" href="#/">← Публикации</a>
      <div class="t"><b id="top-title">${esc(d.title || 'Новая публикация')}</b><span>${TYPE_NAMES[d.type]} · ${STATUS_NAMES[st].toLowerCase()}</span></div>
      <div class="actions">
        <button class="btn" type="button" data-act="preview">${ICONS.eye}Предпросмотр</button>
        <button class="btn btn-primary" type="button" data-act="save">${ICONS.save}Сохранить</button>
        <button class="btn btn-green" type="button" data-act="publish">${ICONS.send}${st === 'published' ? 'Обновить' : 'Опубликовать'}</button>
        ${menuItems.length ? `<div class="menu-wrap"><button class="btn" type="button" data-act="more" aria-label="Ещё">${ICONS.more}</button><div class="menu" id="more-menu" hidden>${menuItems.join('')}</div></div>` : ''}
      </div></div>
    <div class="editor"><div class="col-left">${palette}</div><div class="col-main">${main.join('')}</div><div class="col-right">${right}</div></div>`);
  renderBlocks();
  hydrateImages(root);
  bindEditor();
}
function sideHTML() {
  const d = S.draft, st = statusOf(d), published = !!S.items.get(d.id)?.live, pageName = pageOf(d);
  const errs = validate(d, [...S.items.values()]);
  const changed = published && hasUnpublished({ ...d, live: S.items.get(d.id).live });
  const statusText = st === 'published' ? (changed || S.dirty ? ['Есть изменения', 'Нажмите «Обновить», чтобы изменения ушли на сайт.'] : ['На сайте', 'Опубликованная версия совпадает с этой.'])
    : st === 'hidden' ? ['Скрыт с сайта', 'Материал сохранён здесь, но на сайте его нет.'] : ['Черновик', 'Материал виден только в админке.'];
  return `<div class="sticky">
    <section class="panel status-card"><div class="eyebrow">${STATUS_NAMES[st]}</div><div class="big">${statusText[0]}</div><p>${statusText[1]}</p>
      <dl><div><dt>Блоков</dt><dd>${d.body.length}</dd></div><div><dt>Слов</dt><dd>${bodyWords(d)}</dd></div>${d.type !== 'article' ? `<div><dt>Фото в галерее</dt><dd>${d.gallery?.photos?.length || 0}</dd></div>` : ''}<div><dt>Адрес</dt><dd style="font-weight:500">${esc(pageName)}</dd></div>${d.published_at && published ? `<div><dt>Опубликован</dt><dd>${fmtDate(d.published_at)}</dd></div>` : ''}</dl>
      ${errs.length ? `<div class="errors"><b>Перед публикацией:</b><ul>${errs.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${published && st === 'published' ? `<p style="margin-top:14px"><a href="${SITE_URL}${esc(pageName)}" target="_blank" rel="noopener">Открыть на сайте ↗</a></p>` : ''}
    </section>
    <div class="tip"><b>Когда появится на сайте</b>Сервер МДА забирает обновления раз в сутки, ночью. Опубликованное сегодня будет на vstrecha.mpda.ru завтра утром.</div>
    <div class="tip"><b>Подсказка</b>Выделите текст, чтобы сделать его жирным, курсивом или ссылкой. Блоки перетаскиваются за точки слева.</div>
  </div>`;

}
let sideTimer = null;
function refreshSide() {
  clearTimeout(sideTimer);
  sideTimer = setTimeout(() => {
    const c = $('.col-right'); if (!c || !S.draft) return;
    c.innerHTML = sideHTML();
    const sl = $('[data-k="slug"]'); if (sl && !sl.readOnly) sl.placeholder = pageOf({ ...S.draft, slug: '' });
    const dl = $('[data-k="date_label"]'); if (dl) dl.placeholder = dateLabel(S.draft.date, S.draft.date_end);
  }, 350);
}
function datalistAuthors() {
  return `<datalist id="authors">${(S.settings.authors || []).map(a => `<option value="${esc(a.name)}">`).join('')}</datalist>`;
}
function coverBox() {
  if (S.draft.type === 'article') return '';
  return `<div class="field"><span class="label">Обложка</span>${imageBox('cover.src', 'Обложка 16:10', 'Для новой фотографии — от 960 × 600 пикселей. Можно загрузить файл или вставить ссылку.', true)}
    ${S.draft.cover?.src ? `<div class="row" style="margin-top:12px">${select('Положение кадра', 'cover.position', [['center', 'По центру'], ['top', 'Верх'], ['bottom', 'Низ'], ['left', 'Слева'], ['right', 'Справа']])}${field('Описание фото (для незрячих)', 'cover.alt', { ph: S.draft.title })}</div>` : ''}</div>`;
}
function imageBox(key, title, hint, isCover) {
  const src = getPath(S.draft, key);
  return `<div class="cover-box" data-imgbox="${key}">
    <div class="thumb" ${src ? `data-img="${esc(src)}"` : ''}></div>
    <div class="info"><b>${src ? esc(src.split('/').pop()) : title}</b>${src ? esc(/^https?:/.test(src) ? src : 'Загружено в админку') : esc(hint)}</div>
    <div class="btns"><label class="btn btn-small">${src ? 'Заменить' : 'Загрузить'}<input type="file" accept="image/*" hidden data-upload="${key}"></label>
      <button type="button" class="btn btn-small" data-url="${key}">Ссылка</button>${src ? `<button type="button" class="btn btn-small btn-danger" data-clear="${key}">Убрать</button>` : ''}</div>
  </div>`;
}

// ---- блоки ----
function blockHTML(b, i) {
  const kind = BLOCKS.find(x => x.type === b.type)?.name || b.type;
  const tools = `<div class="block-tools"><span class="kind">${esc(kind)}${b.type === 'h' ? ' H' + (b.level || 2) : ''}</span>${b.type === 'h' ? '<button type="button" data-bact="level">H2/H3</button>' : ''}${b.type === 'list' ? `<button type="button" data-bact="ordered">${b.ordered ? 'Маркеры' : 'Нумерация'}</button>` : ''}<button type="button" data-bact="up" title="Выше">↑</button><button type="button" data-bact="down" title="Ниже">↓</button><button type="button" data-bact="dup" title="Копия">⧉</button><button type="button" data-bact="del" title="Удалить">✕</button></div>`;
  let body = '';
  const art = S.draft.type === 'article';
  switch (b.type) {
    case 'lead': body = `<div class="rt lead" contenteditable="true" data-ph="Вводный абзац…" data-field="html">${b.html || ''}</div>`; break;
    case 'p': body = `<div class="rt" contenteditable="true" data-ph="Текст абзаца…" data-field="html">${b.html || ''}</div>`; break;
    case 'h': body = `<div class="rt h${b.level === 3 ? 3 : 2}" contenteditable="true" data-ph="Подзаголовок" data-field="html">${b.html || ''}</div>`; break;
    case 'quote': body = `<div class="rt quote" contenteditable="true" data-ph="Текст цитаты…" data-field="html">${b.html || ''}</div>${art ? '' : `<div class="sub"><input class="input" data-bfield="cite" value="${esc(b.cite || '')}" placeholder="Кто сказал (необязательно)"></div>`}`; break;
    case 'list': { const t = b.ordered ? 'ol' : 'ul'; body = `<${t} class="rt" contenteditable="true" data-list>${(b.items?.length ? b.items : ['']).map(x => `<li>${x}</li>`).join('')}</${t}>`; break; }
    case 'image': body = `<div class="cover-box"><div class="thumb" ${b.src ? `data-img="${esc(b.src)}"` : ''}></div><div class="info" style="flex:1"><input class="input" data-bfield="caption" value="${esc(b.caption || '')}" placeholder="Подпись к фото"><input class="input" style="margin-top:6px" data-bfield="alt" value="${esc(b.alt || '')}" placeholder="Описание для незрячих"></div><div class="btns"><label class="btn btn-small">${b.src ? 'Заменить' : 'Загрузить'}<input type="file" accept="image/*" hidden data-bupload></label><button type="button" class="btn btn-small" data-burl>Ссылка</button></div></div>`; break;
    case 'info': body = `<div>${(b.rows?.length ? b.rows : [{ k: '', v: '' }]).map((r, k) => `<div class="info-row"><input class="input" data-row="${k}" data-rk="k" value="${esc(r.k)}" placeholder="Поле"><input class="input" data-row="${k}" data-rk="v" value="${esc(plainOf(r.v))}" placeholder="Значение"><button type="button" class="btn btn-small" data-rowdel="${k}">✕</button></div>`).join('')}<button type="button" class="link-btn" data-rowadd>+ строка</button></div>`; break;
    case 'html': body = `<div class="block-html"><textarea class="input" data-bfield="html" spellcheck="false">${esc(b.html || '')}</textarea><small class="hint">Особый блок: код вставляется на страницу как есть. Меняйте осторожно.</small></div>`; break;
  }
  return `<div class="block" data-i="${i}" data-type="${b.type}"><span class="block-handle" draggable="true" title="Перетащить">${ICONS.grip}</span>${tools}${body}</div>`;
}
function plainOf(html) { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent; }
function renderBlocks() {
  const box = $('#blocks'); if (!box) return;
  box.innerHTML = S.draft.body.map(blockHTML).join('') || '<div class="empty">Добавьте первый блок</div>';
  $('#block-count').textContent = S.draft.body.length + ' блоков';
  hydrateImages(box);
}
function newBlock(type) {
  if (type === 'list') return { type, ordered: false, items: [''] };
  if (type === 'h') return { type, level: 2, html: '' };
  if (type === 'image') return { type, src: '', caption: '', alt: '' };
  if (type === 'info') return { type, rows: [{ k: '', v: '' }] };
  return { type, html: '' };
}
function insertBlock(type, at) {
  const b = newBlock(type);
  if (at == null || at > S.draft.body.length) at = S.draft.body.length;
  S.draft.body.splice(at, 0, b); markDirty(); renderBlocks();
  const el = $(`.block[data-i="${at}"] [contenteditable], .block[data-i="${at}"] input, .block[data-i="${at}"] textarea`);
  el?.focus(); el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function markDirty() {
  S.dirty = true; refreshSide();
  const t = $('#top-title'); if (t) t.textContent = S.draft.title || 'Новая публикация';
}

// ---- загрузка картинок ----
async function compressImage(file) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const max = 1920; const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), url: URL.createObjectURL(blob), w: c.width, h: c.height };
}
async function uploadImage(file) {
  const { bytes, url } = await compressImage(file);
  const name = slugify(file.name.replace(/\.[^.]+$/, '')) + '-' + Date.now().toString(36) + '.jpg';
  const src = `uploads/${today().slice(0, 4)}/${name}`;
  await busy('Загружаю фото…', () => saveCms({ [CMS_DIR + src]: bytes }, 'Админка: фото ' + name));
  S.blobUrls.set(src, url);
  return src;
}

// ---- Flickr ----
async function loadFlickr(url) {
  const m = url.match(/flickr\.com\/photos\/([^/]+)\/(?:albums|sets)\/(\d+)/);
  if (!m) throw new Error('Не похоже на ссылку на альбом Flickr. Нужна ссылка вида flickr.com/photos/…/albums/…');
  const key = S.settings.flickr_key; if (!key) throw new Error('Добавьте ключ Flickr в разделе «Настройки»');
  const fetcher = window.__FLICKR_FETCH__ || (u => fetch(u).then(r => r.json()));
  const photos = []; let page = 1, pages = 1;
  do {
    const u = `https://api.flickr.com/services/rest/?method=flickr.photosets.getPhotos&api_key=${encodeURIComponent(key)}&photoset_id=${m[2]}&extras=url_z,url_b,url_c&per_page=500&page=${page}&format=json&nojsoncallback=1`;
    const r = await fetcher(u);
    if (r.stat !== 'ok') throw new Error('Flickr: ' + (r.message || 'ошибка'));
    pages = r.photoset.pages;
    for (const p of r.photoset.photo) {
      const z = p.url_z || p.url_c || p.url_b; if (!z) continue;
      photos.push({ b: p.url_b || p.url_c || z, z, page: `https://www.flickr.com/photos/${m[1]}/${p.id}/`, w: +(p.width_z || p.width_c || 640), h: +(p.height_z || p.height_c || 427) });
    }
    page++;
  } while (page <= pages);
  if (!photos.length) throw new Error('В альбоме не нашлось фотографий');
  return { album_url: `https://www.flickr.com/photos/${m[1]}/albums/${m[2]}`, photos };
}

// ---- обработчики редактора ----
function bindEditor() {
  const ed = $('.main');
  ed.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.k) {
      let v = t.value;
      if (t.dataset.k === 'slug') { v = v.trim(); if (v && !v.endsWith('.html')) v = v; }
      setPath(S.draft, t.dataset.k, v); markDirty();
      const c = $(`[data-count="${t.dataset.k}"]`); if (c) c.textContent = v.length + c.textContent.replace(/^\d+/, '');
      return;
    }
    const blockEl = t.closest('.block'); if (!blockEl) return;
    const b = S.draft.body[+blockEl.dataset.i];
    if (t.dataset.field) b[t.dataset.field] = cleanInline(t.innerHTML);
    else if (t.matches('[data-list]')) b.items = $$('li', t).map(li => cleanInline(li.innerHTML));
    else if (t.dataset.bfield) b[t.dataset.bfield] = t.value;
    else if (t.dataset.row != null) { b.rows = b.rows || []; b.rows[+t.dataset.row] = b.rows[+t.dataset.row] || { k: '', v: '' }; b.rows[+t.dataset.row][t.dataset.rk] = t.dataset.rk === 'v' ? esc(t.value) : t.value; }
    markDirty();
  });
  ed.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.k && t.tagName === 'SELECT') { setPath(S.draft, t.dataset.k, t.value); markDirty(); if (t.hasAttribute('data-rerender')) renderEditor(); return; }
    if (t.dataset.showon) { const s = new Set(S.draft.show_on || []); t.checked ? s.add(t.dataset.showon) : s.delete(t.dataset.showon); S.draft.show_on = [...s]; markDirty(); return; }
    if (t.id === 'home-toggle') { S.draft._home = t.checked; $('#home-fields').hidden = !t.checked; markDirty(); return; }
    if (t.dataset.k === 'article.author_name') {
      const a = (S.settings.authors || []).find(x => x.name === t.value.trim());
      if (a && !S.draft.article.author_byline) { S.draft.article.author_byline = a.byline || ''; S.draft.article.author_full = a.full || ''; renderEditor(); }
    }
  });
  const authorInput = $('[data-k="article.author_name"]'); if (authorInput) authorInput.setAttribute('list', 'authors');
  ed.addEventListener('paste', e => {
    const t = e.target.closest('[contenteditable]'); if (!t) return;
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  });
  ed.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(); }
    const t = e.target;
    if (e.key === 'Enter' && !e.shiftKey && t.matches('.rt[data-field]') && !t.closest('[data-type="html"]')) {
      // Enter в конце абзаца — новый абзац
      const sel = getSelection(); const atEnd = sel.rangeCount && (() => { const r = sel.getRangeAt(0).cloneRange(); r.selectNodeContents(t); r.setStart(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset); return !r.toString().length; })();
      if (atEnd) { e.preventDefault(); insertBlock(t.closest('[data-type="lead"]') ? 'p' : 'p', +t.closest('.block').dataset.i + 1); }
    }
    if (e.key === 'Backspace' && t.matches('.rt[data-field]') && !t.textContent && S.draft.body.length > 1) {
      e.preventDefault(); const i = +t.closest('.block').dataset.i; S.draft.body.splice(i, 1); markDirty(); renderBlocks();
      const prev = $(`.block[data-i="${Math.max(0, i - 1)}"] [contenteditable]`); if (prev) { prev.focus(); const r = document.createRange(); r.selectNodeContents(prev); r.collapse(false); getSelection().removeAllRanges(); getSelection().addRange(r); }
    }
  });
  ed.addEventListener('click', async e => {
    const t = e.target;
    const act = t.closest('[data-act]')?.dataset.act;
    if (act === 'add-pop') { e.stopPropagation(); $('#add-pop').hidden = !$('#add-pop').hidden; return; }
    if (act === 'more') { e.stopPropagation(); $('#more-menu').hidden = !$('#more-menu').hidden; return; }
    if (act === 'save') return doSave();
    if (act === 'publish') return doPublish();
    if (act === 'preview') return doPreview();
    if (act === 'hide') return doHide();
    if (act === 'restore') return doRestore();
    if (act === 'delete') return doDelete();
    if (act === 'revert') { if (confirm('Вернуть версию, которая сейчас на сайте? Несохранённые правки пропадут.')) { const it = S.items.get(S.draft.id); openEditor({ ...clone(it.live), status: it.status, live: it.live, slug: it.slug }); } return; }
    if (act === 'flickr') {
      try {
        const res = await busy('Загружаю альбом Flickr…', () => loadFlickr($('#album-url').value.trim()));
        S.draft.gallery = { credit: S.draft.gallery?.credit || '', ...res }; markDirty(); renderEditor(); toast(`Загружено фото: ${res.photos.length}`, 'ok');
      } catch (err) { toast(err.message, 'err'); }
      return;
    }
    if (act === 'flickr-remove') { if (confirm('Убрать галерею из публикации?')) { S.draft.gallery = null; markDirty(); renderEditor(); } return; }
    const add = t.closest('[data-add]');
    if (add) { $('#add-pop') && ($('#add-pop').hidden = true); insertBlock(add.dataset.add); return; }
    const col = t.closest('[data-color]');
    if (col) { S.draft.article.color = col.dataset.color; markDirty(); $$('[data-color]').forEach(x => x.setAttribute('aria-pressed', String(x === col))); return; }
    if (t.closest('[data-url]')) { const k = t.closest('[data-url]').dataset.url; const u = prompt('Ссылка на изображение (https://…)', getPath(S.draft, k) || ''); if (u != null) { if (k === 'cover.src' && !S.draft.cover) S.draft.cover = { position: 'center' }; setPath(S.draft, k, u.trim() || null); markDirty(); renderEditor(); } return; }
    if (t.closest('[data-clear]')) { const k = t.closest('[data-clear]').dataset.clear; if (k === 'cover.src') S.draft.cover = null; else setPath(S.draft, k, null); markDirty(); renderEditor(); return; }
    const bact = t.closest('[data-bact]')?.dataset.bact;
    const blockEl = t.closest('.block');
    if (bact && blockEl) {
      const i = +blockEl.dataset.i, body = S.draft.body;
      if (bact === 'del') { if (plainText(body[i]) && !confirm('Удалить блок?')) return; body.splice(i, 1); }
      if (bact === 'up' && i > 0) [body[i - 1], body[i]] = [body[i], body[i - 1]];
      if (bact === 'down' && i < body.length - 1) [body[i + 1], body[i]] = [body[i], body[i + 1]];
      if (bact === 'dup') body.splice(i + 1, 0, clone(body[i]));
      if (bact === 'level') body[i].level = body[i].level === 3 ? 2 : 3;
      if (bact === 'ordered') body[i].ordered = !body[i].ordered;
      markDirty(); renderBlocks(); return;
    }
    if (t.closest('[data-burl]') && blockEl) { const b = S.draft.body[+blockEl.dataset.i]; const u = prompt('Ссылка на изображение (https://…)', b.src || ''); if (u != null) { b.src = u.trim(); markDirty(); renderBlocks(); } return; }
    if (t.closest('[data-rowadd]') && blockEl) { const b = S.draft.body[+blockEl.dataset.i]; b.rows = [...(b.rows || []), { k: '', v: '' }]; markDirty(); renderBlocks(); return; }
    if (t.closest('[data-rowdel]') && blockEl) { const b = S.draft.body[+blockEl.dataset.i]; b.rows.splice(+t.closest('[data-rowdel]').dataset.rowdel, 1); markDirty(); renderBlocks(); return; }
    if (!t.closest('.menu-wrap')) { const m = $('#more-menu'); if (m) m.hidden = true; }
    if (!t.closest('.add-block')) { const p = $('#add-pop'); if (p) p.hidden = true; }
  });
  ed.addEventListener('change', async e => {
    const t = e.target;
    if (t.dataset.upload && t.files[0]) {
      try { const src = await uploadImage(t.files[0]); if (t.dataset.upload === 'cover.src' && !S.draft.cover) S.draft.cover = { position: 'center' }; setPath(S.draft, t.dataset.upload, src); markDirty(); renderEditor(); } catch (err) { toast(err.message, 'err'); }
    }
    if (t.hasAttribute('data-bupload') && t.files[0]) {
      const i = +t.closest('.block').dataset.i;
      try { const src = await uploadImage(t.files[0]); S.draft.body[i].src = src; markDirty(); renderBlocks(); } catch (err) { toast(err.message, 'err'); }
    }
  });
  // перетаскивание блоков
  let dragFrom = null;
  ed.addEventListener('dragstart', e => {
    const h = e.target.closest?.('.block-handle'); const pal = e.target.closest?.('.pal-item');
    if (h) { dragFrom = { move: +h.closest('.block').dataset.i }; h.closest('.block').classList.add('dragging'); e.dataTransfer.setDragImage(h.closest('.block'), 20, 20); }
    else if (pal) dragFrom = { add: pal.dataset.add };
    else return;
    e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'block');
  });
  const clearMarks = () => $$('.drop-before,.drop-after,.dragging').forEach(x => x.classList.remove('drop-before', 'drop-after', 'dragging'));
  ed.addEventListener('dragover', e => {
    if (!dragFrom) return;
    const b = e.target.closest('.block'); const box = e.target.closest('#blocks');
    if (!box) return;
    e.preventDefault();
    $$('.drop-before,.drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after'));
    if (b) { const r = b.getBoundingClientRect(); b.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after'); }
  });
  ed.addEventListener('drop', e => {
    if (!dragFrom) return;
    const b = e.target.closest('.block'); const box = e.target.closest('#blocks'); if (!box) return;
    e.preventDefault();
    let at = S.draft.body.length;
    if (b) { const r = b.getBoundingClientRect(); at = +b.dataset.i + (e.clientY < r.top + r.height / 2 ? 0 : 1); }
    if (dragFrom.add) insertBlock(dragFrom.add, at);
    else { const [x] = S.draft.body.splice(dragFrom.move, 1); if (dragFrom.move < at) at--; S.draft.body.splice(at, 0, x); markDirty(); renderBlocks(); }
    dragFrom = null; clearMarks();
  });
  ed.addEventListener('dragend', () => { dragFrom = null; clearMarks(); });
}
function plainText(b) { return plainOf(b.html || (b.items || []).join(' ') || b.src || ''); }

// панель форматирования
const fmt = document.createElement('div'); fmt.className = 'fmt'; fmt.hidden = true;
fmt.innerHTML = '<button type="button" data-f="bold" title="Жирный"><b>Ж</b></button><button type="button" data-f="italic" title="Курсив"><i>К</i></button><button type="button" data-f="link" title="Ссылка">Ссылка</button><button type="button" data-f="unlink" title="Убрать ссылку">⨯ссылка</button><button type="button" data-f="clear" title="Очистить">Очистить</button>';
document.body.append(fmt);
fmt.addEventListener('mousedown', e => e.preventDefault());
fmt.addEventListener('click', e => {
  const f = e.target.closest('[data-f]')?.dataset.f; if (!f) return;
  if (f === 'link') { const u = prompt('Адрес ссылки', 'https://'); if (u) document.execCommand('createLink', false, u.trim()); }
  else if (f === 'clear') document.execCommand('removeFormat');
  else document.execCommand(f);
  const el = getSelection().anchorNode?.parentElement?.closest('[contenteditable]');
  el?.dispatchEvent(new Event('input', { bubbles: true }));
});
document.addEventListener('selectionchange', () => {
  const sel = getSelection();
  const el = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)?.closest('.rt');
  if (!el || sel.isCollapsed) { fmt.hidden = true; return; }
  const r = sel.getRangeAt(0).getBoundingClientRect();
  fmt.hidden = false; fmt.style.left = Math.max(8, r.left + r.width / 2 - fmt.offsetWidth / 2) + 'px'; fmt.style.top = Math.max(8, r.top - 44) + 'px';
});

// ---- действия ----
function prepareDraft() {
  const d = S.draft;
  d.title = (d.title || '').trim();
  d.body = d.body.filter(b => b.type === 'html' || b.type === 'image' ? (b.html || b.src) : b.type === 'list' ? (b.items || []).some(x => plainOf(x).trim()) : b.type === 'info' ? (b.rows || []).some(r => r.k || r.v) : plainOf(b.html).trim());
  if (d.type === 'list') { }
  for (const b of d.body) if (b.type === 'list') b.items = b.items.filter(x => plainOf(x).trim());
  if (d.type === 'article') d.excerpt = d.article.deck || d.excerpt;
  if (d.slug) { d.slug = d.slug.replace(/[^a-z0-9.-]/gi, '-').toLowerCase(); if (!d.slug.endsWith('.html')) d.slug += '.html'; }
  d.updated = new Date().toISOString();
}
function applyHomeChoice() {
  const d = S.draft; if (d._home === undefined) return false;
  const want = d._home; delete d._home;
  const cur = S.settings.home_event === d.id;
  if (want === cur) return false;
  S.settings.home_event = want ? d.id : null; return true;
}
function rememberAuthor() {
  const a = S.draft.article; if (!a?.author_name) return false;
  const list = S.settings.authors = S.settings.authors || [];
  if (list.some(x => x.name === a.author_name)) return false;
  list.push({ name: a.author_name, byline: a.author_byline || '', full: a.author_full || '' }); return true;
}
async function doSave() {
  prepareDraft();
  const d = S.draft; const prev = S.items.get(d.id);
  const item = { ...d, live: prev?.live, status: prev?.status || 'draft', slug: prev?.live ? prev.slug : d.slug };
  delete item._home;
  const homeChanged = applyHomeChoice() && prev?.status === 'published';
  const changes = { [itemPath(d.id)]: itemJSON(item) };
  if (rememberAuthor() || homeChanged || S.draft._settings) changes[CMS_DIR + 'settings.json'] = JSON.stringify(S.settings, null, 2) + '\n';
  try {
    await busy('Сохраняю…', async () => { await saveCms(changes, 'Админка: сохранить «' + (d.title || 'без названия') + '»'); if (homeChanged) await rebuildSite('Админка: анонс на главной'); });
    S.items.set(d.id, item); S.dirty = false; S.isNew = false;
    setHash('#/edit/' + encodeURIComponent(d.id));
    toast(item.live ? 'Сохранено. На сайте пока прежняя версия — нажмите «Обновить», чтобы опубликовать правки.' : 'Черновик сохранён', 'ok');
    openEditor(item);
  } catch (err) { toast(err.message, 'err'); }
}
async function doPublish() {
  prepareDraft();
  const d = S.draft;
  const errs = validate(d, [...S.items.values()]);
  if (errs.length) { toast('Не получилось опубликовать: ' + errs.join('; '), 'err'); renderEditor(); return; }
  const prev = S.items.get(d.id);
  const wasPublished = !!prev?.live && prev.status === 'published';
  if (!confirm(wasPublished ? 'Обновить материал на сайте?' : 'Опубликовать материал на сайте? Он появится на vstrecha.mpda.ru после ночного обновления.')) return;
  const before = prev ? clone(prev) : null;
  const beforeSettings = clone(S.settings);
  const item = { ...d, status: 'published', slug: prev?.live ? prev.slug : pageOf(d), published_at: prev?.published_at || new Date().toISOString() };
  delete item._home;
  if (d.type === 'event' && d._home === undefined && !S.settings.home_event && !wasPublished && item.event?.register_url) d._home = true;
  applyHomeChoice(); rememberAuthor();
  item.live = snapshot(item);
  S.items.set(d.id, item);
  try {
    const n = await busy('Публикую на сайт…', async () => {
      const n = await rebuildSite((wasPublished ? 'Админка: обновить «' : 'Админка: опубликовать «') + item.title + '»');
      await saveCms({ [itemPath(d.id)]: itemJSON(item), [CMS_DIR + 'settings.json']: JSON.stringify(S.settings, null, 2) + '\n' }, 'Админка: опубликован «' + item.title + '»');
      return n;
    });
    S.dirty = false; S.isNew = false;
    setHash('#/edit/' + encodeURIComponent(d.id));
    toast(`Готово: обновлено файлов сайта — ${n}. На vstrecha.mpda.ru появится после ночного обновления.`, 'ok');
    openEditor(item);
  } catch (err) {
    if (before) S.items.set(d.id, before); else S.items.delete(d.id);
    S.settings = beforeSettings;
    toast(err.message, 'err');
  }
}
async function setStatusAndRebuild(status, label) {
  const prev = S.items.get(S.draft.id); if (!prev) return;
  const before = clone(prev);
  const item = { ...prev, status, updated: new Date().toISOString() };
  const homeOff = status !== 'published' && S.settings.home_event === item.id;
  if (homeOff) S.settings.home_event = null;
  S.items.set(item.id, item);
  try {
    await busy(label + '…', async () => {
      await rebuildSite('Админка: ' + label.toLowerCase() + ' «' + item.title + '»');
      const ch = { [itemPath(item.id)]: itemJSON(item) }; if (homeOff) ch[CMS_DIR + 'settings.json'] = JSON.stringify(S.settings, null, 2) + '\n';
      await saveCms(ch, 'Админка: ' + label.toLowerCase() + ' «' + item.title + '»');
    });
    toast(status === 'hidden' ? 'Материал скрыт. С сайта он пропадёт после ночного обновления.' : 'Материал снова опубликован', 'ok');
    openEditor(item);
  } catch (err) { S.items.set(item.id, before); if (homeOff) S.settings.home_event = item.id; toast(err.message, 'err'); }
}
async function doHide() { if (confirm('Скрыть материал с сайта? Страница исчезнет, а материал останется в админке.')) await setStatusAndRebuild('hidden', 'Скрываю'); }
async function doRestore() { await setStatusAndRebuild('published', 'Возвращаю на сайт'); }
async function doDelete() {
  if (!confirm('Удалить материал из админки навсегда?')) return;
  const id = S.draft.id;
  try { await busy('Удаляю…', () => saveCms({ [itemPath(id)]: null }, 'Админка: удалить материал')); S.items.delete(id); S.dirty = false; location.hash = '#/'; toast('Удалено', 'ok'); }
  catch (err) { toast(err.message, 'err'); }
}
async function doPreview() {
  const win = window.open('', '_blank');
  try {
    prepareDraft();
    const templates = await loadTemplates();
    const all = siteItems([...S.items.values()]).filter(i => i.id !== S.draft.id);
    const me = { ...clone(S.draft), status: 'published' };
    const ctx = { settings: S.settings, templates, items: [...all, me] };
    let html = me.type === 'article' ? renderArticlePage(me, ctx) : renderNewsPage(me, ctx);
    for (const src of usedUploads([me])) html = html.split(src).join(await imageUrl(src));
    html = html.replace('<head>', `<head><base href="${SITE_URL}">`).replace('<body', '<body data-preview');
    html = html.replace('</body>', '<div style="position:fixed;left:16px;bottom:16px;background:#5B57F0;color:#fff;padding:10px 16px;border-radius:10px;font:600 14px system-ui;z-index:999">Предпросмотр — так страница будет выглядеть на сайте</div></body>');
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    if (win) win.location = url; else location.href = url;
  } catch (err) { win?.close(); toast(err.message, 'err'); }
}

// ---------- главная ----------
function renderHome() {
  const set = S.settings;
  const events = [...S.items.values()].filter(i => i.type === 'event' && i.status === 'published');
  const arts = [...S.items.values()].filter(i => i.type === 'article' && i.status === 'published');
  root.innerHTML = shell('home', `<div class="page" style="max-width:900px">
    <div class="page-head"><div><div class="eyebrow">Контент сайта</div><h1>Главная страница</h1><p>Что показывать крупно на главной, в «Событиях» и в журнале.</p></div></div>
    <section class="panel"><div class="panel-head"><div><div class="eyebrow">Анонс</div><h2>Ближайшее событие</h2></div></div><div class="stack">
      <label class="field"><span>Событие в анонсе на главной и в «Событиях»</span><select class="input" id="h-event"><option value="">Не показывать анонс</option>${events.map(e => `<option value="${esc(e.id)}" ${set.home_event === e.id ? 'selected' : ''}>${esc(e.title)} — ${esc(itemDateLabel(e))}</option>`).join('')}</select>
      <small>Тексты анонса (надпись на афише, заголовок, кнопки) правятся в самом событии. Когда событие прошло, выберите следующее или «Не показывать».</small></label>
    </div></section>
    <section class="panel"><div class="panel-head"><div><div class="eyebrow">Журнал</div><h2>Главная статья журнала</h2></div></div><div class="stack">
      <label class="field"><span>Статья крупно вверху страницы журнала</span><select class="input" id="h-art">${arts.map(a => `<option value="${esc(a.id)}" ${set.journal_hero === a.id ? 'selected' : ''}>${esc(a.title)}</option>`).join('')}</select></label>
      <label class="field"><span>Текст под заголовком (необязательно)</span><textarea class="input" id="h-art-text" placeholder="Если пусто — подзаголовок статьи">${esc(set.journal_hero_text || '')}</textarea></label>
    </div></section>
    <div style="margin-top:24px"><button class="btn btn-green" id="h-save">${ICONS.send}Сохранить и обновить сайт</button></div>
  </div>`);
  $('#h-art').addEventListener('change', () => { $('#h-art-text').value = ''; });
  $('#h-save').addEventListener('click', async () => {
    const before = clone(S.settings);
    S.settings.home_event = $('#h-event').value || null;
    S.settings.journal_hero = $('#h-art').value || null;
    S.settings.journal_hero_text = $('#h-art-text').value.trim();
    try {
      await busy('Обновляю сайт…', async () => { await rebuildSite('Админка: главная страница'); await saveCms({ [CMS_DIR + 'settings.json']: JSON.stringify(S.settings, null, 2) + '\n' }, 'Админка: настройки главной'); });
      toast('Сохранено. На сайте — после ночного обновления.', 'ok');
    } catch (err) { S.settings = before; toast(err.message, 'err'); }
  });
}

// ---------- справочники ----------
function renderDicts() {
  const set = S.settings;
  root.innerHTML = shell('dicts', `<div class="page" style="max-width:1000px">
    <div class="page-head"><div><div class="eyebrow">Контент сайта</div><h1>Справочники</h1><p>Направления, рубрики журнала и авторы.</p></div></div>
    <section class="panel"><div class="panel-head"><div><div class="eyebrow">Направления</div><h2>Разделы сайта</h2></div><span class="note">Страница направления задаётся при создании</span></div>
      <table class="list-table"><thead><tr><th>Название</th><th>Подпись на карточке</th><th>Страница</th></tr></thead><tbody>
      ${set.directions.map((d, i) => `<tr><td><input class="input" data-dir="${i}" data-dk="name" value="${esc(d.name)}"></td><td><input class="input" data-dir="${i}" data-dk="card" value="${esc(d.card)}"></td><td><a href="${SITE_URL}${d.page === 'index.html' ? '' : d.page}" target="_blank" rel="noopener">${esc(d.page)}</a></td></tr>`).join('')}
      </tbody></table></section>
    <section class="panel"><div class="panel-head"><div><div class="eyebrow">Журнал</div><h2>Рубрики</h2></div></div>
      <div id="rubrics" class="stack">${set.rubrics.map((r, i) => `<div class="gal-line"><input class="input" data-rub="${i}" value="${esc(r)}"><button class="btn btn-small btn-danger" type="button" data-rubdel="${i}">Убрать</button></div>`).join('')}</div>
      <button class="link-btn" type="button" id="rub-add" style="margin-top:12px">+ рубрика</button></section>
    <section class="panel"><div class="panel-head"><div><div class="eyebrow">Журнал</div><h2>Авторы</h2></div><span class="note">Подставляются в статью по имени</span></div>
      <table class="list-table"><thead><tr><th>Имя</th><th>Подпись в строке автора</th><th>Подпись в конце статьи</th><th></th></tr></thead><tbody>
      ${(set.authors || []).map((a, i) => `<tr><td><input class="input" data-au="${i}" data-ak="name" value="${esc(a.name)}"></td><td><input class="input" data-au="${i}" data-ak="byline" value="${esc(a.byline || '')}"></td><td><input class="input" data-au="${i}" data-ak="full" value="${esc(a.full || '')}"></td><td><button class="btn btn-small btn-danger" type="button" data-audel="${i}">✕</button></td></tr>`).join('')}
      </tbody></table><button class="link-btn" type="button" id="au-add" style="margin-top:12px">+ автор</button></section>
    <div style="margin-top:24px"><button class="btn btn-green" id="d-save">${ICONS.send}Сохранить и обновить сайт</button></div>
  </div>`);
  const work = clone(set);
  $('.main').addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.dir) work.directions[+t.dataset.dir][t.dataset.dk] = t.value;
    if (t.dataset.rub) work.rubrics[+t.dataset.rub] = t.value;
    if (t.dataset.au) work.authors[+t.dataset.au][t.dataset.ak] = t.value;
  });
  $('.main').addEventListener('click', e => {
    const t = e.target;
    const keep = () => { S.settingsWork = work; };
    if (t.id === 'rub-add') { work.rubrics.push('Новая рубрика'); renderDictsWith(work); }
    if (t.dataset.rubdel) { work.rubrics.splice(+t.dataset.rubdel, 1); renderDictsWith(work); }
    if (t.id === 'au-add') { (work.authors = work.authors || []).push({ name: '', byline: '', full: '' }); renderDictsWith(work); }
    if (t.dataset.audel) { work.authors.splice(+t.dataset.audel, 1); renderDictsWith(work); }
    keep();
  });
  $('#d-save').addEventListener('click', async () => {
    const before = S.settings;
    work.rubrics = work.rubrics.map(x => x.trim()).filter(Boolean);
    work.authors = (work.authors || []).filter(a => a.name.trim());
    S.settings = work;
    try {
      await busy('Сохраняю…', async () => { await saveCms({ [CMS_DIR + 'settings.json']: JSON.stringify(S.settings, null, 2) + '\n' }, 'Админка: справочники'); await rebuildSite('Админка: справочники'); });
      toast('Справочники сохранены', 'ok'); renderDicts();
    } catch (err) { S.settings = before; toast(err.message, 'err'); }
  });
}
function renderDictsWith(work) { const real = S.settings; S.settings = work; renderDicts(); S.settings = real; }

// ---------- настройки ----------
function renderSettings() {
  root.innerHTML = shell('settings', `<div class="page" style="max-width:820px">
    <div class="page-head"><div><div class="eyebrow">Настройки</div><h1>Настройки</h1></div></div>
    <section class="panel"><div class="panel-head"><div><div class="eyebrow">Flickr</div><h2>Ключ Flickr</h2></div></div><div class="stack">
      <label class="field"><span>Ключ API Flickr</span><input class="input" id="s-flickr" value="${esc(S.settings.flickr_key || '')}" placeholder="32 символа">
      <small>Нужен, чтобы подтягивать фотографии из альбомов. Получить бесплатно: войдите на flickr.com → <a href="https://www.flickr.com/services/apps/create/noncommercial/" target="_blank" rel="noopener">создать ключ (некоммерческий)</a> → скопируйте поле «Key».</small></label>
      <div><button class="btn btn-primary" id="s-save">${ICONS.save}Сохранить</button></div>
    </div></section>
    <section class="panel"><div class="panel-head"><div><div class="eyebrow">Как это устроено</div><h2>Хранение и публикация</h2></div></div>
      <div class="stack" style="color:var(--muted);font-size:14.5px">
        <p>Материалы и черновики хранятся в закрытом репозитории <b>${esc(CMS_REPO)}</b> (папка cms). На сайт попадает только опубликованное — в репозиторий <b>${esc(SITE_REPO)}</b>.</p>
        <p>Сервер МДА забирает сайт из GitHub раз в сутки, ночью. Каждое действие сохраняется в истории GitHub, любую ошибку можно откатить.</p>
      </div></section>
    <section class="panel"><div class="panel-head"><div><div class="eyebrow">Доступ</div><h2>Выход</h2></div></div>
      <p style="color:var(--muted);margin-bottom:14px">Токен хранится только в этом браузере. Выход удалит его с устройства.</p>
      <button class="btn btn-danger" data-act="logout">Выйти из админки</button></section>
  </div>`);
  $('#s-save').addEventListener('click', async () => {
    const before = S.settings.flickr_key;
    S.settings.flickr_key = $('#s-flickr').value.trim();
    try { await busy('Сохраняю…', () => saveCms({ [CMS_DIR + 'settings.json']: JSON.stringify(S.settings, null, 2) + '\n' }, 'Админка: ключ Flickr')); toast('Сохранено', 'ok'); }
    catch (err) { S.settings.flickr_key = before; toast(err.message, 'err'); }
  });
}

// ---------- маршруты ----------
async function route() {
  if (!S.gh) return;
  const h = location.hash.replace(/^#/, '') || '/';
  const [, view, arg] = h.split('/');
  if (view === 'edit') { const it = S.items.get(decodeURIComponent(arg)); if (!it) { toast('Материал не найден', 'err'); location.hash = '#/'; return; } openEditor(it); }
  else if (view === 'new') openEditor(newItem(['news', 'article', 'event'].includes(arg) ? arg : 'news'), true);
  else if (view === 'home') renderHome();
  else if (view === 'dicts') renderDicts();
  else if (view === 'settings') renderSettings();
  else renderList();
  scrollTo(0, 0);
}
let lastHash = location.hash;
function setHash(h) { history.replaceState(null, '', h); lastHash = location.hash; }
addEventListener('hashchange', e => {
  if (S.dirty && S.draft && !confirm('Есть несохранённые изменения. Уйти без сохранения?')) { history.replaceState(null, '', lastHash); return; }
  S.dirty = false; lastHash = location.hash; route();
});
addEventListener('beforeunload', e => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

async function start() {
  try { await busy('Загружаю материалы…', loadAll); }
  catch (err) { if (err.status === 401) { logout(); return; } root.innerHTML = `<div class="login"><div class="login-card"><h1>Не удалось загрузить</h1><p>${esc(err.message)}</p><button class="btn btn-primary" onclick="location.reload()">Повторить</button> <button class="btn" data-act="logout">Выйти</button></div></div>`; return; }
  lastHash = location.hash; route();
}

(async function init() {
  let token = null;
  try { token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY); } catch (_) { }
  if (!token) return renderLogin();
  S.gh = makeGH(token); start();
})();
