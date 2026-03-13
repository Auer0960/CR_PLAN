-- 在 Supabase SQL Editor 執行此檔案
-- 建立使用者表，供「使用者代碼登入」功能使用

CREATE TABLE IF NOT EXISTS users (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
