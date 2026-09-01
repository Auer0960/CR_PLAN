# Character Management App (角色管理)

用於管理角色資料、關係圖、時間軸與圖片的內部工具。正式資料存放在 **Supabase**（雲端資料庫 + Storage），不是本機檔案。

## 🚀 快速開始

### 1. 安裝依賴
```bash
npm install
```

### 2. 設定環境變數
複製 `.env.example` 為 `.env.local`，並向團隊成員索取實際的 Supabase 專案金鑰填入：

```env
VITE_SUPABASE_URL=你的 Supabase 專案 URL
VITE_SUPABASE_PUBLISHABLE_KEY=你的 Supabase Publishable Key
```

`.env.local` 已被 git 忽略，不會進版控，需要另外向團隊取得。

### 3. 啟動開發伺服器
```bash
npm run dev
```

啟動後會直接從 Supabase 讀寫資料；只有在 Supabase 尚未設定或第一次沒有資料時，才會 fallback 讀取 `public/cr_data.json`、`public/timeline_data.json` 這兩份初始種子資料。

### 4. 部署
```
git push main
```
GitHub Actions 會自動 build 並部署到 GitHub Pages，不需要手動執行 `npm run deploy`（僅在自動部署失效時才手動跑）。

## 📎 選用功能：稱呼查詢 / 稱呼表

側邊欄「稱呼查詢」功能會讀取母專案角色資料夾內的稱呼表 Markdown 檔，需要額外設定 `CHARACTERS_DIR`（見 `.env.example`）。若不需要這個功能可以略過。

## 💾 資料備份

Repo 根目錄 `backups/` 由 GitHub Actions 每日自動從 Supabase 下載 `app_data`（約保留 30 天，另有 `latest.json`）。  
詳見 `MEMO_維護指南.md`「每日自動備份」與「交接檢查清單」。

## 📄 其他文件

維護、部署細節、交接檢查清單請見 `MEMO_維護指南.md`。
