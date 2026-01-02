import React, { useState } from 'react';
import { CloseIcon } from './Icons';

interface TimelineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameStartYear: number;
  onSave: (year: number) => void;
}

const TimelineSettingsModal: React.FC<TimelineSettingsModalProps> = ({
  isOpen,
  onClose,
  gameStartYear,
  onSave,
}) => {
  const [year, setYear] = useState(gameStartYear);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(year);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* 標題列 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">設定遊戲開始年</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 內容 */}
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">
              遊戲開始年曆
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              placeholder="200"
            />
            <p className="text-xs text-gray-400 mt-1">
              事件年份將以此為基準計算（例如：開始年為200，事件年份為5，則實際年份為205年）
            </p>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="p-4 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimelineSettingsModal;



