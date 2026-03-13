# CR 角色管理系統 — 維護指南 MEMO

> 這份文件記錄了「如何同步資料到 Supabase 並部署到 GitHub Pages」的完整流程。
> 每次換聊天室視窗前請確認 AI 已閱讀此文件。

---

## 🔧 專案基本資訊

| 項目 | 內容 |
|------|------|
| 專案路徑 | `C:\Users\Auer0960\CR\角色管理` |
| Supabase URL | `https://haptiezxyvrxhrcoputp.supabase.co` |
| Supabase Key | `sb_publishable_xz530eC3bqr7bhvH3Dz8Ug_SOHZeS4_` |
| Supabase 資料表 | `app_data`（單一資料表，key='main'，欄位 `data` 存 JSON） |
| GitHub Pages 部署分支 | `deploy` |
| 角色資料路徑（Supabase） | `app_data.data.characters`（Array） |
| 腳本資料夾 | `C:\Users\Auer0960\CR\角色管理\scripts\` |

---

## 📦 Supabase 資料結構

```
app_data 資料表
└── key: 'main'
    └── data: {
          characters: [ ...Character[] ],
          tagCategories: [ ...TagCategory[] ],
          relationships: [ ...Relationship[] ],
          glossaryTerms: [ ...GlossaryTerm[] ],
          users: [ ...AppUser[] ]
        }
```

---

## 🚀 部署流程（Build + 推送 GitHub Pages）

```powershell
# 在 scripts 資料夾或專案根目錄執行：
npm run build
npm run deploy
```

- `npm run build` → 產出 `dist/` 資料夾
- `npm run deploy` → 執行 `gh-pages -d dist -b deploy`，推送到 GitHub 的 `deploy` 分支

---

## 📜 Supabase 同步腳本說明

> **重要**：因為路徑包含中文，腳本**不能**直接用 `working_directory` 參數指定路徑。
> 需要把腳本寫到 `C:\Users\Auer0960\sync_xxx_tmp.mjs`（無中文路徑）後執行。
> 腳本使用 Node.js 原生 `fetch`，**不需要安裝任何 npm 套件**。

### 執行方式（PowerShell）

```powershell
node C:\Users\Auer0960\sync_xxx_tmp.mjs
```

### Supabase REST API 呼叫模板

```javascript
const SUPABASE_URL = 'https://haptiezxyvrxhrcoputp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xz530eC3bqr7bhvH3Dz8Ug_SOHZeS4_';
const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

// 讀取
const res = await fetch(`${SUPABASE_URL}/rest/v1/app_data?key=eq.main&select=data`, { headers });
const rows = await res.json();
const appData = rows[0].data;
const characters = appData.characters; // Array

// 修改 characters ...

// 寫回
await fetch(`${SUPABASE_URL}/rest/v1/app_data?key=eq.main`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({ data: appData, updated_at: new Date().toISOString() })
});
```

---

## 📋 現有同步腳本清單

### 1. `scripts/sync_codes_to_supabase.mjs`
- **用途**：將 `CR角色列表.txt` 的角色編號（cr001 等）批次填入 Supabase `characters[].characterCode`
- **使用 supabase-js**（需在 `角色管理` 目錄下執行）
- 角色列表來源：`C:/Users/Auer0960/Desktop/專區/CR專案/文件/CursorAI_CR專用/CR母專案劇情資料/world_settings/CR角色列表.txt`

### 2. `C:\Users\Auer0960\sync_intro_tmp.mjs`（臨時腳本）
- **用途**：將各角色 `人物設定.md` 的「一語介紹」填入 Supabase `characters[].introduction`
- **使用原生 fetch**（可在任意位置執行）
- 角色設定檔來源：`C:/Users/Auer0960/Desktop/專區/CR專案/文件/CursorAI_CR專用/CR母專案劇情資料/character/[角色名]/[角色名]人物設定.md`
- 比對方式：完整名稱 → 去除分隔符號 → 前綴比對

### 3. `scripts/add_zodiac_tags.mjs`
- **用途**：確保 Supabase `tagCategories` 中存在「星座」分類，並補上 12 星座 TAG（selectionMode='single'）

---

## 🏗 Character 資料結構（types.ts）

```typescript
interface Character {
  id: string;
  name: string;
  characterCode?: string;   // 角色編號，如 cr031
  birthday?: string;        // 生日，格式 MM/DD，如 04/15 或 0415
  title?: string;           // 稱號
  height?: string;          // 身高，如 175cm
  weight?: string;          // 體重，如 65kg
  bust?: string;            // 胸圍，如 88cm
  introduction?: string;    // 一語介紹（單行短句，從人物設定.md 的「一語介紹」欄位取得）
  notes: string;
  tagIds: string[];
  image?: string;
  avatarPosition?: { x: number; y: number };
  profileFields?: ProfileField[];
  modLog?: ModLogEntry[];
}
```

---

## 🤖 GitHub Actions 自動部署

設定檔位置：`C:\Users\Auer0960\CR\.github\workflows\deploy.yml`

**觸發條件**：push 到 `main` 分支時自動執行 build + deploy

**首次啟用需要**：在 GitHub 倉庫設定 Secrets（Settings → Secrets → Actions）：
| Secret 名稱 | 值 |
|---|---|
| `VITE_SUPABASE_URL` | `https://haptiezxyvrxhrcoputp.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_xz530eC3bqr7bhvH3Dz8Ug_SOHZeS4_` |

設定完成後，日常流程只需要：
```
git add . → git commit → git push
```
GitHub 自動 build + 部署，完全不需要手動執行 `npm run deploy`。

---

## ⚡ 什麼時候需要手動執行 Supabase 同步？

> AI 在以下情況應主動提醒使用者手動執行腳本。

| 情況 | 需要手動的原因 | 對應腳本 |
|------|------|------|
| **新增角色欄位**（如 `introduction`、`birthday`）且需要批次填入現有資料 | 欄位加到 code 是自動部署的，但「填值」進資料庫要手動跑腳本 | 寫新腳本到 `C:\Users\Auer0960\xxx_tmp.mjs` |
| **新增/修改 Tag 分類**（如新增星座分類） | Tag 資料存在 Supabase，改 code 不會動到資料 | `scripts/add_zodiac_tags.mjs` |
| **批次更新角色編號**（characterCode） | 編號來自 `CR角色列表.txt`，需腳本比對填入 | `scripts/sync_codes_to_supabase.mjs` |
| **批次更新一語介紹**（introduction） | 來自 `人物設定.md`，需腳本比對填入 | `C:\Users\Auer0960\sync_intro_tmp.mjs` |
| **新增角色欄位但只是 UI 顯示**（使用者自己手動填） | 只需部署 code，不需要腳本 | 無 |
| **修改資料表結構**（如新增 Supabase 欄位） | 需直接在 Supabase 後台或用 SQL 執行 | Supabase 後台 |

### 判斷原則
```
問自己：「這個資料是 code 決定的，還是要往資料庫裡填的？」
→ code 決定（UI、功能邏輯）  → push 就好，自動部署
→ 需要填入資料庫              → 需要手動執行同步腳本
```

---

## 🛠 常見維護任務 SOP

### A. 新增角色欄位（如 introduction）

1. 在 `types.ts` 的 `Character` interface 加入新欄位（`optional`）
2. 在 `CharacterEditorModal.tsx` 的「一般資料」tab 加入對應輸入框
3. 若需批次填入資料 → 寫臨時腳本到 `C:\Users\Auer0960\` 再執行
4. `npm run build && npm run deploy`

### B. 更新 Supabase 資料（批次）

1. 寫腳本（使用原生 fetch，不 import 任何套件）
2. 儲存到 `C:\Users\Auer0960\xxx_tmp.mjs`
3. 執行：`node C:\Users\Auer0960\xxx_tmp.mjs`
4. 確認 console 輸出無誤

### C. 完整重新部署

```powershell
npm run build
npm run deploy
```

---

## ⚠️ 注意事項

1. **中文路徑問題**：Shell 工具指定 `working_directory` 包含中文時會亂碼失敗。解法是把腳本放到純英文路徑執行。
2. **腳本 import 問題**：放在 `角色管理` 目錄外的腳本找不到 `node_modules`，必須使用原生 `fetch` 而非 `@supabase/supabase-js`。
3. **資料備份**：修改 Supabase 前若不確定，可先把 `appData` 寫到本地 JSON 檔備份。
4. **未匹配角色**：「卡緹亞」和「李沐」目前沒有對應的人物設定.md，introduction 需手動填入。

---

*最後更新：2026-03-13*
