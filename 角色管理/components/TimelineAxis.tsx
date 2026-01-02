import React from 'react';
import type { TimelineEvent } from '../types';

interface TimelineAxisProps {
  events: TimelineEvent[];
  yearRange: { min: number; max: number };
  gameStartYear: number;
}

const TimelineAxis: React.FC<TimelineAxisProps> = ({
  events,
  yearRange,
  gameStartYear,
}) => {
  const range = yearRange.max - yearRange.min;
  const tickInterval = range <= 0 ? 1 : range <= 10 ? 1 : range <= 50 ? 5 : range <= 100 ? 10 : 20;
  
  const ticks: number[] = [];
  if (range > 0) {
    // 找到第一個大於等於 min 的 tickInterval 倍數
    const firstTick = Math.ceil(yearRange.min / tickInterval) * tickInterval;
    
    for (let year = firstTick; year <= yearRange.max; year += tickInterval) {
      ticks.push(year);
    }
    
    // 如果起點和終點沒有刻度，或許可以補上邊界 (視需求而定，為了整潔通常只顯示整數倍刻度)
    // 但為了讓使用者知道邊界，我們可以保留原有的邏輯，或者只顯示整數刻度。
    // 這裡改為只顯示整數倍刻度，這樣看起來比較乾淨。
  } else {
    ticks.push(yearRange.min);
  }

  const getPosition = (year: number) => {
    if (range === 0) return 0;
    return ((year - yearRange.min) / range) * 100;
  };

  return (
    <div className="relative w-full h-20 border-t-2 border-gray-600">
      {/* 時間軸線 */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-600" />
      
      {/* 年份刻度 */}
      {ticks.map(year => {
        const position = getPosition(year);
        const absoluteYear = gameStartYear + year;
        return (
          <div
            key={year}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${position}%`, transform: 'translateX(-50%)' }} // 加上置中校正
          >
            <div className="w-0.5 h-4 bg-gray-600" />
            <div className="mt-1 text-xs text-gray-400 whitespace-nowrap">
              {absoluteYear}年
            </div>
            <div className="text-xs text-gray-500">
              ({year > 0 ? '+' : ''}{year})
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TimelineAxis;
