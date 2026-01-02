import React from 'react';
import type { TimelineEvent, TimelineTag, Character } from '../types';

interface TimelineEventCardProps {
  event: TimelineEvent;
  characters: Character[];
  tags: TimelineTag[];
  gameStartYear: number;
  yearRange: { min: number; max: number };
  verticalIndex: number; // 新增：垂直層級索引
  isExpanded: boolean;
  showPrivateInfo: boolean;
  onClick: () => void;
  onCharacterClick: (characterId: string) => void;
}

const TimelineEventCard: React.FC<TimelineEventCardProps> = ({
  event,
  characters,
  tags,
  gameStartYear,
  yearRange,
  verticalIndex,
  isExpanded,
  showPrivateInfo,
  onClick,
  onCharacterClick,
}) => {
  const absoluteYear = gameStartYear + event.startYear;
  const isMainStory = !!event.isMainStory;
  const duration = event.isContinuous
    ? '持續中'
    : event.endYear
    ? `${event.endYear - event.startYear} 年`
    : '單一事件';

  const sizeConfig = {
    large: { dot: 'w-6 h-6', line: 'h-1.5', color: 'bg-red-500', text: 'text-sm font-bold' },
    medium: { dot: 'w-4 h-4', line: 'h-1', color: 'bg-blue-500', text: 'text-xs font-semibold' },
    small: { dot: 'w-3 h-3', line: 'h-0.5', color: 'bg-green-500', text: 'text-[10px]' },
  };

  const config = sizeConfig[event.size];
  const dotSize = isMainStory ? 'w-7 h-7' : config.dot;
  const dotShape = isMainStory ? 'rotate-45 rounded-sm' : 'rounded-full';
  const eventTags = tags.filter(t => event.tagIds.includes(t.id));
  const eventCharacters = characters.filter(c => event.characterIds.includes(c.id));

  // 計算位置
  const range = yearRange.max - yearRange.min;
  const position = range > 0 ? ((event.startYear - yearRange.min) / range) * 100 : 0;
  
  // 修正持續時間寬度邏輯
  const widthPercent = event.isContinuous && event.endYear && range > 0
    ? ((event.endYear - event.startYear) / range) * 100
    : 0;
    
  // 計算垂直位置 (每層高度 70px)
  const topPosition = verticalIndex * 70;

  return (
    <div
      className="absolute cursor-pointer group hover:z-20"
      style={{
        left: `${position}%`,
        top: `${topPosition}px`,
        width: widthPercent > 0 ? `${widthPercent}%` : 'auto',
        zIndex: isExpanded ? 50 : 10, // 展開時最上層，否則普通層級
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* 事件視覺本體 (點 + 線) */}
      <div className="relative flex items-center">
        {/* 點 - 總是置左 (時間起點) */}
        <div
          className={`${dotSize} ${config.color} ${dotShape} border-2 border-gray-800 transition-transform group-hover:scale-125 shadow-md relative z-10 flex-shrink-0 ${isMainStory ? 'ring-2 ring-white/20' : ''}`}
        />
        
        {/* 線 - 延伸到寬度盡頭 */}
        {widthPercent > 0 && (
          <div
            className={`${config.line} ${config.color} opacity-50 absolute left-0 top-1/2 -translate-y-1/2 z-0`}
            style={{ width: '100%' }}
          />
        )}
      </div>
      
      {/* 總是顯示標題 - 置於點的下方 */}
      <div 
        className={`absolute top-8 left-0 -translate-x-1/4 whitespace-nowrap ${config.text} text-gray-300 group-hover:text-white transition-colors text-shadow-sm pointer-events-none`}
      >
        {event.title}
      </div>

      {/* 詳細卡片 - 展開時顯示 */}
      {isExpanded && (
        <div className="absolute top-full mt-2 left-0 z-50 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold text-lg text-white">{event.title}</h3>
            <span className="text-xs text-gray-400">
              {absoluteYear}年 ({duration})
            </span>
          </div>

          {/* 標籤 */}
          {eventTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {eventTags.map(tag => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 text-xs rounded"
                  style={{ backgroundColor: tag.color + '40', color: tag.color }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* 參與者 */}
          {eventCharacters.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-gray-400 mb-1">參與者：</div>
              <div className="flex flex-wrap gap-1">
                {eventCharacters.slice(0, 5).map(char => (
                  <button
                    key={char.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCharacterClick(char.id);
                    }}
                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                  >
                    {char.name}
                  </button>
                ))}
                {eventCharacters.length > 5 && (
                  <span className="text-xs text-gray-400">+{eventCharacters.length - 5}</span>
                )}
              </div>
            </div>
          )}

          {/* NPC */}
          {event.npcNames.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-gray-400 mb-1">NPC：</div>
              <div className="text-xs text-gray-300">{event.npcNames.join(', ')}</div>
            </div>
          )}

          {/* 地點 */}
          {event.location && (
            <div className="mb-2">
              <div className="text-xs text-gray-400">地點：</div>
              <div className="text-xs text-gray-300">{event.location}</div>
            </div>
          )}

          {/* 表資訊 */}
          <div className="mb-2">
            <div className="text-xs text-gray-400 mb-1">（表）事件資訊：</div>
            <div className="text-sm text-gray-200 line-clamp-3">{event.publicInfo || '無'}</div>
          </div>

          {/* 裡資訊 */}
          {showPrivateInfo && (
            <>
              {event.deepInfo && (
                <div className="mb-2">
                  <div className="text-xs text-gray-400 mb-1">（裡）深層設定：</div>
                  <div className="text-sm text-gray-300 bg-gray-700/50 p-2 rounded line-clamp-3">
                    {event.deepInfo}
                  </div>
                </div>
              )}
              {event.notes && (
                <div className="mb-2">
                  <div className="text-xs text-gray-400 mb-1">（裡）額外補充：</div>
                  <div className="text-sm text-gray-300 bg-gray-700/50 p-2 rounded line-clamp-3">
                    {event.notes}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="text-xs text-gray-500 mt-2">
            再次點擊開啟編輯
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineEventCard;
