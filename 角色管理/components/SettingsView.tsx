import React, { useRef, useState } from 'react';
import { AppData } from '../types';

interface SettingsViewProps {
    onOpenApiKeyModal: () => void;
    onExportCharacters: () => void;
    onImportCharacters: (data: Partial<AppData>) => void;
    onExportTags: () => void;
    onImportTags: (data: Partial<AppData>) => void;
    onReset: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
    onOpenApiKeyModal,
    onExportCharacters,
    onImportCharacters,
    onExportTags,
    onImportTags,
    onReset
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importType, setImportType] = useState<'characters' | 'tags' | null>(null);
    const [isConfirmingReset, setIsConfirmingReset] = useState(false);
    const [isConfirmingClearCache, setIsConfirmingClearCache] = useState(false);
    const resetTimeoutRef = useRef<number | null>(null);
    const clearCacheTimeoutRef = useRef<number | null>(null);

    const handleImportClick = (type: 'characters' | 'tags') => {
        setImportType(type);
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !importType) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File content is not a string.");
                const data = JSON.parse(text);

                if (importType === 'characters') {
                    onImportCharacters(data);
                } else if (importType === 'tags') {
                    onImportTags(data);
                }
            } catch (error) {
                console.error("Error parsing imported file:", error);
                alert("匯入失敗：無法解析 JSON 檔案或檔案格式不符。");
            } finally {
                setImportType(null);
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
            <div className="mb-4 text-xs text-gray-500 font-mono">Version 0.1.0</div>

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
                    <h2 className="text-xl font-semibold mb-3 text-indigo-400">資料管理</h2>
                    <p className="text-sm text-gray-400 mb-4">
                        分別匯出／匯入您的「角色、關係、圖片」資料或「Tag 設定」。
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={onExportCharacters}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors duration-200"
                        >
                            匯出角色與關係檔
                        </button>
                        <button
                            onClick={() => handleImportClick('characters')}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors duration-200"
                        >
                            匯入角色與關係檔
                        </button>
                        <button
                            onClick={onExportTags}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors duration-200"
                        >
                            匯出 Tag 設定檔
                        </button>
                        <button
                            onClick={() => handleImportClick('tags')}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors duration-200"
                        >
                            匯入 Tag 設定檔
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".json,application/json"
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

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

                {/* Reset Data */}
                <div className="bg-red-900/30 p-6 rounded-lg shadow-lg border border-red-500/50">
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
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
