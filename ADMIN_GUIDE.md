# 用手機管理「什麼都想學億點」

這次更新上傳後，網站頁尾會出現「內容管理」。你可以直接填表新增卡片，不需要打程式碼。

## 第一次啟用

1. 將本次更新的專案檔案上傳到 [MoreAndLittle](https://github.com/nycu-mg14-tc/MoreAndLittle) 的 `main` 分支，保留既有內容；GitHub Pages 應使用 `main` 的根目錄。
2. 等待網站更新，從 [首頁](https://nycu-mg14-tc.github.io/MoreAndLittle/) 頁尾進入管理頁。部署完成後的管理路徑是 `/MoreAndLittle/admin.html`。
3. 登入自己的 GitHub，開啟 [建立 fine-grained token](https://github.com/settings/personal-access-tokens/new)。名稱可填「知識庫管理」，設定合理到期日。
4. Resource owner 選 `nycu-mg14-tc`；Repository access 選 **Only select repositories**，只勾選 **MoreAndLittle**。
5. Repository permissions 中 **Contents → Read and write**；Metadata 保留預設讀取，其餘不需開啟。
6. 產生後將金鑰存入自己的密碼管理工具，再貼到管理頁的「管理金鑰」。不需要傳給 AI，也不要把金鑰貼進 GitHub 檔案或 README。

預填專案來自 `data/admin.json`，內容只有公開的 Repository 名稱，沒有秘密資訊。

## 每次新增

1. 開啟網站 → 頁尾「內容管理」→ 貼上自己的金鑰 →「解鎖管理頁」。
2. 填主題名稱、分類、標籤與摘要。標籤用逗號分隔，可以填新標籤。
3. 選「文字筆記」時直接寫內文，空一行分段；選「收藏網站」時貼完整網址。
4. 查看卡片及內文預覽，按「儲存並發布卡片」。
5. 出現「已儲存到 GitHub」後，等待 GitHub Pages 更新。再開首頁或成功提示中的卡片連結。
6. 使用完按「登出管理」。重新整理或關閉頁面也會失去登入狀態。

識別碼、日期、JSON 檔案與目錄登記都會自動產生。既有內容不會因新增而被覆蓋。

## 「只有我可以」如何運作

管理頁的登入畫面可以被其他人開啟；未通過驗證時，不能使用新增表單。系統向 GitHub 確認金鑰屬於該個人儲存庫的擁有者，實際寫入由 GitHub 的權限系統允許或拒絕。

請讓儲存庫只有你具備寫入權限。如果另授予協作者寫入權限，他們仍可透過 GitHub 修改檔案；前端頁面無法撤銷那些權限。

金鑰只在當次頁面的記憶體中，用於向 `https://api.github.com` 發送授權請求；不寫進 localStorage、sessionStorage、網址或專案。只在自己的 HTTPS 網站或 localhost 輸入金鑰。公開筆記仍對所有讀者開放。

## 儲存失敗時

| 情況 | 處理方式 |
| --- | --- |
| 金鑰無效或過期 | 重新建立金鑰，登出後再輸入 |
| 權限不足 | 確認僅指定本專案且 Contents 為 Read and write；確認分支保護允許你直接提交 |
| 同名主題 | 換成更明確的標題，避免覆蓋舊卡片 |
| 其他裝置同時更新 | 再次送出，系統會先讀取最新分支；不會強制覆蓋 |
| 網路斷線 | 表單保留，可再次送出。同稿若已儲存，會提示成功且不重複新增 |
| 已儲存但首頁還看不到 | 等待 Pages 更新，查看 GitHub Actions 的部署狀態，再重新整理 |
| 目錄或內容檔案格式錯誤 | 先修復資料；管理頁不會忽略壞資料並覆蓋整份目錄 |

管理頁目前提供新增；編輯、刪除既有卡片與新增分類尚未提供。按下儲存前請保留重要文字備份；離開或重新整理可能丟失未儲存的稿件。

## 維護與驗證

執行 `python -X utf8 scripts/validate_content.py`、`node scripts/smoke_test.mjs`、`node scripts/admin_test.mjs`。管理測試使用虛構金鑰與模擬 API，不接觸真實 GitHub 資料。

管理頁用同一個 Git commit 同時寫入新內容與目錄，並以 `force: false` 更新分支。GitHub 的格式檢查工作流程會在提交後執行；Pages 發布仍採分支模式，測試工作流程並非發布的前置閘門。

技術參考：[GitHub 金鑰權限](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)、[Git trees API](https://docs.github.com/en/rest/git/trees)、[Git references API](https://docs.github.com/en/rest/git/refs)。
