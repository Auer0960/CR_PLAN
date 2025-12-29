
import React, { useEffect, useRef, useMemo, useState } from 'react';
// FIX: Import d3 members individually to resolve TypeScript errors.
import {
    select,
    zoom,
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCenter,
    drag,
    forceCollide,
    forceX,
    forceY,
    hierarchy,
    pack,
    type SimulationNodeDatum,
    type Simulation,
    type D3DragEvent,
    type Selection
} from 'd3';
import type { Character, Relationship, TagCategory } from '../types';
import { UserIcon, ClusterIcon } from './Icons';

interface RelationshipGraphProps {
    characters: Character[];
    relationships: Relationship[];
    onNodeClick: (character: Character) => void;
    tagCategories: TagCategory[];
}

type ViewMode = 'individual' | 'grouped';

// Combine Character with D3's simulation properties
// FIX: Use imported SimulationNodeDatum type directly.
type SimulationNode = Character & SimulationNodeDatum & {
    isGroup?: boolean;
    groupId?: string;
    radius?: number;
};
// Combine Relationship with D3's simulation properties
type SimulationLink = Omit<Relationship, 'source' | 'target'> & {
    source: SimulationNode | string;
    target: SimulationNode | string;
};

const RelationshipGraph: React.FC<RelationshipGraphProps> = ({ characters, relationships, onNodeClick, tagCategories }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('individual');
    const [groupingCategoryId, setGroupingCategoryId] = useState<string>('');

    // useMemo to create stable copies for D3. D3 mutates data.
    const graphData = useMemo(() => {
        return {
            nodes: characters.map(c => ({ ...c })),
            links: relationships.map(r => ({ ...r }))
        };
    }, [characters, relationships]);

    const singleSelectCategories = useMemo(() =>
        tagCategories.filter(c => c.selectionMode === 'single'),
        [tagCategories]);


    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;

        if (graphData.nodes.length === 0) {
            // FIX: Use select() from d3
            select(svgRef.current).selectAll("*").remove();
            return;
        }

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // FIX: Use select() from d3
        const svg = select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [-width / 2, -height / 2, width, height]);

        svg.selectAll("*").remove(); // Clear previous render

        const g = svg.append("g");

        // Zoom functionality
        // FIX: Use zoom() from d3. Rename variable to avoid conflict.
        const zoomBehavior = zoom<SVGSVGElement, unknown>()
            .extent([[0, 0], [width, height]])
            .scaleExtent([0.1, 4])
            .on('zoom', ({ transform }) => {
                g.attr('transform', transform);
            });
        svg.call(zoomBehavior);

        // FIX: Use imported Simulation type directly.
        let simulation: Simulation<SimulationNode, undefined> | undefined;

        if (viewMode === 'individual') {
            simulation = setupIndividualView(svg, g, graphData.nodes, graphData.links);
        } else {
            if (groupingCategoryId) {
                simulation = setupGroupedView(svg, g, graphData.nodes, groupingCategoryId);
            } else {
                // Display placeholder message if no category is selected
                svg.append('text')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#6b7280') // text-gray-500
                    .style('font-size', '16px')
                    .text(
                        singleSelectCategories.length > 0
                            ? '請從左上角的選單中選擇一個單選分類來進行群組。'
                            : '沒有可用的單選分類來進行群組。'
                    );
                return;
            }
        }

        // FIX: Use imported Simulation and D3DragEvent types directly. Rename function to avoid name collision with import.
        function dragFn(simulation: Simulation<SimulationNode, undefined>) {
            function dragstarted(event: D3DragEvent<any, SimulationNode, any>, d: SimulationNode) {
                if (d.isGroup) return;
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(event: D3DragEvent<any, SimulationNode, any>, d: SimulationNode) {
                if (d.isGroup) return;
                d.fx = event.x;
                d.fy = event.y;
            }

            function dragended(event: D3DragEvent<any, SimulationNode, any>, d: SimulationNode) {
                if (d.isGroup) return;
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }

            // FIX: Use drag() from d3.
            return drag<any, SimulationNode>()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended);
        }

        // Setup for individual nodes view
        // FIX: Use imported Selection type directly.
        function setupIndividualView(svg: Selection<SVGSVGElement, unknown, null, undefined>, g: Selection<SVGGElement, unknown, null, undefined>, nodes: SimulationNode[], links: SimulationLink[]) {
            // Arrowheads for directed links
            svg.append('defs').append('marker')
                .attr('id', 'arrowhead')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 23)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 8)
                .attr('markerHeight', 8)
                .append('svg:path')
                .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
                .attr('fill', '#999');

            // Identify connected nodes to apply selective gravity
            const connectedNodeIds = new Set<string>();
            links.forEach(l => {
                const sourceId = typeof l.source === 'object' ? (l.source as any).id : l.source;
                const targetId = typeof l.target === 'object' ? (l.target as any).id : l.target;
                connectedNodeIds.add(sourceId);
                connectedNodeIds.add(targetId);
            });

            // FIX: Use forceSimulation, forceLink, forceManyBody, forceCenter from d3.
            const simulation = forceSimulation<SimulationNode>(nodes)
                .force('link', forceLink<SimulationNode, SimulationLink>(links as SimulationLink[]).id(d => d.id).distance(200))
                .force('charge', forceManyBody().strength(-800))
                .force('center', forceCenter(0, 0))
                // Apply gravity ONLY to isolated nodes (those not in the connected set)
                // This preserves the layout of the central cluster while pulling floating nodes closer
                .force('x', forceX(0).strength(d => connectedNodeIds.has(d.id) ? 0 : 0.05))
                .force('y', forceY(0).strength(d => connectedNodeIds.has(d.id) ? 0 : 0.05))
                .on('tick', ticked);

            // Detect multiple links between same two nodes
            // If A and B have multiple relationships (regardless of labels), curve them all
            const linkPairs = new Map<string, SimulationLink[]>();
            links.forEach(link => {
                const sourceId = typeof link.source === 'string' ? link.source : (link.source as SimulationNode).id;
                const targetId = typeof link.target === 'string' ? link.target : (link.target as SimulationNode).id;
                const key = [sourceId, targetId].sort().join('-');
                if (!linkPairs.has(key)) {
                    linkPairs.set(key, []);
                }
                linkPairs.get(key)!.push(link);
            });

            // Mark links that need to be curved (multiple relationships between same nodes)
            const multipleLinks = new Map<SimulationLink, number>(); // link -> index in its group
            linkPairs.forEach(pair => {
                if (pair.length > 1) {
                    // Curve all links in this pair, with different offsets
                    pair.forEach((link, index) => {
                        multipleLinks.set(link, index);
                    });
                }
            });

            const link = g.append('g')
                .attr('stroke', '#999')
                .attr('stroke-opacity', 0.6)
                .selectAll('path')
                .data(links)
                .join('path')
                .attr('stroke-width', 1.5)
                .attr('fill', 'none')
                .attr('marker-end', d => d.arrowStyle === 'arrow' ? 'url(#arrowhead)' : 'none');

            // Link labels with background for better visibility
            const linkLabelGroup = g.append('g')
                .selectAll('.link-label-group')
                .data(links)
                .join('g')
                .attr('class', 'link-label-group');

            // Background rectangle for label
            linkLabelGroup.append('rect')
                .attr('class', 'link-label-bg')
                .attr('fill', '#1f2937') // bg-gray-800
                .attr('stroke', '#374151') // border-gray-700
                .attr('stroke-width', 1)
                .attr('rx', 3)
                .attr('ry', 3)
                .attr('opacity', 0.9);

            // Label text
            const linkLabel = linkLabelGroup.append('text')
                .attr('class', 'link-label')
                .attr('font-size', '10px')
                .attr('fill', '#e5e7eb') // text-gray-200
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .text(d => d.label);

            const nodeRadius = 20;

            const node = g.append('g')
                .attr('class', 'nodes')
                .selectAll('g')
                .data(nodes)
                .join('g')
                .style('cursor', 'pointer')
                .on('click', (event, d) => {
                    if (event.defaultPrevented) return;
                    onNodeClick(d);
                })
                .call(dragFn(simulation));

            node.append('circle')
                .attr('r', nodeRadius)
                .attr('stroke', '#fff')
                .attr('stroke-width', 1.5)
                .attr('fill', '#333');

            node.append('clipPath')
                .attr('id', d => `clip-${d.id}`)
                .append('circle')
                .attr('r', nodeRadius);

            node.append('image')
                .attr('xlink:href', d => d.image || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(d.name)}`)
                .attr('x', -nodeRadius)
                .attr('y', -nodeRadius)
                .attr('height', nodeRadius * 2)
                .attr('width', nodeRadius * 2)
                .attr('clip-path', d => `url(#clip-${d.id})`);

            node.append('text')
                .text(d => d.name)
                .attr('y', nodeRadius + 15)
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .style('font-size', '12px')
                .style('paint-order', 'stroke')
                .style('stroke', '#111827') // bg-gray-900
                .style('stroke-width', '3px');

            function ticked() {
                // Update link paths with curves for multiple relationships
                link.attr('d', d => {
                    const source = (d.source as unknown) as SimulationNode;
                    const target = (d.target as unknown) as SimulationNode;
                    const sx = source.x!;
                    const sy = source.y!;
                    const tx = target.x!;
                    const ty = target.y!;

                    // Check if this link is part of multiple relationships
                    if (multipleLinks.has(d)) {
                        const index = multipleLinks.get(d)!;
                        const sourceId = typeof d.source === 'string' ? d.source : source.id;
                        const targetId = typeof d.target === 'string' ? d.target : target.id;

                        // Calculate curve offset based on index
                        // Use different offsets for each link in the group
                        const baseOffset = 30;
                        let curveOffset: number;

                        if (index === 0) {
                            curveOffset = sourceId < targetId ? baseOffset : -baseOffset;
                        } else {
                            curveOffset = sourceId < targetId ? -baseOffset : baseOffset;
                        }

                        // Calculate curve
                        const dx = tx - sx;
                        const dy = ty - sy;
                        const dr = Math.sqrt(dx * dx + dy * dy);

                        const midX = (sx + tx) / 2;
                        const midY = (sy + ty) / 2;
                        const perpX = -(ty - sy) / dr * curveOffset;
                        const perpY = (tx - sx) / dr * curveOffset;
                        const cx = midX + perpX;
                        const cy = midY + perpY;

                        return `M ${sx},${sy} Q ${cx},${cy} ${tx},${ty}`;
                    } else {
                        // Straight line for single relationships
                        return `M ${sx},${sy} L ${tx},${ty}`;
                    }
                });

                // Update link label positions
                linkLabelGroup.attr('transform', d => {
                    const source = (d.source as unknown) as SimulationNode;
                    const target = (d.target as unknown) as SimulationNode;
                    const sx = source.x!;
                    const sy = source.y!;
                    const tx = target.x!;
                    const ty = target.y!;

                    // Position label at curve midpoint for multiple links
                    if (multipleLinks.has(d)) {
                        const index = multipleLinks.get(d)!;
                        const sourceId = typeof d.source === 'string' ? d.source : source.id;
                        const targetId = typeof d.target === 'string' ? d.target : target.id;

                        const baseOffset = 30;
                        let curveOffset: number;

                        if (index === 0) {
                            curveOffset = sourceId < targetId ? baseOffset : -baseOffset;
                        } else {
                            curveOffset = sourceId < targetId ? -baseOffset : baseOffset;
                        }

                        const dx = tx - sx;
                        const dy = ty - sy;
                        const dr = Math.sqrt(dx * dx + dy * dy);

                        const midX = (sx + tx) / 2;
                        const midY = (sy + ty) / 2;
                        const perpX = -(ty - sy) / dr * curveOffset;
                        const perpY = (tx - sx) / dr * curveOffset;
                        const cx = midX + perpX;
                        const cy = midY + perpY;

                        return `translate(${cx}, ${cy})`;
                    } else {
                        // Label at straight line midpoint
                        return `translate(${(sx + tx) / 2}, ${(sy + ty) / 2})`;
                    }
                });

                // Update background rectangle size based on text
                linkLabelGroup.select('.link-label-bg').each(function (d) {
                    const textNode = select(this.parentNode as SVGGElement).select('.link-label').node() as SVGTextElement;
                    if (textNode) {
                        const bbox = textNode.getBBox();
                        select(this)
                            .attr('x', bbox.x - 4)
                            .attr('y', bbox.y - 2)
                            .attr('width', bbox.width + 8)
                            .attr('height', bbox.height + 4);
                    }
                });

                node.attr('transform', d => `translate(${d.x!},${d.y!})`);
            }

            return simulation;
        }

        function setupGroupedView(svg: Selection<SVGSVGElement, unknown, null, undefined>, g: Selection<SVGGElement, unknown, null, undefined>, nodes: SimulationNode[], categoryId: string) {
            const category = tagCategories.find(c => c.id === categoryId);
            if (!category) return;

            // 1. Identify groups (tags in this category)
            const groups = category.tags.map(t => ({ id: t.id, name: t.label, color: t.color || category.color }));
            // Add an "Others" group
            groups.push({ id: 'other', name: '未分類', color: '#6b7280' });

            const groupIds = new Set(groups.map(g => g.id));

            // 2. Assign nodes to groups
            const nodesWithGroup = nodes.map(n => {
                const tagId = n.tagIds.find(tid => category.tags.some(t => t.id === tid));
                const groupId = tagId || 'other';
                return {
                    ...n,
                    groupId
                };
            });

            // 3. Calculate group centers (Circle layout)
            const groupCenters: Record<string, { x: number, y: number }> = {};
            const groupRadius = 120; // Radius of each group circle
            const padding = 40; // Minimum distance between group circles

            // Calculate layout radius based on number of groups to prevent overlap
            // Circumference needed = count * (diameter + padding)
            // Radius needed = Circumference / 2PI
            const count = groups.length - 1; // Exclude center
            const minCircumference = count * (groupRadius * 2 + padding);
            const layoutRadius = Math.max(300, minCircumference / (2 * Math.PI));

            const angleStep = (2 * Math.PI) / count;

            // Place 'other' in the center
            groupCenters['other'] = { x: 0, y: 0 };

            // Place other groups around
            let currentAngle = -Math.PI / 2; // Start from top
            groups.forEach(group => {
                if (group.id !== 'other') {
                    groupCenters[group.id] = {
                        x: Math.cos(currentAngle) * layoutRadius,
                        y: Math.sin(currentAngle) * layoutRadius
                    };
                    currentAngle += angleStep;
                }
            });

            // 4. Draw Group Circles (Backgrounds)
            const groupNode = g.append('g')
                .attr('class', 'group-circles')
                .selectAll('g')
                .data(groups)
                .join('g')
                .attr('transform', d => `translate(${groupCenters[d.id].x}, ${groupCenters[d.id].y})`);

            // Background circle for the group
            groupNode.append('circle')
                .attr('r', groupRadius) // Radius of the group circle area
                .attr('fill', d => d.color)
                .attr('fill-opacity', 0.1)
                .attr('stroke', d => d.color)
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,5');

            // Group Label
            groupNode.append('text')
                .text(d => d.name)
                .attr('y', -(groupRadius + 10)) // Position above the circle
                .attr('text-anchor', 'middle')
                .attr('fill', d => d.color)
                .style('font-size', '16px')
                .style('font-weight', 'bold');


            // 5. Setup Simulation
            const simulation = forceSimulation<SimulationNode>(nodesWithGroup)
                .force('charge', forceManyBody().strength(-100)) // Repel each other slightly
                .force('collide', forceCollide(25)) // Prevent overlap (node radius 20 + padding)
                // Pull nodes to their group center
                .force('x', forceX<SimulationNode>(d => groupCenters[d.groupId || 'other'].x).strength(0.1))
                .force('y', forceY<SimulationNode>(d => groupCenters[d.groupId || 'other'].y).strength(0.1))
                .on('tick', ticked);


            // 6. Draw Nodes
            const nodeRadius = 20;

            const node = g.append('g')
                .attr('class', 'nodes')
                .selectAll('g')
                .data(nodesWithGroup)
                .join('g')
                .style('cursor', 'pointer')
                .on('click', (event, d) => {
                    if (event.defaultPrevented) return;
                    onNodeClick(d);
                })
                .call(dragFn(simulation));

            node.append('circle')
                .attr('r', nodeRadius)
                .attr('stroke', '#fff')
                .attr('stroke-width', 1.5)
                .attr('fill', '#333');

            node.append('clipPath')
                .attr('id', d => `clip-grp-${d.id}`)
                .append('circle')
                .attr('r', nodeRadius);

            node.append('image')
                .attr('xlink:href', d => d.image || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(d.name)}`)
                .attr('x', -nodeRadius)
                .attr('y', -nodeRadius)
                .attr('height', nodeRadius * 2)
                .attr('width', nodeRadius * 2)
                .attr('clip-path', d => `url(#clip-grp-${d.id})`);

            node.append('text')
                .text(d => d.name)
                .attr('y', nodeRadius + 15)
                .attr('text-anchor', 'middle')
                .attr('fill', 'white')
                .style('font-size', '12px')
                .style('paint-order', 'stroke')
                .style('stroke', '#111827')
                .style('stroke-width', '3px');


            function ticked() {
                node.attr('transform', d => `translate(${d.x!},${d.y!})`);
            }

            return simulation;
        }


        return () => {
            if (simulation) simulation.stop();
        };
    }, [graphData, onNodeClick, viewMode, groupingCategoryId, tagCategories, singleSelectCategories]);

    return (
        <div ref={containerRef} className="w-full h-full bg-gray-900 overflow-hidden relative">
            <div className="absolute top-4 left-4 z-10 p-2 bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-lg flex items-center gap-4 border border-gray-700">
                <div className="flex bg-gray-900 rounded-md p-1 border border-gray-600">
                    <button
                        onClick={() => setViewMode('individual')}
                        title="個人視圖"
                        className={`p-2 rounded-md transition-colors ${viewMode === 'individual' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                    >
                        <UserIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('grouped')}
                        title="分類群組"
                        className={`p-2 rounded-md transition-colors ${viewMode === 'grouped' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                    >
                        <ClusterIcon className="w-5 h-5" />
                    </button>
                </div>
                {viewMode === 'grouped' && (
                    <select
                        value={groupingCategoryId}
                        onChange={(e) => setGroupingCategoryId(e.target.value)}
                        disabled={singleSelectCategories.length === 0}
                        className="bg-gray-700 text-white text-sm rounded-md p-2 border border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">選擇單選分類...</option>
                        {singleSelectCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                )}
            </div>
            <svg ref={svgRef}></svg>
            {characters.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-center text-gray-500 pointer-events-none">
                    <div>
                        <p className="text-xl">關係圖是空的。</p>
                        <p className="mt-2">請到「角色列表」頁面新增一些角色和關係。</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RelationshipGraph;
