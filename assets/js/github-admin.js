import { isValidEntry } from './catalog.js';
import { prepareAddition } from './admin-model.js';

export function parseRepository(value) {
  const text = value.trim().replace(/\/$/, '').replace(/\.git$/, '');
  const match = /^(?:https:\/\/github\.com\/)?([a-zA-Z0-9-]+)\/([a-zA-Z0-9_.-]+)$/.exec(text);
  if (!match || ['.', '..'].includes(match[2])) throw new Error('請填寫 GitHub 專案網址，例如 https://github.com/你的帳號/knowledge-atlas。');
  return { owner: match[1], repo: match[2] };
}

export class GitHubAdmin {
  #token;
  #fetch;
  #base;
  #branch;
  #authorized = false;
  #busy = false;
  constructor(repository, token, fetchImpl = globalThis.fetch) {
    const { owner, repo } = parseRepository(repository);
    this.owner = owner;
    this.repo = repo;
    this.#base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    this.#token = token.trim();
    this.#fetch = fetchImpl.bind(globalThis);
  }

  logout() { this.#token = ''; this.#authorized = false; }

  async #request(endpoint, method = 'GET', body) {
    if (!this.#token) throw new Error('請先解鎖管理頁。');
    let response;
    try {
      response = await this.#fetch(`https://api.github.com${endpoint}`, {
        method, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${this.#token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(20000)
      });
    } catch {
      throw new Error('無法確認 GitHub 回應，請檢查網路後再試。表單仍保留；重試會先檢查是否已經儲存。');
    }
    if (!response.ok) {
      const messages = {
        401: '管理金鑰無效或已過期，請登出後重新輸入。',
        403: 'GitHub 拒絕此操作：請檢查金鑰的 Contents 讀寫權限、分支保護或 API 使用額度。',
        404: '找不到專案或內容，請確認網址、已上傳完整專案，且金鑰可以存取它。',
        409: '專案已在其他地方更新，請再次送出；系統會重新讀取最新資料。',
        422: 'GitHub 未接受更新，可能是分支已有新版本或設有保護。請再次送出或檢查儲存庫設定。'
      };
      throw new Error(messages[response.status] || `GitHub 暫時無法完成操作（HTTP ${response.status}），請稍後再試。`);
    }
    return response.json();
  }

  async connect() {
    const user = await this.#request('/user');
    const repository = await this.#request(this.#base);
    if (repository.owner?.type !== 'User' || user.login?.toLowerCase() !== this.owner.toLowerCase() ||
        repository.owner.login?.toLowerCase() !== user.login?.toLowerCase()) {
      this.logout();
      throw new Error('這個管理頁只接受專案擁有者本人的 GitHub 金鑰。');
    }
    if (repository.archived || repository.disabled) throw new Error('此專案目前無法修改。');
    this.#branch = repository.default_branch;
    if (!this.#branch) throw new Error('請先將完整專案上傳至 GitHub，再開啟管理功能。');
    this.#authorized = true;
    try {
      const snapshot = await this.#snapshot();
      return { login: user.login, branch: this.#branch, ...snapshot };
    } catch (error) { this.logout(); throw error; }
  }

  async #jsonBlob(sha) {
    const blob = await this.#request(`${this.#base}/git/blobs/${sha}`);
    if (blob.encoding !== 'base64') throw new Error('GitHub 內容編碼無法讀取。');
    try {
      const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g, '')), char => char.charCodeAt(0));
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    } catch { throw new Error('專案中有無法讀取的 JSON，請先修復資料。'); }
  }

  async #snapshot() {
    if (!this.#authorized) throw new Error('請先解鎖管理頁。');
    const branchPath = this.#branch.split('/').map(encodeURIComponent).join('/');
    const ref = await this.#request(`${this.#base}/git/ref/heads/${branchPath}`);
    const commit = await this.#request(`${this.#base}/git/commits/${ref.object.sha}`);
    const tree = await this.#request(`${this.#base}/git/trees/${commit.tree.sha}?recursive=1`);
    if (tree.truncated) throw new Error('專案檔案過多，無法完整確認內容；已停止儲存。');
    const byPath = new Map(tree.tree.map(file => [file.path, file]));
    const catalog = byPath.get('data/catalog.json');
    if (catalog?.type !== 'blob' || catalog.mode !== '100644') throw new Error('專案根目錄缺少可讀取的 data/catalog.json。');
    const manifest = await this.#jsonBlob(catalog.sha);
    if (!manifest || !Array.isArray(manifest.files) || !Array.isArray(manifest.categories) ||
        !manifest.categories.length || !manifest.categories.every(category => typeof category?.id === 'string' && category.id.trim()) ||
        new Set(manifest.categories.map(category => category.id)).size !== manifest.categories.length ||
        !manifest.files.every(file => typeof file === 'string' && /^content\/[^/\\]+\.json$/.test(file)) ||
        new Set(manifest.files).size !== manifest.files.length) throw new Error('目錄格式有誤，已停止儲存，避免覆蓋內容。');
    const categories = manifest.categories.map(category => category.id);
    const items = [];
    // 限制並行量，避免一次送出過多 GitHub 請求。
    for (let offset = 0; offset < manifest.files.length; offset += 4) {
      const group = await Promise.all(manifest.files.slice(offset, offset + 4).map(async file => {
        const node = byPath.get(file);
        if (node?.type !== 'blob' || node.mode !== '100644') throw new Error('有內容檔案缺失或格式不符，請先修復目錄。');
        const item = await this.#jsonBlob(node.sha);
        if (!isValidEntry(item, categories) || file !== `content/${item.title}.json`) throw new Error('有內容未通過格式檢查，請先修復再新增。');
        return item;
      }));
      items.push(...group);
    }
    if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('有重複的內容識別碼，請先修復。');
    if (tree.tree.some(node => /^content\/[^/]+\.json$/.test(node.path) && !manifest.files.includes(node.path))) throw new Error('有內容尚未登記到目錄，請先完成登記。');
    return { head: ref.object.sha, tree: commit.tree.sha, manifest, items, paths: [...byPath.keys()] };
  }

  async publish(entry) {
    if (!this.#authorized) throw new Error('請先解鎖管理頁。');
    if (this.#busy) throw new Error('正在儲存，請勿重複送出。');
    this.#busy = true;
    try {
      const snapshot = await this.#snapshot();
      const addition = prepareAddition(snapshot.manifest, snapshot.items, entry);
      if (addition.alreadySaved) return { alreadySaved: true };
      if (snapshot.paths.some(path => path.normalize('NFC').toLowerCase() === addition.path.normalize('NFC').toLowerCase())) throw new Error('專案中已有同名檔案，已停止儲存。');
      const tree = await this.#request(`${this.#base}/git/trees`, 'POST', {
        base_tree: snapshot.tree,
        tree: [
          { path: addition.path, mode: '100644', type: 'blob', content: JSON.stringify(entry, null, 2) + '\n' },
          { path: 'data/catalog.json', mode: '100644', type: 'blob', content: JSON.stringify(addition.manifest, null, 2) + '\n' }
        ]
      });
      const commit = await this.#request(`${this.#base}/git/commits`, 'POST', {
        message: `Add knowledge: ${entry.title}`, tree: tree.sha, parents: [snapshot.head]
      });
      // 兩個檔案同一提交；拒絕強制覆蓋其他裝置剛送出的內容。
      const branchPath = this.#branch.split('/').map(encodeURIComponent).join('/');
      await this.#request(`${this.#base}/git/refs/heads/${branchPath}`, 'PATCH', { sha: commit.sha, force: false });
      return { alreadySaved: false, commitUrl: `https://github.com/${this.owner}/${this.repo}/commit/${commit.sha}` };
    } finally { this.#busy = false; }
  }
}
