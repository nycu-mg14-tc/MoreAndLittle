// Node 20+ 可用的無依賴測試，模擬在靜態網站上載入 JSON。
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// loadCatalog 原本透過瀏覽器 fetch，測試時改為讀取同樣的本地檔案。
globalThis.fetch = async (input) => {
  try {
    const text = await readFile(fileURLToPath(input), 'utf8');
    return { ok: true, json: async () => JSON.parse(text) };
  } catch {
    return { ok: false, status: 404 };
  }
};

const { loadCatalog, filterEntries, isSafeWebUrl } = await import('../assets/js/catalog.js');
const { manifest, items, errors } = await loadCatalog();
assert.equal(errors.length, 0, `任何無法讀取的項目：${errors.join('; ')}`);
assert.equal(items.length, manifest.files.length);
assert.ok(items.length > 0, '知識庫至少需要一筆有內容的資料');
assert.equal(filterEntries(items).length, items.length);

// 固定測試資料獨立於正式內容，新增／調整收藏不需修改預期筆數。
const fixtures = [
  { id: 'a', title: 'Git 入門', category: '程式', tags: ['Git'], summary: '版本控制', updated: '2026-01-01' },
  { id: 'b', title: 'GitHub Pages', category: '程式', tags: ['Git', '網站'], summary: '靜態網頁', updated: '2026-02-01' },
  { id: 'c', title: '筆記方法', category: '學習', tags: ['整理'], summary: '建立索引', updated: '2026-03-01' },
  { id: 'd', title: '協作流程', category: '學習', tags: ['Git'], summary: '團隊紀錄', updated: '2026-01-15' }
];
const ids = options => filterEntries(fixtures, options).map(item => item.id);
assert.deepEqual(ids({ category: '程式' }), ['b', 'a']);
assert.deepEqual(ids({ tag: 'Git' }), ['b', 'd', 'a']);
assert.deepEqual(ids({ category: '程式', tag: 'Git' }), ['b', 'a']);
assert.deepEqual(ids({ category: '程式', tag: 'Git', query: 'GitHub Pages' }), ['b']);
assert.deepEqual(ids({ category: '學習', tag: '網站' }), []);
assert.deepEqual(ids({ query: '不可能存在的詞' }), []);
assert.deepEqual(ids({ query: ' gIt ' }), ['b', 'd', 'a']);
assert.deepEqual(ids({ query: '版本控制' }), ['a']);
assert.deepEqual(ids({ query: '學習' }), ['c', 'd']);
assert.deepEqual(ids({ query: '整理' }), ['c']);
assert.deepEqual(ids({ sort: 'recent' }), ['c', 'b', 'd', 'a']);
assert.deepEqual(ids({ category: '程式', tag: 'Git', query: 'GitHub', sort: 'title' }), ['b']);
const ordered = filterEntries(items, { sort: 'recent' });
assert.ok(ordered.every((item, i) => i === 0 || ordered[i - 1].updated >= item.updated));
const titled = filterEntries(items, { sort: 'title' });
assert.ok(titled.every((item, i) => i === 0 || titled[i - 1].title.localeCompare(item.title, 'zh-Hant') <= 0));
assert.ok(items.filter(item => item.kind === 'article').every(item => item.sections.length));
assert.ok(items.filter(item => item.kind === 'link').every(item => isSafeWebUrl(item.url)));
assert.equal(isSafeWebUrl('javascript:alert(1)'), false);
console.log(`✓ JS 測試通過：JSON 載入、${items.length} 筆資料、分類、標籤、交集搜尋、大小寫、空結果、排序、連結安全性。`);
