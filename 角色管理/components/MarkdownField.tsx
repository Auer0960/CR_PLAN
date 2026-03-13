import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
}

const MarkdownField: React.FC<MarkdownFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = '',
  minRows = 4,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-500 mb-1">編輯（Markdown）</div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={minRows}
            className="w-full px-3 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm font-mono resize-y min-h-[80px]"
          />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">預覽</div>
          <div className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-600 text-sm text-gray-200 min-h-[80px] overflow-y-auto [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold [&_em]:italic [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm">
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            ) : (
              <span className="text-gray-500">（空白）</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkdownField;
