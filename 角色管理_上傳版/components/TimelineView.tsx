import React, { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { TimelineData, TimelineEvent, TimelineTag, Character, TagWithColor } from '../types';
import TimelineEventCard from './TimelineEventCard';
import TimelineEventModal from './TimelineEventModal';
import TimelineAxis from './TimelineAxis';
import TimelineFilterPanel from './TimelineFilterPanel';
import TimelineSearchBar from './TimelineSearchBar';
import TimelineTagManager from './TimelineTagManager';
import TimelineSettingsModal from './TimelineSettingsModal';
import TimelineLocationManager from './TimelineLocationManager';
import { PlusIcon, FilterIcon } from './Icons';

interface TimelineViewProps {
  timelineData: TimelineData;
  onUpdateTimeline: (data: TimelineData) => void;
  characters: Character[];
  allTags: TagWithColor[];
  onCharacterClick: (character: Character) => void;
}

interface FilterState {
  yearRange: [number, number] | null;
  sizes: ('large' | 'medium' | 'small')[];
  characterIds: string[];
  locations: string[];
  tagIds: string[];
}

// 輔助型別：包含佈局資訊的事件
interface PositionedEvent extends TimelineEvent {
  verticalIndex: number;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  timelineData,
  onUpdateTimeline,
  characters,
  allTags,
  onCharacterClick,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isLocationManagerOpen, setIsLocationManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<FilterState>({
    yearRange: null,
    sizes: [],
    characterIds: [],
    locations: [],
    tagIds: [],
  });
  const [showPrivateInfo, setShowPrivateInfo] = useState(false);

  // 計算年份範圍（相對年份）
  const yearRange = useMemo(() => {
    if (timelineData.events.length === 0) {
      return { min: 0, max: 10 };
    }
    const years = timelineData.events.map(e => e.startYear);
    const endYears = timelineData.events
      .filter(e => e.endYear !== undefined)
      .map(e => e.endYear!);
    const allYears = [...years, ...endYears];
    const min = Math.min(...allYears);
    const max = Math.max(...allYears);
    
    // 計算總年份跨度
    const range = max - min;
    // 左右兩側保留緩衝區間：至少 5 年，或總跨度的 15%
    const padding = Math.max(5, range * 0.15);

    // 確保範圍至少為 10 年，並取整數
    return {
      min: Math.floor(min - padding),
      max: Math.ceil(Math.max(max + padding, min + 10)),
    };
  }, [timelineData.events]);

  // 搜尋過濾
  const searchFilteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return timelineData.events;
    
    const keywords = searchQuery.toLowerCase().split(/\s+/).filter(k => k);
    return timelineData.events.filter(event => {
      const searchText = [
        event.title,
        event.publicInfo,
        event.deepInfo,
        event.notes,
        event.location,
        ...event.npcNames,
        ...characters.filter(c => event.characterIds.includes(c.id)).map(c => c.name),
      ].join(' ').toLowerCase();
      
      return keywords.every(keyword => searchText.includes(keyword));
    });
  }, [searchQuery, timelineData.events, characters]);

  // 篩選過濾
  const filteredEvents = useMemo(() => {
    let events = searchFilteredEvents;
    
    // 年份範圍篩選
    if (filterState.yearRange) {
      const [minYear, maxYear] = filterState.yearRange;
      events = events.filter(event => {
        const eventEndYear = event.isContinuous ? yearRange.max : (event.endYear || event.startYear);
        return event.startYear <= maxYear && eventEndYear >= minYear;
      });
    }
    
    // 大小篩選
    if (filterState.sizes.length > 0) {
      events = events.filter(event => filterState.sizes.includes(event.size));
    }
    
    // 參與者篩選
    if (filterState.characterIds.length > 0) {
      events = events.filter(event =>
        event.characterIds.some(id => filterState.characterIds.includes(id))
      );
    }
    
    // 地點篩選
    if (filterState.locations.length > 0) {
      events = events.filter(event =>
        filterState.locations.includes(event.location)
      );
    }
    
    // 標籤篩選
    if (filterState.tagIds.length > 0) {
      events = events.filter(event =>
        event.tagIds.some(id => filterState.tagIds.includes(id))
      );
    }
    
    return events;
  }, [searchFilteredEvents, filterState, yearRange.max]);

  // 排序事件
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => a.startYear - b.startYear);
  }, [filteredEvents]);

  // 計算事件垂直堆疊佈局
  const positionedEvents = useMemo<PositionedEvent[]>(() => {
    const rows: number[] = []; // 儲存每一行最後一個事件的「視覺結束年份」
    const range = yearRange.max - yearRange.min;
    // 視覺緩衝區間：時間軸總長度的 12% (標題文字寬度 + 間隔)
    const visualBuffer = Math.max(range * 0.12, 1); 

    return sortedEvents.map(event => {
      const eventEnd = event.isContinuous && event.endYear
        ? event.endYear
        : event.startYear;

      // 尋找第一個可容納此事件的行
      let rowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        // 如果此行的最後一個事件的結束時間 + 緩衝 < 當前事件開始時間，則可放入
        if (event.startYear >= rows[i]) {
          rowIndex = i;
          break;
        }
      }

      // 如果沒有適合的行，則創建新的一行
      if (rowIndex === -1) {
        rowIndex = rows.length;
        rows.push(0); // 初始化新行
      }

      // 計算此事件佔據的「視覺結束時間」
      // 如果是單點事件，它佔據 [start, start + visualBuffer]
      // 如果是持續事件，它佔據 [start, end + minimalBuffer]
      // 取兩者較大值以確保標題不重疊
      const occupiedEnd = Math.max(
        eventEnd + (range * 0.02), // 至少保留一點尾端間隔
        event.startYear + visualBuffer // 確保標題空間
      );
      
      rows[rowIndex] = occupiedEnd;

      return { ...event, verticalIndex: rowIndex };
    });
  }, [sortedEvents, yearRange]);

  // 計算容器高度：(最大行數 + 1) * 每行高度 + 底部緩衝
  const maxRowIndex = positionedEvents.reduce((max, e) => Math.max(max, e.verticalIndex), -1);
  const containerHeight = Math.max(400, (maxRowIndex + 2) * 80); // 每行 80px 高度

  const handleAddEvent = () => {
    const newEvent: TimelineEvent = {
      id: uuidv4(),
      title: '新事件',
      startYear: 0,
      isContinuous: false,
      size: 'medium',
      isMainStory: false,
      parentEventIds: [],
      relatedEventIds: [],
      characterIds: [],
      npcNames: [],
      tagIds: [],
      publicInfo: '',
      deepInfo: '',
      notes: '',
      location: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSelectedEvent(newEvent);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: TimelineEvent) => {
    if (expandedEventId === event.id) {
      // 如果已經展開，再次點擊則開啟編輯
      setSelectedEvent(event);
      setIsEventModalOpen(true);
      // 開啟編輯視窗時收起卡片，避免遮擋
      setExpandedEventId(null);
    } else {
      // 否則展開/收合
      setExpandedEventId(event.id);
    }
  };

  const handleSaveEvent = (event: TimelineEvent) => {
    const existingIndex = timelineData.events.findIndex(e => e.id === event.id);
    let updatedEvents: TimelineEvent[];
    
    if (existingIndex >= 0) {
      updatedEvents = [...timelineData.events];
      updatedEvents[existingIndex] = { ...event, updatedAt: Date.now() };
    } else {
      updatedEvents = [...timelineData.events, event];
    }
    
    // 更新地點清單
    const updatedLocations = [...timelineData.locations];
    if (event.location && !updatedLocations.includes(event.location)) {
      updatedLocations.push(event.location);
    }

    // 若地點管理中沒有該地點，補一筆節點（讓地點管理自動匯聚）
    const locationNodes = Array.isArray(timelineData.locationNodes) ? [...timelineData.locationNodes] : [];
    const locLabel = (event.location || '').trim();
    if (locLabel) {
      const exists = locationNodes.some(n => (n.label || '').trim() === locLabel);
      if (!exists) {
        const now = Date.now();
        locationNodes.push({
          id: uuidv4(),
          label: locLabel,
          description: '',
          createdAt: now,
          updatedAt: now,
        } as any);
      }
    }
    
    onUpdateTimeline({
      ...timelineData,
      events: updatedEvents,
      locations: updatedLocations,
      locationNodes,
    });
    
    setIsEventModalOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = (eventId: string) => {
    const updatedEvents = timelineData.events.filter(e => e.id !== eventId);
    onUpdateTimeline({
      ...timelineData,
      events: updatedEvents,
    });
    setIsEventModalOpen(false);
    setSelectedEvent(null);
  };

  const handleUpdateTags = (tags: TimelineTag[]) => {
    onUpdateTimeline({
      ...timelineData,
      tags,
    });
  };

  const handleUpdateGameStartYear = (year: number) => {
    onUpdateTimeline({
      ...timelineData,
      gameStartYear: year,
    });
  };

  const clearFilters = () => {
    setFilterState({
      yearRange: null,
      sizes: [],
      characterIds: [],
      locations: [],
      tagIds: [],
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* 頂部工具列 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddEvent}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>新增事件</span>
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            設定遊戲開始年
          </button>
          <button
            onClick={() => setIsTagManagerOpen(true)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            標籤管理
          </button>
          <button
            onClick={() => setIsLocationManagerOpen(true)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            地點管理
          </button>
        </div>
        <div className="flex items-center gap-2">
          <TimelineSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isFilterOpen
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <FilterIcon className="w-5 h-5" />
            <span>篩選</span>
          </button>
          <button
            onClick={() => setShowPrivateInfo(!showPrivateInfo)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            {showPrivateInfo ? '隱藏' : '顯示'}裡資訊
          </button>
        </div>
      </div>

      {/* 篩選結果顯示 */}
      {(filterState.yearRange || filterState.sizes.length > 0 || 
        filterState.characterIds.length > 0 || filterState.locations.length > 0 || 
        filterState.tagIds.length > 0) && (
        <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <span className="text-sm text-gray-300">
            顯示 {sortedEvents.length} / {timelineData.events.length} 個事件
          </span>
          <button
            onClick={clearFilters}
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            清除篩選
          </button>
        </div>
      )}

      {/* 篩選器面板 */}
      {isFilterOpen && (
        <TimelineFilterPanel
          timelineData={timelineData}
          characters={characters}
          allTags={allTags}
          filterState={filterState}
          onFilterChange={setFilterState}
          yearRange={yearRange}
        />
      )}

      {/* 時間軸主視圖 */}
      <div
        className="flex-1 overflow-auto relative custom-scrollbar"
        onClick={() => {
          // 點擊背景取消選取（收起展開卡片）
          if (expandedEventId !== null) setExpandedEventId(null);
        }}
      >
        <div style={{ height: `${containerHeight}px`, minHeight: '100%' }} className="relative">
            <TimelineAxis
            events={sortedEvents}
            yearRange={yearRange}
            gameStartYear={timelineData.gameStartYear}
            />
            <div className="relative mt-20">
            {positionedEvents.map(event => (
                <TimelineEventCard
                key={event.id}
                event={event}
                characters={characters}
                tags={timelineData.tags}
                gameStartYear={timelineData.gameStartYear}
                yearRange={yearRange}
                verticalIndex={event.verticalIndex}
                isExpanded={expandedEventId === event.id}
                showPrivateInfo={showPrivateInfo}
                onClick={() => handleEventClick(event)}
                onCharacterClick={(characterId) => {
                  const c = characters.find(ch => ch.id === characterId);
                  if (c) {
                    // 打開角色視窗時收起卡片，避免遮擋
                    setExpandedEventId(null);
                    onCharacterClick(c);
                  }
                }}
                />
            ))}
            </div>
        </div>
      </div>

      {/* 事件編輯視窗 */}
      {isEventModalOpen && selectedEvent && (
        <TimelineEventModal
          isOpen={isEventModalOpen}
          onClose={() => {
            setIsEventModalOpen(false);
            setSelectedEvent(null);
          }}
          event={selectedEvent}
          timelineData={timelineData}
          characters={characters}
          allTags={allTags}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}

      {/* 標籤管理器 */}
      {isTagManagerOpen && (
        <TimelineTagManager
          isOpen={isTagManagerOpen}
          onClose={() => setIsTagManagerOpen(false)}
          tags={timelineData.tags}
          events={timelineData.events}
          onUpdateTags={handleUpdateTags}
        />
      )}

      {/* 地點管理器 */}
      {isLocationManagerOpen && (
        <TimelineLocationManager
          isOpen={isLocationManagerOpen}
          onClose={() => setIsLocationManagerOpen(false)}
          timelineData={timelineData}
          onUpdateTimeline={onUpdateTimeline}
        />
      )}

      {/* 設定視窗 */}
      {isSettingsOpen && (
        <TimelineSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          gameStartYear={timelineData.gameStartYear}
          onSave={handleUpdateGameStartYear}
        />
      )}
    </div>
  );
};

export default TimelineView;
