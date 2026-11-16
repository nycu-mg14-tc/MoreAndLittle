import { isSafeWebUrl, isValidEntry } from './catalog.js';

export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function validateTitle(title) {
  if (!title) throw new Error('請填寫主題名稱。');
  if (/[\\/:*?"<>|\u0000-\u001f]/.test(title) || /[. ]$/.test(title) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(title) ||
      new TextEncoder().encode(title + '.json').length > 240) {
    throw new Error('主題名稱過長或含有不適合檔名的符號，請縮短並移除斜線、冒號等符號。');
  }
}

export function buildEntry(values, categories, id, now = new Date()) {
  const title = values.title.trim();
  validateTitle(title);
  const tags = [...new Set(values.tags.split(/[,，、\n]/).map(tag => tag.trim().replace(/^#+\s*/, '')).filter(Boolean))];
  const entry = {
    id, title, category: values.category, tags,
    summary: values.summary.trim(), kind: values.kind, updated: localDate(now)
  };
  if (!entry.summary) throw new Error('請填寫摘要，讓讀者知道卡片的內容。');
  if (!tags.length) throw new Error('請至少填寫一個標籤。');
  if (!categories.includes(entry.category)) throw new Error('請選擇有效的分類。');
  if (entry.kind === 'link') {
    entry.url = values.url.trim();
    if (!isSafeWebUrl(entry.url)) throw new Error('請填寫以 https:// 或 http:// 開頭的完整網址。');
  } else if (entry.kind === 'article') {
    const paragraphs = values.body.trim().split(/\r?\n\s*\r?\n/).map(text => text.trim()).filter(Boolean);
    if (!paragraphs.length) throw new Error('請填寫文章內容。');
    entry.sections = [{ heading: values.heading.trim() || '內容', paragraphs }];
    if (values.sourceUrl.trim()) {
      if (!isSafeWebUrl(values.sourceUrl.trim())) throw new Error('參考來源須為完整的 http(s) 網址。');
      entry.source_url = values.sourceUrl.trim();
    }
  }
  if (!isValidEntry(entry, categories)) throw new Error('內容格式不完整，請檢查表單。');
  return entry;
}

export function prepareAddition(manifest, items, entry) {
  if (!isValidEntry(entry, manifest.categories.map(category => category.id))) throw new Error('內容格式不完整。');
  validateTitle(entry.title);
  const path = `content/${entry.title}.json`;
  const normalize = value => value.normalize('NFC').toLocaleLowerCase('en-US');
  const previous = items.find(item => item.id === entry.id);
  // 同一次送出在網路中斷後重試，先辨識已完成的儲存，避免重複卡片。
  if (previous && JSON.stringify(previous) === JSON.stringify(entry)) return { alreadySaved: true, path };
  if (previous) throw new Error('這筆內容的識別碼已存在，請重新載入管理頁。');
  if (manifest.files.some(file => normalize(file) === normalize(path))) throw new Error('已有同名主題，請使用不同的標題，避免覆蓋原有內容。');
  return { alreadySaved: false, path, manifest: { ...manifest, files: [...manifest.files, path] } };
}
