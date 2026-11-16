# 作業標準與驗收紀錄（2026-11-16）

專案名稱：**什麼都想學億點**。原有公開首頁與 GitHub 儲存庫已確認可讀取。本次新增的管理功能已在本機通過驗證，尚未上傳，不能視為管理頁已在線上啟用。

## 管理頁新增驗收（2026-11-16）

- 已確認 [Repository](https://github.com/nycu-mg14-tc/MoreAndLittle) 存在，擁有者為 `nycu-mg14-tc`、預設分支 `main`、已啟用 Pages；[公開首頁](https://nycu-mg14-tc.github.io/MoreAndLittle/) 回傳 HTTP 200。
- 新增 `admin.html`、`assets/css/admin.css`、`assets/js/admin.js`、`assets/js/admin-model.js`、`assets/js/github-admin.js`、`data/admin.json`、`ADMIN_GUIDE.md` 與 `scripts/admin_test.mjs`；首頁與文章頁增加管理入口，規範及 CI 同步更新。
- `node scripts/admin_test.mjs` 通過：表單必填欄位、中文字元、檔名限制、非法網址、拒絕非擁有者／無效金鑰、拒絕未登記內容、同一提交寫入兩檔、保留舊目錄、禁止強制更新、衝突拒絕、斷線重試不重複、登出後禁止發布。
- Edge 實際執行管理頁，攔截 GitHub 網路請求並提供模擬回應（不使用真實金鑰、不寫入遠端）：錯誤帳號拒絕、成功解鎖、輸入欄清除金鑰、localStorage/sessionStorage 未儲存資料、文章／連結表單切換、即時預覽、發布衝突保留表單、成功提示、已儲存但回應中斷後重試不重複、登出再登入皆通過。
- 管理頁在 1440／768／390／320 px 寬度無水平溢出；已檢視手機截圖。公開首頁仍顯示 8 筆內容，管理入口正確。
- Critic 檢查修正瀏覽器 `fetch` 的呼叫綁定，以及儲存後再次登入時表單停用狀態；修正後重新驗證通過。
- `python -X utf8 scripts/validate_content.py` 與 `node scripts/smoke_test.mjs` 仍通過。
- 尚未用真實管理金鑰執行寫入／Pages 部署；讀取公開儲存庫成功，但上傳權限預檢因本機沒有 GitHub 登入而失敗。因此這次更新尚未推送，線上管理頁仍待部署。

以下保留原有網站的驗收項目。

## 作業要求對照

| 要求 | 檢查結果 |
| --- | --- |
| 自訂小專案與名稱 | 個人知識庫；站名、首頁、詳情頁、目錄與繳交範本已統一改名 |
| 完整的 AGENTS.md | 已涵蓋目的、風格、結構、資料規格、命名、AI 擴充步驟、驗證與部署規則 |
| 簡約淡綠／淡藍風格 | 採淡綠背景、白色卡片，移除大型幾何裝飾並加深次要文字 |
| 上方名稱、中間篩選、下方預覽 | 首頁結構符合；分類、標籤、搜尋及排序可操作 |
| 每筆有主題、標籤、網址或文字 | 8 筆有效內容：6 篇文字文章、2 筆外部資源；均有摘要與分類 |
| 主題名.檔案類型 | 每筆為 `content/<title>.json`，檔名與標題一致，均已登記目錄 |
| 預覽與跳轉 | 所有卡片可渲染，6 篇文章及返回連結已測；外部連結屬性及資源詳情頁已測 |
| 持續新增內容 | 共用文章頁、JSON 範本與中央目錄；已修正測試寫死 8 筆資料的限制 |
| GitHub Repository | `nycu-mg14-tc/MoreAndLittle` 已確認存在；本機資料夾仍未初始化 Git |
| 公開可瀏覽網頁 | 原有公開首頁 HTTP 200；本次新增管理功能尚未推送 |

## 本次修改

- `AGENTS.md`：改名，明訂淡綠底色、小型裝飾及不固定正式內容筆數的測試規則。
- `README.md`、`SUBMISSION_TEMPLATE.md`：同步名稱、專案風格與交付狀態。
- `index.html`、`entry.html`：同步頁面標題、品牌、描述、頁尾及瀏覽器主題色；首頁以站名為主標題並移除大型裝飾。
- `data/catalog.json`、`assets/js/entry.js`：同步站名與文章分頁標題。
- `assets/css/style.css`：淡綠底色、精簡首頁、長站名換行、較清楚的文字與搜尋焦點。
- `scripts/smoke_test.mjs`：正式資料以目錄筆數驗證；篩選預期值採獨立測試資料，新增文章不再因筆數改變而失敗。
- `VALIDATION_REPORT.md`：以本次實際檢查結果更新，區分本機驗證與公開部署。

既有 8 筆內容、內容 ID、檔名與相對網址皆保留，未新增套件、後端或建置程序。

## 實際執行的檢查

1. `python -X utf8 scripts/validate_content.py`：通過；8 筆內容、4 個分類，檔名、登記、必填內容、日期與網址格式有效。`-X utf8` 用於 Windows 終端輸出。
2. `node scripts/smoke_test.mjs`：通過；真實資料載入、分類、標籤、三者交集、標題／摘要／分類／標籤搜尋、英文大小寫、空結果、排序與網址安全性。
3. Edge 無頭瀏覽器實測：以臨時 Node HTTP 伺服器及 DevTools Protocol 驗收實際頁面，從 `/knowledge-atlas/` 子路徑載入，未使用靜態 HTML 模擬取代 JavaScript 執行。

| 瀏覽器檢查 | 結果 |
| --- | --- |
| 1440、768、390、320 px 視窗 | 8 張卡片、站名正確、首頁無水平溢出；已檢視桌機及手機截圖 |
| 分類 → Git 標籤 → `gItHuB PaGeS` 搜尋 | 依交集顯示，變更排序保留條件 |
| 不存在的字串 | 顯示空狀態；「清除篩選」恢復所有卡片 |
| 逐一點擊 6 篇文章 | 標題、節數、分頁名稱正確，窄螢幕無水平溢出，返回列表可用 |
| 2 筆外部卡片 | 網址正確，具備 `_blank` 與 `noopener noreferrer`；資源詳情頁可顯示按鈕 |
| 缺少 ID／不存在的 ID | 顯示明確錯誤 |
| 模擬單篇 404／目錄 404 | 部分失敗時其餘 7 筆仍顯示並有提醒；目錄失敗時顯示載入錯誤 |
| JavaScript 與子路徑 | 未發現未處理的頁面例外；CSS、ES modules、目錄與中文內容檔可載入 |

另透過網頁工具讀取既有來源，下列 3 個頁面皆可取得內容：

- [MDN 前端學習資源](https://developer.mozilla.org/zh-TW/docs/Learn_web_development)
- [GitHub Pages 官方說明](https://docs.github.com/en/pages)
- [What is GitHub?](https://docs.github.com/en/get-started/start-your-journey/what-is-github)

## Reflection → 實作 → Critic → 修訂

- Reflection：保留既有 JSON 與共用文章頁架構，對照作業中的名稱、配色、預覽與擴充要求。
- 實作：統一名稱、調整底色與首頁，移除正式內容固定筆數的測試限制。
- Critic：檢查長站名在窄視窗的排列、較淡的次要文字，以及真實 HTTP 載入與錯誤狀態。
- 修訂與驗證：允許頁首換行、加深次要資訊及搜尋焦點，再執行瀏覽器回歸驗收。

## 尚待完成與驗證範圍

- 已取得實際 Repository／GitHub Pages 網址並確認公開首頁；尚未驗證本次更新的 GitHub Actions 或管理頁部署結果。
- 本機子路徑驗收不代表新增管理功能已部署。更新發布後，仍需用自己的金鑰實測新增及首頁出現卡片。
- 外站已由網頁工具讀取；瀏覽器測試檢查外部連結屬性，未實際點擊外站並驗證新分頁內容。
- 手機測試使用瀏覽器視窗模擬，未在實體手機驗證；未進行完整輔助科技稽核。

繳交前請依 README 上傳完整專案並啟用 GitHub Pages，再將實際 Repository、網站與 AGENTS.md 連結填入 `SUBMISSION_TEMPLATE.md`。
