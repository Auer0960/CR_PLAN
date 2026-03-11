---
description: 從 Markdown 文件更新角色資料與關係圖
---

此流程將掃描來源目錄中的 Markdown 文件，提取角色資訊、圖片與關係，並更新應用程式的資料庫。

1. **(建議)** 請 AI 閱讀並檢查來源 Markdown 文件，確認是否有格式異常或需要手動調整的部分。
   > "請幫我檢查角色 Markdown 文件的關係描述格式是否正確。"

2. 執行資料提取腳本
// turbo
3. node scripts/extract_cr_data.js

4. **(建議)** 請 AI 驗證生成的資料是否正確。
   > "請檢查 cr_data.json 是否有異常的關係或角色。"

5. 完成！請刷新瀏覽器 (F5) 以查看更新。
