import React, { useState } from 'react';
import type { Character } from '../types';
import { DIALOGUE_CHARACTER_RECENT_KEY } from '../recentSelect';
import AddressLookupView from './AddressLookupView';
import DialogueCorpusView from './DialogueCorpusView';

type DialogueTab = 'address' | 'corpus';

interface DialogueQueryViewProps {
  characters: Character[];
}

const DialogueQueryView: React.FC<DialogueQueryViewProps> = ({ characters }) => {
  const [tab, setTab] = useState<DialogueTab>('address');
  const [speaker, setSpeaker] = useState('');

  return (
    <div className="h-full w-full bg-gray-900 flex flex-col">
      <div className="px-8 pt-8 pb-0 border-b border-gray-700 flex-shrink-0">
        <h1 className="text-3xl font-bold text-white mb-2">台詞查詢</h1>
        <p className="text-sm text-gray-400 mb-4">
          稱呼怎麼叫人，或直接翻角色台詞原文。
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            className={`px-4 py-2 text-sm rounded-t-md border border-b-0 ${
              tab === 'address'
                ? 'bg-gray-900 text-white border-gray-700'
                : 'bg-gray-800 text-gray-400 border-transparent hover:text-gray-200'
            }`}
            onClick={() => setTab('address')}
          >
            稱呼查詢
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm rounded-t-md border border-b-0 ${
              tab === 'corpus'
                ? 'bg-gray-900 text-white border-gray-700'
                : 'bg-gray-800 text-gray-400 border-transparent hover:text-gray-200'
            }`}
            onClick={() => setTab('corpus')}
          >
            台詞總表
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <div className={tab === 'address' ? 'h-full' : 'hidden'}>
          <AddressLookupView
            characters={characters}
            speaker={speaker}
            onSpeakerChange={setSpeaker}
            recentStorageKey={DIALOGUE_CHARACTER_RECENT_KEY}
            active={tab === 'address'}
          />
        </div>
        <div className={tab === 'corpus' ? 'h-full' : 'hidden'}>
          <DialogueCorpusView
            characters={characters}
            speaker={speaker}
            onSpeakerChange={setSpeaker}
            recentStorageKey={DIALOGUE_CHARACTER_RECENT_KEY}
          />
        </div>
      </div>
    </div>
  );
};

export default DialogueQueryView;
