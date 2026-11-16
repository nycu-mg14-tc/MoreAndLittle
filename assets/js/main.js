import { create, filterEntries, formatDate, loadCatalog } from './catalog.js';

const elements = {
  categories: document.querySelector('#categories'),
  tags: document.querySelector('#tags'),
  cards: document.querySelector('#cards'),
  search: document.querySelector('#knowledge-search'),
  sort: document.querySelector('#sort-select'),
  notice: document.querySelector('#notice'),
  empty: document.querySelector('#empty-state'),
  reset: document.querySelector('#reset-filters'),
  results: document.querySelector('#results-label'),
  total: document.querySelector('#total-stat')
};
const state = { items: [], categories: [], category: '全部', tag: '全部', query: '', sort: 'recent' };
const categorySymbols = { '學習與整理': '◇', 'AI與工具': '✳', '程式與網頁': '⌘', '設計與效率': '◐' };

function renderCategories() {
  elements.categories.replaceChildren();
  for (const category of ['全部', ...state.categories]) {
    const button = create('button', 'category-pill' + (state.category === category ? ' is-active' : ''), category === '全部' ? '全部主題' : category);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(state.category === category));
    button.addEventListener('click', () => { state.category = category; render(); });
    elements.categories.append(button);
  }
}
function renderTags() {
  elements.tags.replaceChildren();
  const counts = new Map();
  state.items.forEach(item => item.tags.forEach(tag => counts.set(tag, (counts.get(tag) || 0) + 1)));
  const tags = [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b, 'zh-Hant'));
  for (const tag of ['全部', ...tags]) {
    const button = create('button', 'tag-pill' + (state.tag === tag ? ' is-active' : ''), tag === '全部' ? '所有標籤' : `# ${tag}`);
    button.type = 'button';
    button.setAttribute('aria-pressed', String(state.tag === tag));
    button.addEventListener('click', () => { state.tag = tag; render(); });
    elements.tags.append(button);
  }
}
function card(item, index) {
  const wrapper = create('article', 'knowledge-card');
  const link = create('a', 'card-inner');
  link.href = item.kind === 'link' ? item.url : `./entry.html?id=${encodeURIComponent(item.id)}`;
  if (item.kind === 'link') { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  link.setAttribute('aria-label', `${item.title}，${item.kind === 'link' ? '在新分頁開啟網站' : '閱讀完整內容'}`);
  const top = create('div', 'card-top');
  const icon = create('span', 'card-symbol', categorySymbols[item.category] || '◇');
  icon.setAttribute('aria-hidden', 'true');
  const counter = create('span', 'card-index', String(index + 1).padStart(2, '0'));
  top.append(icon, counter);
  const topic = create('span', 'card-category', item.category);
  const title = create('h3', 'card-title', item.title);
  const summary = create('p', 'card-summary', item.summary);
  const tags = create('div', 'card-tags');
  item.tags.slice(0, 3).forEach(tag => tags.append(create('span', 'mini-tag', '#' + tag)));
  const bottom = create('div', 'card-bottom');
  const meta = create('span', 'card-date', `${formatDate(item.updated)} · ${item.kind === 'link' ? '網站資源' : '知識文章'}`);
  const action = create('span', 'card-arrow', '↗');
  action.setAttribute('aria-hidden', 'true');
  bottom.append(meta, action);
  link.append(top, topic, title, summary, tags, bottom);
  wrapper.append(link);
  return wrapper;
}
function render() {
  renderCategories();
  renderTags();
  const visible = filterEntries(state.items, state);
  elements.cards.replaceChildren(...visible.map(card));
  elements.results.textContent = `顯示 ${visible.length} 筆知識 · 共 ${state.items.length} 筆`;
  elements.empty.hidden = visible.length > 0;
}
function reset() {
  Object.assign(state, { category: '全部', tag: '全部', query: '', sort: 'recent' });
  elements.search.value = '';
  elements.sort.value = 'recent';
  render();
}
elements.search.addEventListener('input', e => { state.query = e.target.value; render(); });
elements.sort.addEventListener('change', e => { state.sort = e.target.value; render(); });
elements.reset.addEventListener('click', reset);

try {
  const { manifest, items, errors } = await loadCatalog();
  state.items = items;
  state.categories = manifest.categories.map(category => category.id);
  elements.total.textContent = `${items.length} 則收藏 · ${new Set(items.flatMap(item => item.tags)).size} 個標籤`;
  if (errors.length) {
    elements.notice.hidden = false;
    elements.notice.textContent = `有 ${errors.length} 篇內容未能載入，請檢查資料檔與 AGENTS.md 的格式規定。`;
    console.warn('知識庫載入提醒：', errors);
  }
  render();
} catch (error) {
  elements.total.textContent = '載入失敗';
  elements.results.textContent = '內容暫時無法顯示';
  elements.notice.hidden = false;
  elements.notice.textContent = `${error.message}。請透過 HTTP 網頁伺服器開啟網站，並檢查 data/catalog.json 是否存在。`;
}
