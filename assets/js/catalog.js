const siteRoot = new URL('../../', import.meta.url);

export function isSafeWebUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isValidEntry(item, categories) {
  const nonempty = value => typeof value === 'string' && value.trim().length > 0;
  if (!item || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id || '')) return false;
  if (!nonempty(item.title) || !nonempty(item.summary) || !categories.includes(item.category)) return false;
  if (!Array.isArray(item.tags) || item.tags.length === 0 || !item.tags.every(nonempty)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.updated || '') || Number.isNaN(Date.parse(item.updated))) return false;
  if (item.kind === 'link') return isSafeWebUrl(item.url);
  if (item.kind !== 'article' || !Array.isArray(item.sections) || !item.sections.length) return false;
  return item.sections.every(section => nonempty(section.heading) &&
    ((Array.isArray(section.paragraphs) && section.paragraphs.some(nonempty)) ||
     (Array.isArray(section.bullets) && section.bullets.some(nonempty))));
}

export function filterEntries(items, { query = '', category = '全部', tag = '全部', sort = 'recent' } = {}) {
  const word = query.trim().toLocaleLowerCase('zh-TW');
  const filtered = items.filter(item => {
    if (category !== '全部' && item.category !== category) return false;
    if (tag !== '全部' && !item.tags.includes(tag)) return false;
    if (!word) return true;
    const text = [item.title, item.summary, item.category, ...item.tags].join(' ').toLocaleLowerCase('zh-TW');
    return text.includes(word);
  });
  filtered.sort((a, b) => sort === 'title'
    ? a.title.localeCompare(b.title, 'zh-Hant')
    : b.updated.localeCompare(a.updated) || a.title.localeCompare(b.title, 'zh-Hant'));
  return filtered;
}

export async function loadCatalog() {
  const manifestUrl = new URL('data/catalog.json', siteRoot);
  const manifestResponse = await fetch(manifestUrl);
  if (!manifestResponse.ok) throw new Error(`目錄載入失敗（HTTP ${manifestResponse.status}）`);
  const manifest = await manifestResponse.json();
  if (!Array.isArray(manifest.files) || !Array.isArray(manifest.categories)) {
    throw new Error('目錄格式錯誤');
  }
  const categories = manifest.categories.map(category => category.id);
  const results = await Promise.allSettled(manifest.files.map(async path => {
    if (typeof path !== 'string' || !/^content\/[^/]+\.json$/.test(path)) throw new Error('內容路徑不符合規則');
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(new URL(encodedPath, siteRoot));
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    const item = await response.json();
    if (!isValidEntry(item, categories)) throw new Error(`${path}: 內容格式不完整`);
    if (path !== `content/${item.title}.json`) throw new Error(`${path}: 檔名必須與 title 完全相同`);
    return item;
  }));
  const items = [];
  const errors = [];
  const ids = new Set();
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      errors.push(String(result.reason?.message || manifest.files[i]));
    } else if (ids.has(result.value.id)) {
      errors.push(`${manifest.files[i]}: ID 重複`);
    } else {
      ids.add(result.value.id);
      items.push(result.value);
    }
  });
  return { manifest, items, errors };
}

export function create(tag, className = '', text = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function formatDate(value) { return value.replaceAll('-', '.'); }
