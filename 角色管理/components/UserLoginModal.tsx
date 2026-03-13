import React, { useState } from 'react';
import type { AppUser } from '../types';
import { getUserByCode, getUserByName, addUser } from '../services/supabaseService';

interface UserLoginModalProps {
  onLogin: (user: AppUser) => void;
}

function generateCode(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

const UserLoginModal: React.FC<UserLoginModalProps> = ({ onLogin }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // 登入
  const [loginCode, setLoginCode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // 註冊
  const [regName, setRegName] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegLoading, setIsRegLoading] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null); // 顯示產生的代碼

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginCode.trim()) { setLoginError('請輸入使用者代碼'); return; }
    setIsLoginLoading(true);
    try {
      const user = await getUserByCode(loginCode.trim());
      if (user) {
        onLogin(user);
      } else {
        setLoginError('代碼不存在，請確認後重試');
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : '登入失敗');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    const trimmedName = regName.trim();
    if (!trimmedName) { setRegError('請輸入您的名字'); return; }
    setIsRegLoading(true);
    try {
      const existing = await getUserByName(trimmedName);
      if (existing) {
        setRegError('這個名字已被使用，請換一個');
        setIsRegLoading(false);
        return;
      }
      const code = generateCode();
      await addUser(code, trimmedName);
      setNewCode(code);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : '註冊失敗');
    } finally {
      setIsRegLoading(false);
    }
  };

  const handleConfirmCode = () => {
    if (!newCode) return;
    onLogin({ code: newCode, name: regName.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">CR 角色管理</h2>

        {/* 分頁切換 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setTab('login'); setLoginError(null); }}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'login' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            登入
          </button>
          <button
            onClick={() => { setTab('register'); setRegError(null); setNewCode(null); }}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'register' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            初次使用
          </button>
        </div>

        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <p className="text-sm text-gray-400 mb-3">輸入您的使用者代碼。</p>
            <input
              type="text"
              value={loginCode}
              onChange={(e) => setLoginCode(e.target.value)}
              placeholder="例如：52391"
              className="w-full px-4 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none mb-4"
              autoFocus
              disabled={isLoginLoading}
            />
            {loginError && <p className="text-red-400 text-sm mb-4">{loginError}</p>}
            <button
              type="submit"
              disabled={isLoginLoading}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md font-semibold text-white transition-colors"
            >
              {isLoginLoading ? '驗證中…' : '登入'}
            </button>
          </form>
        )}

        {tab === 'register' && !newCode && (
          <form onSubmit={handleRegister}>
            <p className="text-sm text-gray-400 mb-3">
              輸入您的暱稱完成註冊，系統會產生一組<strong>專屬代碼</strong>，請務必記下來。
            </p>
            <input
              type="text"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="您的暱稱（例如：阿月）"
              maxLength={20}
              className="w-full px-4 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none mb-4"
              autoFocus
              disabled={isRegLoading}
            />
            {regError && <p className="text-red-400 text-sm mb-4">{regError}</p>}
            <button
              type="submit"
              disabled={isRegLoading}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-md font-semibold text-white transition-colors"
            >
              {isRegLoading ? '建立中…' : '完成註冊'}
            </button>
          </form>
        )}

        {tab === 'register' && newCode && (
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">您的專屬代碼已產生，請<strong>截圖或記下來</strong>，下次登入時需要用到。</p>
            <div className="bg-gray-900 rounded-lg py-4 px-6 my-4 font-mono text-3xl font-bold tracking-widest text-indigo-300 border border-indigo-700">
              {newCode}
            </div>
            <p className="text-xs text-gray-500 mb-4">這是 <span className="text-white">{regName.trim()}</span> 的代碼</p>
            <button
              onClick={handleConfirmCode}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold text-white transition-colors"
            >
              我已記下，進入系統
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserLoginModal;
