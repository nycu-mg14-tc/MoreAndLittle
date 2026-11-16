import { create, formatDate, loadCatalog, isSafeWebUrl } from './catalog.js';
const loading = document.querySelector('#article-loading');
const article = document.querySelector('#article-content');
const error = document.querySelector('#article-error');
const errorMessage = document.querySelector('#article-error-message');

function appendText(parent, tag, className, text) {
  parent.append(create(tag, className, text));
}
function renderArticle(item) {
  document.title = `${item.title}｜什麼都想學億點`;
  const header = create('header', 'entry-header');
  appendText(header, 'p', 'entry-eyebrow', `${item.category} / ${item.kind === 'link' ? '網站資源' : '知識文章'}`);
  appendText(header, 'h1', 'entry-title', item.title);
  appendText(header, 'p', 'entry-summary', item.summary);
  const meta = create('div', 'entry-meta');
  appendText(meta, 'span', '', `最後更新 ${formatDate(item.updated)}`);
  if (item.reading_minutes > 0) appendText(meta, 'span', '', `約 ${item.reading_minutes} 分鐘閱讀`);
  const tags = create('div', 'entry-tags');
  item.tags.forEach(tag => appendText(tags, 'span', 'mini-tag', '#' + tag));
  header.append(meta, tags);
  article.append(header);

  if (item.kind === 'link') {
    const panel = create('section', 'resource-panel');
    appendText(panel, 'p', 'resource-eyebrow', 'EXTERNAL RESOURCE');
    appendText(panel, 'h2', '', '繼續前往原始網站');
    appendText(panel, 'p', '', '這是一則外部資源收藏。你可以查看摘要，並由下方連結前往原網站。');
    const link = create('a', 'primary-button', '前往網站 ↗');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    panel.append(link); article.append(panel);
  } else {
    const body = create('div', 'entry-body');
    item.sections.forEach((section, i) => {
      const wrapper = create('section', 'entry-section');
      appendText(wrapper, 'div', 'section-index', String(i + 1).padStart(2, '0'));
      appendText(wrapper, 'h2', '', section.heading);
      (section.paragraphs || []).forEach(text => appendText(wrapper, 'p', '', text));
      if (Array.isArray(section.bullets) && section.bullets.length) {
        const list = create('ul');
        section.bullets.forEach(text => appendText(list, 'li', '', text));
        wrapper.append(list);
      }
      body.append(wrapper);
    });
    article.append(body);
    if (isSafeWebUrl(item.source_url)) {
      const source = create('div', 'source-box');
      appendText(source, 'strong', '', '延伸參考');
      const sourceLink = create('a', '', '查看原始參考資料 ↗');
      sourceLink.href = item.source_url;
      sourceLink.target = '_blank';
      sourceLink.rel = 'noopener noreferrer';
      source.append(sourceLink); article.append(source);
    }
  }
  const returnLink = create('a', 'entry-end-link', '← 返回知識列表');
  returnLink.href = './index.html#collection';
  article.append(returnLink);
}

try {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) throw new Error('網址缺少知識 ID。');
  const { items } = await loadCatalog();
  const item = items.find(candidate => candidate.id === id);
  if (!item) throw new Error('找不到這筆知識，可能已更名或從目錄移除。');
  renderArticle(item);
  article.hidden = false;
} catch (e) {
  errorMessage.textContent = e.message;
  error.hidden = false;
} finally {
  loading.hidden = true;
}
