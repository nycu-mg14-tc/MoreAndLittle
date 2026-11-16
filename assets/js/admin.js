import { create, isSafeWebUrl } from './catalog.js';
import { buildEntry } from './admin-model.js';
import { GitHubAdmin } from './github-admin.js';

const $ = selector => document.querySelector(selector);
const loginForm = $('#login-form');
const form = $('#entry-form');
let client = null;
let categories = [];
let draftId = '';
let dirty = false;
let publishing = false;
let saved = false;

function message(text, isError = false) {
  const element = $('#admin-message');
  element.replaceChildren(document.createTextNode(text));
  element.setAttribute('role', isError ? 'alert' : 'status');
  element.hidden = false;
}

function values() {
  return Object.fromEntries(['title', 'category', 'tags', 'summary', 'kind', 'heading', 'body', 'sourceUrl', 'url'].map(name => [name, form.elements.namedItem(name).value]));
}

function preview() {
  const data = values();
  const wrapper = create('div', 'card-inner');
  wrapper.append(create('p', 'card-category', data.category || '選擇分類'), create('h3', 'card-title', data.title.trim() || '你的主題名稱'), create('p', 'card-summary', data.summary.trim() || '填寫摘要後，這裡會顯示卡片的預覽。'));
  const tags = create('div', 'card-tags');
  [...new Set(data.tags.split(/[,，、\n]/).map(tag => tag.trim().replace(/^#+\s*/, '')).filter(Boolean))].slice(0, 3).forEach(tag => tags.append(create('span', 'mini-tag', '#' + tag)));
  wrapper.append(tags, create('p', 'card-date', data.kind === 'link' ? '網站資源 · 在新分頁開啟' : '知識文章 · 在站內閱讀'));
  $('#preview-card').replaceChildren(wrapper);
  const body = $('#preview-body');
  body.replaceChildren();
  if (data.kind === 'article') {
    body.append(create('h3', '', data.heading.trim() || '內容'));
    (data.body.trim() ? data.body.trim().split(/\r?\n\s*\r?\n/) : ['文章內容預覽會顯示在這裡。']).forEach(text => body.append(create('p', '', text)));
  } else {
    body.append(create('h3', '', '收藏網站'));
    if (isSafeWebUrl(data.url.trim())) {
      const link = create('a', 'entry-end-link', '試開網站 ↗');
      link.href = data.url.trim(); link.target = '_blank'; link.rel = 'noopener noreferrer';
      body.append(link);
    } else body.append(create('p', '', '填入完整網址後，可在這裡試開連結。'));
  }
}

function switchKind() {
  const article = $('#entry-kind').value === 'article';
  $('#article-fields').hidden = !article;
  $('#link-fields').hidden = article;
  for (const input of $('#article-fields').querySelectorAll('input, textarea')) input.disabled = !article;
  $('#entry-body').required = article;
  $('#entry-url').disabled = article;
  $('#entry-url').required = !article;
}

function resetEntry() {
  form.reset();
  for (const element of form.querySelectorAll('input, textarea, select')) element.disabled = false;
  draftId = `note-${crypto.randomUUID()}`;
  dirty = false; saved = false;
  $('#entry-fields').disabled = false;
  $('#publish').disabled = false;
  $('#publish').textContent = '儲存並發布卡片';
  switchKind(); preview();
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const repository = $('#repository').value;
  const token = $('#admin-token').value;
  $('#admin-token').value = '';
  $('#unlock').disabled = true;
  message('正在確認身分並讀取你的知識庫…');
  let candidate;
  try {
    candidate = new GitHubAdmin(repository, token);
    const result = await candidate.connect();
    client = candidate;
    categories = result.manifest.categories.map(category => category.id);
    $('#entry-category').replaceChildren(...categories.map(category => {
      const option = create('option', '', category); option.value = category; return option;
    }));
    $('#session-label').textContent = `${result.login} 的知識庫 · ${result.items.length} 則收藏（${result.branch}）`;
    $('#login-panel').hidden = true;
    $('#editor-panel').hidden = false;
    $('#admin-message').hidden = true;
    resetEntry();
    $('#entry-title').focus();
  } catch (error) {
    candidate?.logout(); client = null;
    message(error.message, true);
  } finally { $('#unlock').disabled = false; }
});

form.addEventListener('input', () => { dirty = true; preview(); });
$('#entry-kind').addEventListener('change', () => { switchKind(); preview(); });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!client || publishing || saved) return;
  let entry;
  try { entry = buildEntry(values(), categories, draftId); }
  catch (error) { message(error.message, true); return; }
  publishing = true;
  $('#entry-fields').disabled = true;
  $('#logout').disabled = true;
  message('正在儲存卡片，請稍候…');
  try {
    const result = await client.publish(entry);
    saved = true; dirty = false;
    message(result.alreadySaved ? '這張卡片已經儲存成功，不會重複新增。請等待網站更新後再查看。' : '卡片已儲存到 GitHub！網站更新完成後就會出現，通常需幾分鐘。');
    const link = create('a', '', ' 查看卡片（網站更新後）');
    link.href = `./entry.html?id=${encodeURIComponent(entry.id)}`;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    $('#admin-message').append(link);
    if (result.commitUrl) {
      const commit = create('a', '', ' 查看儲存紀錄 ↗');
      commit.href = result.commitUrl; commit.target = '_blank'; commit.rel = 'noopener noreferrer';
      $('#admin-message').append(commit);
    }
    $('#publish').textContent = '已儲存';
    $('#new-entry').textContent = '新增下一張卡片';
  } catch (error) { message(error.message, true); }
  finally {
    publishing = false;
    $('#entry-fields').disabled = false;
    $('#logout').disabled = false;
    $('#publish').disabled = saved;
    // 儲存後保留內容供檢視；按「新增下一張」才開始新稿。
    for (const element of form.querySelectorAll('input, textarea, select')) element.disabled = saved;
    if (!saved) switchKind();
  }
});

$('#new-entry').addEventListener('click', () => {
  if (dirty && !window.confirm('清空目前尚未儲存的內容？')) return;
  for (const element of form.querySelectorAll('input, textarea, select')) element.disabled = false;
  resetEntry();
  $('#new-entry').textContent = '清空表單';
  $('#admin-message').hidden = true;
  $('#entry-title').focus();
});

function logout() {
  client?.logout(); client = null; dirty = false;
  $('#admin-token').value = '';
  form.reset();
  $('#editor-panel').hidden = true;
  $('#login-panel').hidden = false;
}
$('#logout').addEventListener('click', () => {
  if (dirty && !window.confirm('尚有未儲存的內容，確定登出並清除？')) return;
  logout(); message('已登出，管理金鑰已從本頁移除。');
});
window.addEventListener('beforeunload', event => {
  if (dirty || publishing) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('pagehide', logout);

try {
  const response = await fetch('./data/admin.json', { cache: 'no-store' });
  if (response.ok) $('#repository').value = (await response.json()).repository || '';
} catch { /* 仍可手動填入非機密的專案網址。 */ }
if (!window.isSecureContext) {
  $('#unlock').disabled = true;
  message('請使用 HTTPS 網站或 localhost 開啟管理頁，再輸入管理金鑰。', true);
}
