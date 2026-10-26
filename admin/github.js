// Работа с GitHub: чтение файлов и запись изменений одним коммитом.
export const OWNER = 'milbrotherr';
export const CMS_REPO = 'vstrecha-project';   // закрытый: материалы админки, черновики, загруженные картинки
export const SITE_REPO = 'vstrecha';          // сайт: отсюда сервер МДА забирает обновления
export const BRANCH = 'main';
export const CMS_DIR = 'cms/';

export class GitHubError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

function b64FromBytes(bytes) {
  let s = ''; const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(s);
}

export class GitHub {
  constructor(token) { this.token = token; }

  async api(path, { method = 'GET', body, raw = false, binary = false } = {}) {
    const res = await fetch('https://api.github.com' + path, {
      method,
      headers: {
        Authorization: 'Bearer ' + this.token,
        Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    if (!res.ok) {
      let msg = res.status + '';
      try { msg = (await res.json()).message || msg; } catch (_) { }
      const human = res.status === 401 ? 'Токен не подходит или устарел'
        : res.status === 403 ? 'Нет доступа (проверьте права токена): ' + msg
        : res.status === 404 ? 'Не найдено: ' + path
        : 'GitHub: ' + msg;
      throw new GitHubError(human, res.status);
    }
    if (binary) return new Uint8Array(await res.arrayBuffer());
    if (raw) return new TextDecoder('utf-8').decode(await res.arrayBuffer());
    if (res.status === 204) return null;
    return res.json();
  }

  repo(name) { return `/repos/${OWNER}/${name}`; }

  async checkAccess() {
    const out = {};
    for (const r of [CMS_REPO, SITE_REPO]) {
      const info = await this.api(this.repo(r));
      out[r] = info;
    }
    return out;
  }

  // Список файлов репозитория: { путь: sha }
  async tree(repo) {
    const ref = await this.api(`${this.repo(repo)}/git/ref/heads/${BRANCH}`);
    const commit = await this.api(`${this.repo(repo)}/git/commits/${ref.object.sha}`);
    const t = await this.api(`${this.repo(repo)}/git/trees/${commit.tree.sha}?recursive=1`);
    const map = {};
    for (const e of t.tree) if (e.type === 'blob') map[e.path] = e.sha;
    return { head: ref.object.sha, files: map, truncated: t.truncated };
  }

  async readText(repo, path) {
    return this.api(`${this.repo(repo)}/contents/${encodeURI(path)}?ref=${BRANCH}`, { raw: true });
  }
  async readBlobText(repo, sha) {
    const b = await this.api(`${this.repo(repo)}/git/blobs/${sha}`);
    const bin = atob(b.content.replace(/\n/g, ''));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  // Двоичные файлы читаем по sha через Git Blobs: так байты не портятся
  async readBytes(repo, path) {
    let sha = this._shas?.[repo]?.[path];
    if (!sha) { const t = await this.tree(repo); this._shas = { ...(this._shas || {}), [repo]: t.files }; sha = t.files[path]; }
    if (!sha) throw new GitHubError('Не найдено: ' + path, 404);
    return this.api(`${this.repo(repo)}/git/blobs/${sha}`, { raw: true, binary: true });
  }

  // changes: { путь: string | Uint8Array | null(удалить) }
  async commit(repo, changes, message) {
    const paths = Object.keys(changes);
    if (!paths.length) return null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const ref = await this.api(`${this.repo(repo)}/git/ref/heads/${BRANCH}`);
      const parent = await this.api(`${this.repo(repo)}/git/commits/${ref.object.sha}`);
      const tree = [];
      for (const p of paths) {
        const c = changes[p];
        if (c === null) { tree.push({ path: p, mode: '100644', type: 'blob', sha: null }); continue; }
        const blob = typeof c === 'string'
          ? await this.api(`${this.repo(repo)}/git/blobs`, { method: 'POST', body: { content: c, encoding: 'utf-8' } })
          : await this.api(`${this.repo(repo)}/git/blobs`, { method: 'POST', body: { content: b64FromBytes(c), encoding: 'base64' } });
        tree.push({ path: p, mode: '100644', type: 'blob', sha: blob.sha });
      }
      // удалять можно только существующие файлы
      const existing = tree.filter(t => t.sha === null);
      if (existing.length) {
        const cur = await this.tree(repo);
        for (const t of existing) if (!cur.files[t.path]) tree.splice(tree.indexOf(t), 1);
        if (!tree.length) return null;
      }
      const newTree = await this.api(`${this.repo(repo)}/git/trees`, { method: 'POST', body: { base_tree: parent.tree.sha, tree } });
      if (newTree.sha === parent.tree.sha) return null; // ничего не изменилось
      const commit = await this.api(`${this.repo(repo)}/git/commits`, { method: 'POST', body: { message, tree: newTree.sha, parents: [ref.object.sha] } });
      try {
        await this.api(`${this.repo(repo)}/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: { sha: commit.sha } });
        return commit.sha;
      } catch (e) {
        if (e.status === 422 && attempt < 2) continue; // кто-то успел записать раньше — повторяем
        throw e;
      }
    }
  }
}
