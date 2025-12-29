
import React, { useState, useEffect } from 'react';
import { CloseIcon } from './Icons';
import type { AiProvider } from '../types';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  // FIX: Update onSave prop signature to remove Gemini key.
  onSave: (settings: { provider: AiProvider; openaiKey: string; }) => void;
  currentProvider: AiProvider;
  // FIX: Remove Gemini key from props.
  currentOpenaiKey: string;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, currentProvider, currentOpenaiKey }) => {
  const [provider, setProvider] = useState<AiProvider>(currentProvider);
  // FIX: Remove Gemini key state.
  const [openaiKey, setOpenaiKey] = useState(currentOpenaiKey);

  useEffect(() => {
    if (isOpen) {
      setProvider(currentProvider);
      // FIX: Remove Gemini key state update.
      setOpenaiKey(currentOpenaiKey);
    }
  // FIX: Remove Gemini key from dependency array.
  }, [isOpen, currentProvider, currentOpenaiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    // FIX: Update object passed to onSave to exclude Gemini key.
    onSave({ provider, openaiKey });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-lg p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <CloseIcon className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold mb-4 text-indigo-400">AI 提供商與 API Key 設定</h2>
        
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">選擇 AI 提供商</label>
            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                <button 
                    onClick={() => setProvider('gemini')}
                    className={`w-1/2 py-2 rounded-md text-sm font-semibold transition-colors ${provider === 'gemini' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}
                >
                    Google Gemini
                </button>
                <button 
                    onClick={() => setProvider('openai')}
                    className={`w-1/2 py-2 rounded-md text-sm font-semibold transition-colors ${provider === 'openai' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}
                >
                    OpenAI
                </button>
            </div>
        </div>

        {provider === 'gemini' && (
          // FIX: Remove Gemini API key input and show an informational message instead.
          <div>
            <p className="text-sm text-gray-400 mb-4">
              此應用程式已配置為使用 Google Gemini。API Key 是透過環境變數提供的，您無需手動輸入。
            </p>
          </div>
        )}

        {provider === 'openai' && (
          <div>
            <p className="text-sm text-gray-400 mb-4">
                您可以從 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline font-medium">OpenAI Platform</a> 取得您的 OpenAI API Key。
                <br />
                此應用程式會使用 `gpt-4o-mini` 模型。
            </p>
            <div className="mb-6">
                <label htmlFor="openaiKeyInput" className="block text-sm font-medium text-gray-300 mb-1">OpenAI API Key</label>
                <input
                    id="openaiKeyInput"
                    type="password"
                    value={openaiKey}
                    onChange={e => setOpenaiKey(e.target.value)}
                    placeholder="在此貼上您的 OpenAI API Key (sk-...)"
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
            </div>
          </div>
        )}


        <div className="flex justify-end items-center gap-4 mt-4">
            <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors duration-200">
                取消
            </button>
            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors duration-200">
                儲存設定
            </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
