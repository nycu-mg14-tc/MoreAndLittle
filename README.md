# 什麼都想學億點

一個以 `AGENTS.md` 為開發規範的可持續擴充個人知識庫。可分類、標籤篩選、搜尋、排序、預覽文章與前往外部資源。使用原生 HTML、CSS、JavaScript 和 JSON，不需要資料庫或套件安裝。

網站採淡綠底色、白色知識卡片與小型圖示，依「站名與簡介 → 分類／標籤篩選 → 知識預覽」排列。網站顯示名稱為「什麼都想學億點」，專案資料夾與建議 Repository 名稱保留 `knowledge-atlas`。


## 已實作

- 主題分類與標籤單選篩選、關鍵字搜尋（交集篩選）
- 最新更新／名稱排序
- 卡片預覽：主題、分類、摘要、標籤、日期
- 站內完整文章、外部網站的新分頁跳轉、找不到內容時的錯誤提示
- 桌機／手機響應式版型、鍵盤焦點與空結果提示
- 每篇獨立 JSON 檔案、中央目錄與標準內容檢查腳本
- 8 筆示例內容（6 篇文字知識、2 筆外部網站資源）

## 本機開啟

先解壓縮專案。電腦需有 Python 3（不需要額外套件）：

```bash
cd knowledge-atlas
python scripts/validate_content.py
python -m http.server 8000
```

在瀏覽器開啟 <http://localhost:8000/>。macOS/Linux 若 `python` 不存在，可用 `python3`。

如果電腦有 Node.js 20 以上版本，也可執行 `node scripts/smoke_test.mjs` 檢查 JS 資料載入與篩選邏輯。GitHub 上的 `.github/workflows/validate.yml` 會在提交後自動執行資料檢查。

**注意**：請不要直接以 `file://` 雙擊開啟 `index.html`。因瀏覽器對本機 JSON 請求的安全限制，可能導致內容清單載入失敗。

## AI 如何新增內容

1. 先讀 `AGENTS.md`。
2. 複製 `templates/內容範本.json`，建立 `content/<主題名稱>.json`，檔名需與 JSON 內的 `title` 完全相同。
3. 填入不重複的 `id`、分類、標籤、摘要與有意義的文章內文（或改用 `kind: "link"` 填入有效 URL）。
4. 將新檔案相對路徑登記到 `data/catalog.json` 的 `files`。
5. 執行 `python scripts/validate_content.py` 並在瀏覽器檢查卡片、篩選和跳轉。

**為什麼需要編輯清單？** GitHub Pages 是靜態網站，瀏覽器不會自動列出 `content/` 資料夾所有檔案；必須透過清單告訴網站要載入哪些 JSON。

## 已知限制

- 外部網站只顯示人工撰寫的介紹文字，不擷取縮圖、不嵌入 iframe；某些網站限制嵌入，這種方式較穩定。
- 內容編輯需修改檔案並推送到 GitHub，不提供網站前台新增或儲存功能。
- 檢查腳本確認網址**格式**、內文與索引完整性；外部網站是否能連線仍需人工抽查。
