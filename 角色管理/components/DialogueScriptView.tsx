import React, { useMemo, useState } from 'react';
import {
  groupDialogueBlocks,
  isFocusSpeaker,
  parseDialogueScript,
  speakerColorClass,
  type ParsedDialogueLine,
} from '../dialogueRender';
import { emojiPublicUrl, parseRichSegments } from '../dialogueRichText';

interface DialogueScriptViewProps {
  content: string;
  focusName?: string;
}

const EmojiImg: React.FC<{ index: number }> = ({ index }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="text-xs text-gray-500 align-middle">[emoji:{index}]</span>;
  }
  return (
    <img
      src={emojiPublicUrl(index)}
      alt={`emoji ${index}`}
      title={`emoji ${index}`}
      className="inline-block h-[1.25em] w-[1.25em] align-[-0.2em] mx-0.5"
      onError={() => setFailed(true)}
    />
  );
};

const RichInline: React.FC<{ text: string }> = ({ text }) => {
  const segments = useMemo(() => parseRichSegments(text || ''), [text]);
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'emoji') return <EmojiImg key={i} index={seg.index} />;
        if (seg.type === 'heart') return <span key={i} className="text-red-400">{seg.text}</span>;
        return <React.Fragment key={i}>{seg.text}</React.Fragment>;
      })}
    </>
  );
};

const SpeechLine: React.FC<{ line: ParsedDialogueLine; focusName?: string }> = ({ line, focusName }) => {
  const speaker = line.speaker || '';
  return (
    <div className={`flex gap-2 leading-relaxed ${isFocusSpeaker(speaker, focusName) ? 'pl-0' : ''}`}>
      <span className={`shrink-0 font-semibold ${speakerColorClass(speaker, focusName)}`}>
        {speaker}
      </span>
      <span className="text-gray-200">
        <span className="text-gray-500">「</span>
        <RichInline text={line.quote || ''} />
        <span className="text-gray-500">」</span>
      </span>
    </div>
  );
};

const LineView: React.FC<{ line: ParsedDialogueLine; focusName?: string }> = ({ line, focusName }) => {
  switch (line.kind) {
    case 'blank':
      return <div className="h-3" />;
    case 'heading': {
      const size =
        line.level === 1 ? 'text-xl text-white mt-2 mb-1' :
        line.level === 2 ? 'text-lg text-indigo-100 mt-4 mb-2' :
        'text-base text-gray-200 mt-3 mb-1';
      return <div className={`font-semibold ${size}`}>{line.quote}</div>;
    }
    case 'meta':
      return <div className="text-xs text-gray-500">— {line.quote}</div>;
    case 'option':
      return (
        <div className="text-sm text-amber-200">
          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-700/50 mr-2">
            選項 {line.optionLabel}
          </span>
          {line.optionTitle}
        </div>
      );
    case 'speech':
      return <SpeechLine line={line} focusName={focusName} />;
    default:
      return (
        <div className="text-gray-400">
          <RichInline text={line.raw} />
        </div>
      );
  }
};

const DialogueScriptView: React.FC<DialogueScriptViewProps> = ({ content, focusName }) => {
  const blocks = useMemo(() => groupDialogueBlocks(parseDialogueScript(content || '')), [content]);

  if (!content.trim()) {
    return <div className="text-gray-500 px-4 py-4">（此檔無內容）</div>;
  }

  return (
    <div className="px-4 py-4 space-y-1 text-sm">
      {blocks.map((block, index) => {
        if (block.type === 'line') {
          return <LineView key={`line-${index}`} line={block.line} focusName={focusName} />;
        }
        return (
          <div
            key={`opts-${index}`}
            className="my-3 rounded-lg border border-amber-800/40 bg-amber-950/20 overflow-hidden"
          >
            <div className="px-3 py-1.5 text-xs text-amber-400/80 border-b border-amber-800/30 bg-amber-950/30">
              玩家選項
            </div>
            <div className="divide-y divide-amber-900/30">
              {block.branches.map((branch) => (
                <div key={`${branch.label}-${branch.title}`} className="px-3 py-2.5 space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-amber-900/60 text-amber-100 border border-amber-700/50">
                      {branch.label}
                    </span>
                    <span className="text-amber-100/90">{branch.title || '（無標題）'}</span>
                  </div>
                  {branch.lines.map((line, lineIdx) => (
                    <div key={lineIdx} className="pl-1">
                      <LineView line={line} focusName={focusName} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DialogueScriptView;
