import React, { useRef, useState, useEffect } from 'react'; // useState kept for user management state
import { AppData, AppUser } from '../types';
import { listUsers, addUser, deleteUser, updateUser } from '../services/supabaseService';

interface SettingsViewProps {
    onOpenApiKeyModal: () => void;
    onExportAll: () => void;
    onImportAll: (data: Partial<AppData>) => void;
    onReset: () => void;
    currentUser: AppUser | null;
    onLogout: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
    onOpenApiKeyModal,
    onExportAll,
    onImportAll,
    onReset,
    currentUser,
    onLogout
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConfirmingReset, setIsConfirmingReset] = useState(false);
    const [isConfirmingClearCache, setIsConfirmingClearCache] = useState(false);
    const resetTimeoutRef = useRef<number | null>(null);
    const clearCacheTimeoutRef = useRef<number | null>(null);

    const [users, setUsers] = useState<AppUser[]>([]);
    const [newUserCode, setNewUserCode] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [userError, setUserError] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<{ oldCode: string; code: string; name: string } | null>(null);

    useEffect(() => {
        listUsers().then(setUsers).catch(() => setUsers([]));
    }, []);

    const handleAddUser = async () => {
        setUserError(null);
        if (!newUserCode.trim() || !newUserName.trim()) {
            setUserError('請填寫代碼與名稱');
            return;
        }
        try {
            await addUser(newUserCode.trim(), newUserName.trim());
            setUsers(await listUsers());
            setNewUserCode('');
            setNewUserName('');
        } catch (e: any) {
            setUserError(e?.message || '新增失敗');
        }
    };

    const handleDeleteUser = async (code: string) => {
        if (!confirm(`確定刪除使用者 ${code}？`)) return;
        try {
            await deleteUser(code);
            setUsers(await listUsers());
        } catch (e) {
            alert('刪除失敗');
        }
    };

    const handleStartEdit = (u: AppUser) => {
        setEditingUser({ oldCode: u.code, code: u.code, name: u.name });
        setUserError(null);
    };

    const handleConfirmEdit = async () => {
        if (!editingUser) return;
        const { oldCode, code, name } = editingUser;
        if (!code.trim() || !name.trim()) { setUserError('代碼與名稱不能為空'); return; }
        const duplicate = users.find(u => u.code === code.trim() && u.code !== oldCode);
        if (duplicate) { setUserError(`代碼「${code}」已被「${duplicate.name}」使用`); return; }
        try {
            await updateUser(oldCode, code.trim(), name.trim());
            setUsers(await listUsers());
            setEditingUser(null);
            setUserError(null);
        } catch (e: any) {
            setUserError(e?.message || '更新失敗');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File content is not a string.");
                const data = JSON.parse(text);
                onImportAll(data);
            } catch (error) {
                console.error("Error parsing imported file:", error);
                alert("匯入失敗：無法解析 JSON 檔案或檔案格式不符。");
            }
        };
        reader.readAsText(file);

        if (event.target) {
            event.target.value = '';
        }
    };

    const handleResetClick = () => {
        if (resetTimeoutRef.current) {
            clearTimeout(resetTimeoutRef.current);
            resetTimeoutRef.current = null;
        }

        if (isConfirmingReset) {
            onReset();
            setIsConfirmingReset(false);
        } else {
            setIsConfirmingReset(true);
            resetTimeoutRef.current = window.setTimeout(() => {
                setIsConfirmingReset(false);
            }, 3000);
        }
    };

    const handleClearCacheClick = () => {
        if (clearCacheTimeoutRef.current) {
            clearTimeout(clearCacheTimeoutRef.current);
            clearCacheTimeoutRef.current = null;
        }

        if (isConfirmingClearCache) {
            try {
                // Only remove the app's local backup cache (keeps AI provider settings, etc.)
                localStorage.removeItem('characterMapData');
                alert('✅ 已清除本地快取（characterMapData）。\n\n頁面即將重新整理。');
                window.location.reload();
            } catch (e) {
                console.error('Failed to clear cache:', e);
                alert('❌ 清除快取失敗，請打開 F12 Console 查看錯誤。');
            } finally {
                setIsConfirmingClearCache(false);
            }
        } else {
            setIsConfirmingClearCache(true);
            clearCacheTimeoutRef.current = window.setTimeout(() => {
                setIsConfirmingClearCache(false);
            }, 3000);
        }
    };


    return (
        <div className="h-full w-full bg-gray-900 flex flex-col p-8 overflow-y-auto">
            <h1 className="text-3xl font-bold text-white mb-8">設定</h1>
            <div className="mb-4 text-xs text-gray-500 font-mono">Version 0.2.0</div>

            <div className="space-y-8 max-w-2xl">
                {/* AI Settings */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                    <h2 className="text-xl font-semibold mb-3 text-indigo-400">AI 設定 (暫時無法使用)</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        設定用於批次新增角色與關係的 AI 提供商。
                    </p>
                    <button
                        onClick={onOpenApiKeyModal}
                        disabled={true}
                        className="px-6 py-2 bg-indigo-600/50 cursor-not-allowed rounded-md font-semibold transition-colors duration-200 text-white/50"
                    >
                        設定 AI 提供商與 API Key
                    </button>
                </div>

                {/* Data Management */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                    <h2 className="text-xl font-semibold mb-1 text-indigo-400">資料管理</h2>
                    <p className="text-sm text-gray-400 mb-5">
                        將全部資料（角色、關係、圖片、Tag、名詞）匯出為一個 JSON 備份檔，或從備份檔還原。
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={onExportAll}
                            className="flex flex-col items-center gap-2 px-4 py-5 bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-indigo-500 rounded-xl font-semibold transition-all duration-200 group"
                        >
                            <span className="text-2xl">⬆️</span>
                            <span className="text-sm text-gray-200 group-hover:text-white">匯出備份</span>
                            <span className="text-xs text-gray-500">下載 JSON 備份檔</span>
                        </button>
                        <button
                            onClick={handleImportClick}
                            className="flex flex-col items-center gap-2 px-4 py-5 bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-indigo-500 rounded-xl font-semibold transition-all duration-200 group"
                        >
                            <span className="text-2xl">⬇️</span>
                            <span className="text-sm text-gray-200 group-hover:text-white">匯入還原</span>
                            <span className="text-xs text-gray-500">從 JSON 備份檔還原</span>
                        </button>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".json,application/json"
                        style={{ display: 'none' }}
                    />
                </div>

                {/* Current User & Logout */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                    <h2 className="text-xl font-semibold mb-3 text-indigo-400">目前登入</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        {currentUser ? `${currentUser.name}（${currentUser.code}）` : '未登入'}
                    </p>
                    {currentUser && (
                        <button
                            onClick={onLogout}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors duration-200"
                        >
                            登出
                        </button>
                    )}
                </div>

                {/* User Management - 僅管理員可見 */}
                {currentUser?.code === '01069' && <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                    <h2 className="text-xl font-semibold mb-3 text-indigo-400">使用者管理</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        新增使用者代碼與名稱，供編輯時登入使用。
                    </p>
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2 items-end">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">代碼</label>
                                <input
                                    type="text"
                                    value={newUserCode}
                                    onChange={(e) => setNewUserCode(e.target.value)}
                                    placeholder="01069"
                                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md w-24"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">名稱</label>
                                <input
                                    type="text"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    placeholder="阿月"
                                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md w-32"
                                />
                            </div>
                            <button
                                onClick={handleAddUser}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold"
                            >
                                新增使用者
                            </button>
                        </div>
                        {userError && <p className="text-red-400 text-sm">{userError}</p>}
                        <div className="border border-gray-600 rounded-md overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-700/50">
                                        <th className="px-4 py-2 text-left">代碼</th>
                                        <th className="px-4 py-2 text-left">名稱</th>
                                        <th className="px-4 py-2 w-20"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => {
                                        const isEditing = editingUser?.oldCode === u.code;
                                        return (
                                            <tr key={u.code} className="border-t border-gray-600">
                                                {isEditing ? (
                                                    <>
                                                        <td className="px-3 py-1.5">
                                                            <input
                                                                value={editingUser.code}
                                                                onChange={e => setEditingUser(v => v ? { ...v, code: e.target.value } : v)}
                                                                className="w-full font-mono text-sm px-2 py-1 bg-gray-900 border border-indigo-500 rounded focus:outline-none"
                                                                placeholder="代碼"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-1.5">
                                                            <input
                                                                value={editingUser.name}
                                                                onChange={e => setEditingUser(v => v ? { ...v, name: e.target.value } : v)}
                                                                className="w-full text-sm px-2 py-1 bg-gray-900 border border-indigo-500 rounded focus:outline-none"
                                                                placeholder="名稱"
                                                                onKeyDown={e => e.key === 'Enter' && handleConfirmEdit()}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-1.5 flex gap-2 items-center">
                                                            <button
                                                                onClick={handleConfirmEdit}
                                                                className="text-green-400 hover:text-green-300 text-xs font-bold"
                                                                title="確認"
                                                            >✓ 確認</button>
                                                            <button
                                                                onClick={() => { setEditingUser(null); setUserError(null); }}
                                                                className="text-gray-400 hover:text-gray-200 text-xs"
                                                                title="取消"
                                                            >✕</button>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-4 py-2 font-mono">{u.code}</td>
                                                        <td className="px-4 py-2">{u.name}</td>
                                                        <td className="px-4 py-2">
                                                            <div className="flex gap-3">
                                                                <button
                                                                    onClick={() => handleStartEdit(u)}
                                                                    className="text-indigo-400 hover:underline text-xs"
                                                                >
                                                                    編輯
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteUser(u.code)}
                                                                    className="text-red-400 hover:underline text-xs"
                                                                >
                                                                    刪除
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-6 text-gray-500 text-center">
                                                尚無使用者，請先在 Supabase SQL Editor 執行 scripts/create_users_table.sql 建立表後，再新增使用者。
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>}

                {/* Local Cache */}
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
                    <h2 className="text-xl font-semibold mb-3 text-indigo-400">本地快取</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        如果本地端出現「同名角色重複」或資料看起來怪怪的，通常是瀏覽器 localStorage 殘留造成。
                        這個按鈕只會清除本工具的備份快取（<span className="font-mono">characterMapData</span>），不會動到專案檔。
                    </p>
                    <button
                        onClick={handleClearCacheClick}
                        className={`px-6 py-2 text-white rounded-md font-semibold transition-all duration-200 ${isConfirmingClearCache
                            ? 'bg-amber-700 hover:bg-amber-800 ring-2 ring-amber-300'
                            : 'bg-amber-600 hover:bg-amber-700'
                            }`}
                    >
                        {isConfirmingClearCache ? '確定清除本地快取？' : '清除本地快取（修復殘留）'}
                    </button>
                </div>

                {/* Reset Data - 僅管理員可見 */}
                {currentUser?.code === '01069' && <div className="bg-red-900/30 p-6 rounded-lg shadow-lg border border-red-500/50">
                    <h2 className="text-xl font-semibold mb-3 text-red-400">危險區域</h2>
                    <p className="text-sm text-red-300/80 mb-4">
                        重設應用程式將會永久刪除所有角色、關係、圖片和標籤資料。此操作無法復原。
                    </p>
                    <button
                        onClick={handleResetClick}
                        className={`px-6 py-2 text-white rounded-md font-semibold transition-all duration-200 ${isConfirmingReset
                            ? 'bg-red-700 hover:bg-red-800 ring-2 ring-red-400'
                            : 'bg-red-600 hover:bg-red-700'
                            }`}
                    >
                        {isConfirmingReset ? '確定要重設？' : '重設所有資料'}
                    </button>
                </div>}
            </div>
        </div>
    );
};

export default SettingsView;
