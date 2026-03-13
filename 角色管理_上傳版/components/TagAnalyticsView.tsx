
import React, { useState, useMemo, useRef, useEffect } from 'react';
// FIX: Import d3 members individually to resolve TypeScript errors.
import { select, pack, hierarchy, zoom } from 'd3';
import type { TagCategory, CharacterImage, Character } from '../types';

interface TagAnalyticsViewProps {
  tagCategories: TagCategory[];
  characterImages: CharacterImage[];
  characters: Character[];
}

type SortMode = 'most' | 'least';

interface TagData {
  id: string;
  label: string;
  count: number;
  color: string;
  categoryId: string;
}

// FIX: Add a new type for data that will be used in the pack layout, including the `value` property.
type PackableTagData = TagData & { value: number };

const TagAnalyticsView: React.FC<TagAnalyticsViewProps> = ({ tagCategories, characterImages, characters }) => {
  const [sortMode, setSortMode] = useState<SortMode>('most');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tagUsageData = useMemo((): TagData[] => {
    const counts = new Map<string, number>();

    // Count tags from images
    characterImages.forEach(image => {
      image.tagIds.forEach(tagId => {
        counts.set(tagId, (counts.get(tagId) || 0) + 1);
      });
    });

    // Count tags from characters
    characters.forEach(character => {
      character.tagIds.forEach(tagId => {
        counts.set(tagId, (counts.get(tagId) || 0) + 1);
      });
    });

    const allTagsWithCategoryInfo = tagCategories.flatMap(cat =>
      cat.tags.map(tag => ({ ...tag, color: cat.color, categoryId: cat.id }))
    );

    const fullData = allTagsWithCategoryInfo
      .map(tagInfo => ({
        id: tagInfo.id,
        label: tagInfo.label,
        color: tagInfo.color,
        categoryId: tagInfo.categoryId,
        count: counts.get(tagInfo.id) || 0,
      }));

    if (selectedCategoryId === 'all') {
      return fullData;
    }
    return fullData.filter(tag => tag.categoryId === selectedCategoryId);

  }, [tagCategories, characterImages, characters, selectedCategoryId]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || tagUsageData.length === 0) {
      if (svgRef.current) {
        // FIX: Use select() from d3.
        select(svgRef.current).selectAll('*').remove();
      }
      return;
    }

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Ensure value is always positive for packing algorithm, especially for unused tags
    const dataForPacking: PackableTagData[] = tagUsageData.map(d => {
      const maxCount = Math.max(...tagUsageData.map(t => t.count), 0);
      let value = 0;
      if (sortMode === 'most') {
        value = d.count > 0 ? d.count : 0.5; // Give unused tags a very small value
      } else {
        value = (maxCount - d.count) + 1;
      }
      return { ...d, value };
    });

    // FIX: Use pack() from d3. Rename variable to avoid conflict.
    const packLayout = pack<PackableTagData>()
      .size([width - 2, height - 2])
      .padding(5);

    // FIX: Use hierarchy() from d3.
    // FIX: Cast `d` to `any` in `sum` and `root` to `any` in `packLayout` to handle d3's complex typing with non-uniform data structures.
    const root = hierarchy({ children: dataForPacking }).sum((d: any) => d.value || 0);
    const nodes = packLayout(root as any).leaves();

    // FIX: Use select() from d3.
    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('font', '12px sans-serif');

    svg.selectAll('*').remove(); // Clear previous render

    const zoomableG = svg.append('g');

    // FIX: Use select() from d3.
    const tooltip = select(containerRef.current).append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(0,0,0,0.8)')
      .style('color', '#fff')
      .style('padding', '5px 10px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('transition', 'opacity 0.2s');

    const node = zoomableG.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        tooltip.transition().style('opacity', 1);
        tooltip.html(`${d.data.label}<br/>使用次數: ${d.data.count}`)
          .style('left', (event.pageX + 15) + 'px')
          .style('top', (event.pageY - 15) + 'px');
        // FIX: Use select() from d3.
        select(event.currentTarget).select('circle').attr('stroke', '#fff');
      })
      .on('mouseout', (event) => {
        tooltip.transition().style('opacity', 0);
        // FIX: Use select() from d3.
        select(event.currentTarget).select('circle').attr('stroke', d => (d as any).data.count > 0 ? null : (d as any).data.color);
      });

    node.append('circle')
      .attr('r', d => d.r)
      .attr('fill', d => d.data.count > 0 ? d.data.color : 'none')
      .attr('stroke', d => d.data.count > 0 ? null : d.data.color)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.data.count > 0 ? 'none' : '4,4');

    // Create and style the parent <text> element
    const textEl = node.append('text')
      .attr('clip-path', d => `circle(${d.r})`)
      .attr('text-anchor', 'middle')
      .attr('fill', d => d.data.count > 0 ? '#fff' : d.data.color)
      .attr('paint-order', 'stroke')
      .attr('stroke', 'rgba(0,0,0,0.5)')
      .attr('stroke-width', '1px')
      .attr('font-size', d => Math.max(8, Math.min(d.r / 2.5, 20)) + 'px');

    // Append <tspan> elements to the <text> element for line breaks
    textEl.selectAll('tspan')
      .data(d => d.data.label.split(/(?=[A-Z][^A-Z])/g))
      .join('tspan')
      .attr('x', 0)
      .attr('y', (d, i, nodes) => `${i - nodes.length / 2 + 0.8}em`)
      .text(d => d as string);

    // Zoom functionality
    // FIX: Use zoom() from d3.
    svg.call(zoom<SVGSVGElement, unknown>()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.5, 8])
      .on('zoom', ({ transform }) => {
        zoomableG.attr('transform', transform);
      }));

    // Clean up tooltip when component unmounts or re-renders
    return () => {
      tooltip.remove();
    };

  }, [tagUsageData, sortMode]);

  return (
    <div className="h-full w-full bg-gray-900 flex flex-col p-8">
      <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-white">Tag 使用分析</h1>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <select
              value={selectedCategoryId}
              onChange={e => setSelectedCategoryId(e.target.value)}
              className="p-2 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-sm font-semibold"
            >
              <option value="all">所有類別</option>
              {tagCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setSortMode('most')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${sortMode === 'most' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}
            >
              最多使用
            </button>
            <button
              onClick={() => setSortMode('least')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${sortMode === 'least' ? 'bg-indigo-600' : 'hover:bg-gray-700'}`}
            >
              最少使用
            </button>
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        此圖表顯示每個 Tag 在所有角色與圖片中的使用頻率。泡泡越大，代表其使用次數越多（或越少，取決於您的排序選擇）。您可以使用滑鼠進行平移與縮放。
      </p>

      <div ref={containerRef} className="w-full h-full bg-gray-800/50 rounded-lg overflow-hidden relative border border-gray-700">
        <svg ref={svgRef}></svg>
        {tagUsageData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-center text-gray-500 pointer-events-none">
            <div>
              <p className="text-xl">沒有足夠的資料可供分析。</p>
              <p className="mt-2">請嘗試調整篩選條件，或為角色/圖片新增一些 Tag。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagAnalyticsView;
