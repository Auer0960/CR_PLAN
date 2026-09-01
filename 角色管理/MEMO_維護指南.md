# CR 角色管理系統 — 維護指南 MEMO

> 這份文件記錄如何維護「角色管理」App、同步資料到 Supabase，以及部署到 GitHub Pages。
> 正式資料在 **Supabase**，不是本機 JSON。

---

## 交接給 RD 的技術備忘

以下是 RD 接手時可能用得到、但文件 code 裡看不出來的資訊：

1. **`.env.local` 需要的值**（已被 git 忽略，不會隨 clone 帶過去，需另外取得）：  
   - `VITE_SUPABASE_URL`  
   - `VITE_SUPABASE_PUBLISHABLE_KEY`  
   （GitHub Actions 的 Secrets 已設定同一組值，Actions 部署不受影響）
2. **稱呼查詢 MCP**（選用）：[`角色管理/.cursor/mcp.json`](.cursor/mcp.json) 內的 `cwd` 目前寫死本機路徑，clone 到別台機器後要改成自己的實際路徑，Cursor 的 cr-address MCP 才會啟動。  
   - 網頁側邊欄「稱呼查詢」本身不受影響（走 Vite local API），與 MCP 是兩條線。
3. **Repo 結構**：唯一正式 App 目錄是根目錄下的 `角色管理/`。舊的重複快照（`角色管理 - 複製`、`角色管理_上傳版`）已從 git 移除。

---

## 專案基本資訊

| 項目 | 內容 |
|------|------|
| Repo | `Auer0960/CR_PLAN`（本機通常為 `...\CR\`） |
| App 目錄 | `角色管理/` |
| 線上 | `https://Auer0960.github.io/CR_PLAN/` |
| Supabase URL | 見 `.env.local` / GitHub Secrets（勿把 secret 寫進版控文件以外的聊天紀錄） |
| 主要資料表 | `app_data`（key=`main`，`data` 存整包 App JSON） |
| 時間軸資料表 | `timeline_data` |
| 使用者資料表 | `users`（見 `scripts/create_users_table.sql`） |
| 圖片 Storage | bucket `character-images` |
| 部署分支 | `deploy`（由 Actions 推送） |

環境變數請一律放在 `角色管理/.env.local`（參考 `.env.example`），不要把 publishable key 硬寫進原始碼。

---

## Supabase 資料結構

```
app_data 資料表
└── key: 'main'
    └── data: {
          characters: [ ...Character[] ],
          tagCategories: [ ...TagCategory[] ],
          relationships: [ ...Relationship[] ],
          characterImages: [ ... ],
          glossaryTerms: [ ...GlossaryTerm[] ],
          ...
        }
```

---

## 每日自動備份（`backups/`）

Repo 根目錄的 [`backups/`](../backups/) 由 GitHub Actions [`.github/workflows/backup.yml`](../.github/workflows/backup.yml) 維護：

- **排程**：每天 UTC 18:00（台灣時間約 02:00）；也可在 Actions 頁面手動 `workflow_dispatch`
- **內容**：從 Supabase 抓 `app_data`（key=`main`）存成 `backups/app_data_YYYY-MM-DD.json`
- **捷徑**：`backups/latest.json` 為最近一次成功備份
- **保留**：只留最近約 30 天；若角色數異常（0 或看起來像暫代資料）會跳過寫入
- **用途**：誤刪／壞資料時可對照還原到 Supabase（還原需人工用 REST / Dashboard，沒有一鍵還原腳本）

這不是 App runtime 會讀的檔案；單純是營運安全網。

---

## 部署流程

### 日常（推薦）

```
在 角色管理/ 改 code → git add / commit → git push origin main
```

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) 會在 `角色管理/` 執行 `npm ci` + `npm run build`，並把 `角色管理/dist` 推到 `deploy` 分支（GitHub Pages）。

### 手動備援（Actions 失效時）

```powershell
cd 角色管理
npm run build
npm run deploy
```

- `npm run build` → 產出 `dist/`
- `npm run deploy` → `gh-pages -d dist -b deploy`

---

## 批次改 Supabase 資料

舊的常駐批次腳本（角色編號、一語介紹、星座 Tag、名詞匯入）已刪除。  
若要批次改資料：在**無中文路徑**寫臨時 `.mjs`，用原生 `fetch` 打 REST API（不必裝 `@supabase/supabase-js`）。

```powershell
node C:\Users\你的帳號\sync_xxx_tmp.mjs
```

### REST 模板

```javascript
const SUPABASE_URL = process.env.VITE_SUPABASE_URL; // 或從 .env.local 複製
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

const res = await fetch(`${SUPABASE_URL}/rest/v1/app_data?key=eq.main&select=data`, { headers });
const rows = await res.json();
const appData = rows[0].data;

// 修改 appData ...

await fetch(`${SUPABASE_URL}/rest/v1/app_data?key=eq.main`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({ data: appData, updated_at: new Date().toISOString() })
});
```

### 什麼時候需要手動同步？

| 情況 | 做法 |
|------|------|
| 新增 UI 欄位且要批次填既有角色 | 寫臨時腳本，或網頁上手動填 |
| 批次改 Tag／編號／一語介紹／名詞 | 臨時腳本或網頁 |
| 只加 UI、由使用者自己填 | 只需 push code |
| 改資料表結構 | Supabase 後台 / SQL |

判斷原則：code 決定 UI → push 即可；要寫進資料庫 → 需手動批次或後台。

---

## Character 資料結構（types.ts）

```typescript
interface Character {
  id: string;
  name: string;
  characterCode?: string;   // 如 cr031
  birthday?: string;        // MM/DD
  title?: string;
  height?: string;
  weight?: string;
  bust?: string;
  introduction?: string;
  notes: string;
  tagIds: string[];
  image?: string;
  avatarPosition?: { x: number; y: number };
  profileFields?: ProfileField[];
  modLog?: ModLogEntry[];
}
```

---

## 常見維護任務 SOP

### A. 新增角色欄位

1. `types.ts` 的 `Character` 加 optional 欄位  
2. `CharacterEditorModal.tsx` 一般資料 tab 加輸入框  
3. 需要批次填值 → 臨時腳本  
4. `git push origin main`（Actions 部署）

### B. 使用者登入表

首次建表：在 Supabase SQL Editor 執行 `scripts/create_users_table.sql`，再於 App「設定」頁新增使用者。

### C. 稱呼查詢

- 網頁：側邊欄「稱呼查詢」→ 本機 Vite API 讀 `CHARACTERS_DIR` 下的稱呼表 Markdown  
- Cursor MCP：`npm run mcp:address` / `.cursor/mcp.json`（需改 `cwd`）

---

## 注意事項

1. **中文路徑**：自動化腳本若放在含中文的工作目錄外執行較穩；臨時腳本建議放純英文路徑。  
2. **目錄外腳本找不到 node_modules**：用原生 `fetch`，不要 `import @supabase/supabase-js`。  
3. **改資料前**：可先看 `backups/latest.json`，或自行再抓一份 JSON 備份。  
4. **種子檔**：`public/cr_data.json`、`public/timeline_data.json` 僅在 Supabase 空資料時 fallback，日常以雲端為準。

---

*最後更新：2026-09-01*
