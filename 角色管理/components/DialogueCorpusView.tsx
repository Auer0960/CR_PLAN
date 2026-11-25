import React, { useEffect, useMemo, useState } from 'react';
import type { Character } from '../types';
import { namesReferToSameCharacter, preferCharacterLabels } from '../addressNames';
import { fetchDialogueCorpus, fetchDialogueIndex } from '../dialogueQueryClient';
import { filterSourceLines } from '../dialogueTags';
import type { DialogueCharacterCorpus, DialogueCharacterIndex } from '../dialogueCorpusTypes';
import SearchableSelect from './SearchableSelect';
import DialogueScriptView from './DialogueScriptView';
import { SearchIcon } from './Icons';

interface DialogueCorpusViewProps {
  characters: Character[];
  speaker: string;
  onSpeakerChange: (value: string) => void;
  recentStorageKey?: string;
}

const DialogueCorpusView: React.FC<DialogueCorpusViewProps> = ({
  characters,
  speaker,
  onSpeakerChange,
  recentStorageKey,
}) => {
  const [index, setIndex] = useState<DialogueCharacterIndex[]>([]);
  const [corpus, setCorpus] = useState<DialogueCharacterCorpus | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [isLoadingIndex, setIsLoadingIndex] = useState(true);
  const [isLoadingCorpus, setIsLoadingCorpus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingIndex(true);
      setError(null);
      try {
        const charactersIndex = await fetchDialogueIndex();
        if (!cancelled) setIndex(charactersIndex);
      } catch {
        if (!cancelled) setError('讀取台詞索引失敗。');
      } finally {
        if (!cancelled) setIsLoadingIndex(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!speaker) {
      setCorpus(null);
      setSelectedTags([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoadingCorpus(true);
      setError(null);
      try {
        const next = await fetchDialogueCorpus(speaker);
        if (cancelled) return;
        setCorpus(next);
        const tags = Array.from(new Set((next?.sources || []).map(source => source.tag)));
        setSelectedTags(tags);
        if (!next) setError(`「${speaker}」找不到可讀的台詞檔。`);
      } catch {
        if (!cancelled) setError('讀取台詞原文失敗。');
      } finally {
        if (!cancelled) setIsLoadingCorpus(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [speaker]);

  const speakerOptions = useMemo(() => {
    const indexNames = index.map(item => item.character);
    const listNames = characters
      .map(character => character.name)
      .filter(name => indexNames.some(item => namesReferToSameCharacter(item, name)));
    return preferCharacterLabels(listNames, indexNames).map(name => ({ value: name, label: name }));
  }, [index, characters]);

  const availableTags = useMemo(() => {
    if (!corpus) return [];
    return Array.from(new Set(corpus.sources.map(source => source.tag))).sort((a, b) =>
      a.localeCompare(b, 'zh-Hant'),
    );
  }, [corpus]);

  const visibleSources = useMemo(() => {
    if (!corpus) return [];
    const tagSet = new Set(selectedTags);
    return corpus.sources
      .filter(source => tagSet.has(source.tag))
      .map(source => ({
        ...source,
        displayContent: filterSourceLines(source.content, keyword),
      }))
      .filter(source => !keyword.trim() || source.displayContent.trim().length > 0);
  }, [corpus, selectedTags, keyword]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) return prev.filter(item => item !== tag);
      return [...prev, tag];
    });
  };

  const selectAllTags = () => setSelectedTags(availableTags);
  const clearTags = () => setSelectedTags([]);

  return (
    <div className="h-full w-full bg-gray-900 flex flex-col">
      <div className="p-8 border-b border-gray-700 flex-shrink-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SearchableSelect
            label="角色"
            value={speaker}
            options={speakerOptions}
            placeholder="選擇角色…"
            allowCreate={false}
            recentStorageKey={recentStorageKey}
            onChange={onSpeakerChange}
          />
          <div className="xl:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-2">關鍵字</label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="只留含關鍵字的行…"
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {availableTags.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-gray-400">來源 Tag</span>
              <button type="button" className="text-xs text-indigo-300 hover:text-indigo-200" onClick={selectAllTags}>
                全選
              </button>
              <button type="button" className="text-xs text-gray-400 hover:text-gray-200" onClick={clearTags}>
                清空
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      active
                        ? 'bg-indigo-600/30 border-indigo-400 text-indigo-100'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-8 space-y-6">
        {isLoadingIndex && <div className="text-gray-400">讀取台詞索引中…</div>}
        {error && <div className="text-red-400">{error}</div>}
        {!isLoadingIndex && !error && index.length === 0 && (
          <div className="text-gray-400">角色資料夾裡還沒有可讀的台詞檔。</div>
        )}
        {!isLoadingIndex && !error && index.length > 0 && !speaker && (
          <div className="text-gray-400">請先選角色。</div>
        )}
        {isLoadingCorpus && <div className="text-gray-400">讀取原文中…</div>}

        {!isLoadingCorpus && speaker && corpus && visibleSources.length === 0 && (
          <div className="text-gray-400">沒有符合目前 Tag／關鍵字的台詞。</div>
        )}

        {!isLoadingCorpus &&
          visibleSources.map(source => (
            <section key={source.id} className="rounded-lg border border-gray-700 bg-gray-950/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-block px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-200 border border-indigo-700/60">
                  {source.tag}
                </span>
                <span className="text-white font-medium">{source.fileName}</span>
                <span className="text-gray-500 text-xs ml-auto">{source.relativePath}</span>
              </div>
              <DialogueScriptView content={source.displayContent} focusName={corpus?.character || speaker} />
            </section>
          ))}
      </div>
    </div>
  );
};

export default DialogueCorpusView;
