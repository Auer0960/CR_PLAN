# Character Management App (角色管理)

這是一個用於管理角色資料與關係圖的網頁應用程式。

## 🚀 快速開始 (Getting Started)

### 1. 安裝依賴 (Install Dependencies)
```bash
npm install
```

### 2. 設定角色資料路徑 (Configure Data Path)
本專案需要讀取您的角色 Markdown 檔案。

1. 複製範例設定檔：
   ```bash
   cp .env.example .env
   ```
   (或是手動建立一個 `.env` 檔案)

2. 編輯 `.env` 檔案，設定 `CHARACTERS_DIR`：

   **方式 A：相對路徑 (推薦 - 可攜帶)**
   如果您將角色資料資料夾放在專案目錄內 (例如 `characters` 資料夾)：
   ```env
   CHARACTERS_DIR=./characters
   ```

   **方式 B：絕對路徑**
   如果您想讀取電腦上其他位置的資料：
   ```env
   CHARACTERS_DIR=c:/Users/YourName/Desktop/MyProject/characters
   ```

   **方式 C：搭配 CursorAI_CR專用 (您的目前設定)**
   如果您將此專案放在 `CursorAI_CR專用` 資料夾下，與 `CR母專案劇情資料` 並列：
   ```env
   CHARACTERS_DIR=../CR母專案劇情資料/character
   ```

### 3. 啟動開發伺服器 (Start Dev Server)
```bash
npm run dev
```

### 4. 更新資料 (Update Data)
當您修改了 Markdown 檔案後，執行此腳本來更新網頁資料：
```bash
node scripts/extract_cr_data.js
```

## ⚠️ 注意事項
*   **`user_data.json`**：此檔案包含您的私人設定（如 Tag、自訂關聯），預設已被 git 忽略。
*   **`.env`**：此檔案包含您的本機路徑，預設已被 git 忽略。
