import React, { useState, useEffect, useCallback } from 'react';
import { loadActivityLog, type ActivityLogEntry } from '../services/supabaseService';

const ACTION_STYLE: Record<string, string> = {
    '儲存資料':       'bg-blue-900/60 text-blue-300 border-blue-700',
    '刪除圖片':       'bg-red-900/60 text-red-300 border-red-700',
    '刪除圖片（失敗）': 'bg-orange-900/60 text-orange-300 border-orange-700',
    '刪除圖片（RLS 擋）': 'bg-orange-900/60 text-orange-300 border-orange-700',
};

const ACTION_DOT: Record<string, string> = {
    '儲存資料':       'bg-blue-400',
    '刪除圖片':       'bg-red-400',
    '刪除圖片（失敗）': 'bg-orange-400',
    '刪除圖片（RLS 擋）': 'bg-orange-400',
};

function formatDate(iso: string): string {
    try {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
        return iso;
    }
}

const ActivityLogView: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterUser, setFilterUser] = useState('');
    const [filterAction, setFilterAction] = useState('');

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await loadActivityLog(200);
            setLogs(data);
        } catch (e: any) {
            setError(e?.message || '無法載入紀錄');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const allUsers = Array.from(new Set(logs.map(l => l.user_name))).sort();
    const allActions = Array.from(new Set(logs.map(l => l.action))).sort();

    const filtered = logs.filter(l => {
        if (filterUser && l.user_name !== filterUser) return false;
        if (filterAction && l.action !== filterAction) return false;
        return true;
    });

    return (
        <div className="h-full flex flex-col bg-gray-900 text-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800 shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-white">操作紀錄</h1>
                    <p className="text-xs text-gray-400 mt-0.5">僅管理員可見・顯示最近 200 筆</p>
                </div>
                <button
                    onClick={fetchLogs}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-md text-white font-medium"
                >
                    {isLoading ? '載入中…' : '重新整理'}
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 px-6 py-3 border-b border-gray-700 bg-gray-800/50 shrink-0">
                <select
                    value={filterUser}
                    onChange={e => setFilterUser(e.target.value)}
                    className="px-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                    <option value="">全部使用者</option>
                    {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <select
                    value={filterAction}
                    onChange={e => setFilterAction(e.target.value)}
                    className="px-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                    <option value="">全部操作</option>
                    {allActions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <span className="ml-auto text-xs text-gray-500 self-center">
                    共 {filtered.length} 筆
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {isLoading && (
                    <div className="flex items-center justify-center h-32 text-gray-400">載入中…</div>
                )}
                {error && (
                    <div className="flex items-center justify-center h-32 text-red-400">
                        ⚠️ {error}
                    </div>
                )}
                {!isLoading && !error && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500 gap-2">
                        <span className="text-3xl">📋</span>
                        <span className="text-sm">沒有符合的紀錄</span>
                    </div>
                )}
                {!isLoading && !error && filtered.length > 0 && (
                    <div className="space-y-2">
                        {filtered.map(log => {
                            const badgeClass = ACTION_STYLE[log.action] ?? 'bg-gray-800 text-gray-300 border-gray-600';
                            const dotClass  = ACTION_DOT[log.action]   ?? 'bg-gray-400';
                            return (
                                <div
                                    key={log.id}
                                    className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${badgeClass}`}
                                >
                                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm">{log.user_name}</span>
                                            <span className="text-xs opacity-70">({log.user_code})</span>
                                            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-black/20">
                                                {log.action}
                                            </span>
                                        </div>
                                        {log.detail && (
                                            <p className="mt-0.5 text-xs opacity-80 truncate">{log.detail}</p>
                                        )}
                                    </div>
                                    <span className="text-xs opacity-60 shrink-0 tabular-nums">
                                        {formatDate(log.created_at)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLogView;
