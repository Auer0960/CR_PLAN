import React, { useState } from 'react';

interface InputPanelProps {
  onProcess: (text: string) => void;
  isLoading: boolean;
  error: string | null;
}

const InputPanel: React.FC<InputPanelProps> = ({ onProcess, isLoading, error }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onProcess(text);
      setText('');
    }
  };

  return (
    <div className="w-full pt-2">
      <p className="text-sm text-gray-400 mb-4">輸入文字來描述人物關係，例如：<br />"小明是小美的爸爸，小華是小美的媽媽"</p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-24 p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
          placeholder="在這裡輸入..."
          disabled={isLoading}
        />
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        <button
          type="submit"
          disabled={isLoading || !text.trim()}
          className="w-full mt-4 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-md font-semibold transition-colors duration-200"
        >
          {isLoading ? '處理中...' : '生成角色與關係'}
        </button>
      </form>
    </div>
  );
};

export default InputPanel;