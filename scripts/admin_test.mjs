import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { buildEntry, prepareAddition, localDate } from '../assets/js/admin-model.js';
import { GitHubAdmin, parseRepository } from '../assets/js/github-admin.js';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('data/catalog.json', root), 'utf8'));
const items = await Promise.all(manifest.files.map(async file => JSON.parse(await readFile(new URL(file, root), 'utf8'))));
const category = manifest.categories[0].id;
const base = { title: '手機新增測試', category, tags: '筆記, 學習，筆記', summary: '這是有內容的測試摘要。', kind: 'article', heading: '', body: '第一段。\n\n第二段。', url: '', sourceUrl: '' };

// 僅供測試的 GitHub REST 回應；不使用真實金鑰、不連線外站。
export function mockGitHub() {
  const state = { manifest: structuredClone(manifest), items: structuredClone(items), calls: [], owner: 'nycu-mg14-tc', login: 'nycu-mg14-tc', denied: false, conflict: false, lostResponse: false, orphan: '', head: 'head-one' };
  let staged;
  const reply = (status, data = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
  const fetch = async (url, options = {}) => {
    const endpoint = new URL(url).pathname;
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : undefined;
    state.calls.push({ endpoint, method, body });
    if (state.denied) return reply(401);
    if (endpoint === '/user') return reply(200, { login: state.login });
    if (endpoint === '/repos/nycu-mg14-tc/MoreAndLittle') return reply(200, { owner: { login: state.owner, type: 'User' }, default_branch: 'main' });
    if (method === 'GET' && endpoint.endsWith('/git/ref/heads/main')) return reply(200, { object: { sha: state.head } });
    if (method === 'GET' && endpoint.includes('/git/commits/')) return reply(200, { tree: { sha: 'current-tree' } });
    if (method === 'GET' && endpoint.includes('/git/trees/')) {
      const tree = [ { path: 'data/catalog.json', type: 'blob', mode: '100644', sha: 'catalog' }, ...state.manifest.files.map((file, i) => ({ path: file, type: 'blob', mode: '100644', sha: `item-${i}` })) ];
      if (state.orphan) tree.push({ path: state.orphan, type: 'blob', mode: '100644', sha: 'orphan' });
      return reply(200, { tree, truncated: false });
    }
    if (method === 'GET' && endpoint.includes('/git/blobs/')) {
      const key = endpoint.split('/').at(-1);
      const content = key === 'catalog' ? state.manifest : state.items[Number(key.slice(5))];
      return reply(200, { encoding: 'base64', content: Buffer.from(JSON.stringify(content)).toString('base64') });
    }
    if (method === 'POST' && endpoint.endsWith('/git/trees')) { staged = body; return reply(201, { sha: 'new-tree' }); }
    if (method === 'POST' && endpoint.endsWith('/git/commits')) return reply(201, { sha: 'new-commit' });
    if (method === 'PATCH') {
      if (state.conflict) return reply(422);
      state.manifest = JSON.parse(staged.tree.find(file => file.path === 'data/catalog.json').content);
      state.items.push(JSON.parse(staged.tree.find(file => file.path !== 'data/catalog.json').content));
      state.head = 'new-commit';
      if (state.lostResponse) { state.lostResponse = false; throw Error('simulated response loss'); }
      return reply(200, { object: { sha: state.head } });
    }
    throw Error(`Unexpected test request: ${method} ${endpoint}`);
  };
  return { state, fetch };
}

async function run() {
  const entry = buildEntry(base, [category], 'note-test', new Date(2026, 10, 16));
  assert.equal(localDate(new Date(2026, 0, 2)), '2026-01-02');
  assert.equal(entry.updated, '2026-11-16');
  assert.deepEqual(entry.tags, ['筆記', '學習']);
  assert.deepEqual(entry.sections[0].paragraphs, ['第一段。', '第二段。']);
  const link = buildEntry({ ...base, kind: 'link', url: 'https://example.com', body: '' }, [category], 'note-link');
  assert.equal(link.url, 'https://example.com'); assert.equal(link.sections, undefined);
  for (const patch of [{ title: '../escape' }, { title: 'CON' }, { title: 'name.' }, { title: '字'.repeat(90) }, { summary: ' ' }, { tags: ',，' }, { body: '' }, { category: 'missing' }, { kind: 'link', url: 'javascript:alert(1)' }, { sourceUrl: 'data:text/plain,test' }]) {
    assert.throws(() => buildEntry({ ...base, ...patch }, [category], 'note-test'));
  }
  assert.deepEqual(parseRepository('https://github.com/nycu-mg14-tc/MoreAndLittle/'), { owner: 'nycu-mg14-tc', repo: 'MoreAndLittle' });
  assert.throws(() => parseRepository('https://example.com/me/repo'));
  assert.throws(() => prepareAddition(manifest, items, { ...entry, title: items[0].title }));
  assert.throws(() => prepareAddition(manifest, items, { ...entry, title: '../escape' }));
  assert.equal(prepareAddition(manifest, [...items, entry], entry).alreadySaved, true);
  const fixture = mockGitHub();
  const api = new GitHubAdmin('nycu-mg14-tc/MoreAndLittle', 'test-only-token', function (...args) {
    assert.equal(this, globalThis, '瀏覽器 fetch 必須以全域物件呼叫，避免 Illegal invocation');
    return fixture.fetch(...args);
  });
  await assert.rejects(api.publish(entry), /解鎖/);
  const connected = await api.connect(); assert.equal(connected.items.length, items.length);
  const result = await api.publish(entry); assert.equal(result.alreadySaved, false);
  const tree = fixture.state.calls.find(call => call.method === 'POST' && call.endpoint.endsWith('/git/trees')).body;
  assert.equal(tree.base_tree, 'current-tree'); assert.equal(tree.tree.length, 2);
  assert.deepEqual(JSON.parse(tree.tree[1].content).files.slice(0, -1), manifest.files);
  assert.equal(tree.tree[0].path, `content/${entry.title}.json`);
  const patch = fixture.state.calls.find(call => call.method === 'PATCH'); assert.equal(patch.body.force, false);
  const parent = fixture.state.calls.find(call => call.endpoint.endsWith('/git/commits') && call.method === 'POST'); assert.deepEqual(parent.body.parents, ['head-one']);
  const writes = fixture.state.calls.filter(call => call.method !== 'GET').length;
  assert.equal((await api.publish(entry)).alreadySaved, true);
  assert.equal(fixture.state.calls.filter(call => call.method !== 'GET').length, writes);
  api.logout(); await assert.rejects(api.publish(entry), /解鎖/);
  for (const mode of ['denied', 'wrongOwner', 'orphan', 'conflict', 'lostResponse']) {
    const mock = mockGitHub();
    if (mode === 'wrongOwner') mock.state.login = 'someone-else';
    else if (mode === 'orphan') mock.state.orphan = 'content/unregistered.json';
    else mock.state[mode] = true;
    const service = new GitHubAdmin('nycu-mg14-tc/MoreAndLittle', 'test-only-token', mock.fetch);
    if (['denied', 'wrongOwner', 'orphan'].includes(mode)) {
      await assert.rejects(service.connect());
      assert.equal(mock.state.calls.some(call => call.method !== 'GET'), false);
    } else {
      await service.connect(); await assert.rejects(service.publish(entry));
      if (mode === 'conflict') assert.equal(mock.state.items.length, items.length);
      else {
        assert.equal((await service.publish(entry)).alreadySaved, true);
        assert.equal(mock.state.items.length, items.length + 1);
      }
    }
  }
  console.log('✓ 管理測試通過：表單、Unicode、檔名、身分拒絕、原子提交、保留舊內容、衝突拒絕、斷線重試不重複、登出。');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
