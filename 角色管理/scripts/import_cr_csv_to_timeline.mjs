import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const CSV_FILE = path.resolve(ROOT_DIR, '備份', 'CR.csv');
const CR_DATA_FILE = path.resolve(ROOT_DIR, 'public', 'cr_data.json');
const TIMELINE_DATA_FILE = path.resolve(ROOT_DIR, 'public', 'timeline_data.json');
const BACKUP_FILE = path.resolve(ROOT_DIR, 'public', 'timeline_data.backup.json');

const GAME_START_YEAR = 200;

// CSV Parser (支援 quoted 欄位、欄位內換行、CRLF)
function parseCSV(content) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < content.length) {
        const char = content[i];
        const nextChar = i + 1 < content.length ? content[i + 1] : null;
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i += 2;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // Field separator
            currentRow.push(currentField.trim());
            currentField = '';
            i++;
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            // Row separator
            currentRow.push(currentField.trim());
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
            if (char === '\r' && nextChar === '\n') {
                i += 2;
            } else {
                i++;
            }
        } else {
            currentField += char;
            i++;
        }
    }
    
    // Handle last row
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }
    
    return rows;
}

// 讀取欄位索引
function getColumnIndex(header, columnName) {
    const idx = header.findIndex(col => col === columnName);
    if (idx === -1) {
        console.warn(`⚠️  警告：找不到欄位 "${columnName}"`);
    }
    return idx;
}

// 分割多行欄位（換行分隔）
function splitMultiLine(value) {
    if (!value || value.trim() === '') return [];
    return value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
}

// 解析年份（處理空值）
function parseYear(value) {
    if (!value || value.trim() === '') return null;
    const num = parseInt(value.trim(), 10);
    return isNaN(num) ? null : num;
}

// 錯誤收集器
class ValidationErrors {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }
    
    addError(type, message, row = null) {
        this.errors.push({ type, message, row });
    }
    
    addWarning(type, message, row = null) {
        this.warnings.push({ type, message, row });
    }
    
    hasErrors() {
        return this.errors.length > 0;
    }
    
    print() {
        if (this.errors.length > 0) {
            console.error('\n❌ 致命錯誤：');
            this.errors.forEach((e, i) => {
                console.error(`  ${i + 1}. [${e.type}] ${e.message}${e.row ? ` (行 ${e.row})` : ''}`);
            });
        }
        if (this.warnings.length > 0) {
            console.warn('\n⚠️  警告：');
            this.warnings.forEach((w, i) => {
                console.warn(`  ${i + 1}. [${w.type}] ${w.message}${w.row ? ` (行 ${w.row})` : ''}`);
            });
        }
    }
}

// 主匯入函數
async function importTimeline() {
    console.log('🚀 開始匯入 CR.csv 到時間軸...\n');
    
    // 1. 讀取 CSV
    console.log('📖 讀取 CSV 檔案...');
    if (!fs.existsSync(CSV_FILE)) {
        console.error(`❌ 找不到 CSV 檔案：${CSV_FILE}`);
        process.exit(1);
    }
    const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');
    const rows = parseCSV(csvContent);
    
    if (rows.length < 2) {
        console.error('❌ CSV 檔案格式錯誤：至少需要標題列和一行資料');
        process.exit(1);
    }
    
    const header = rows[0];
    const dataRows = rows.slice(1);
    
    console.log(`✅ 讀取完成：${dataRows.length} 筆資料\n`);
    
    // 2. 讀取角色資料（用於匹配 Person）
    console.log('👥 讀取角色資料...');
    let characters = [];
    if (fs.existsSync(CR_DATA_FILE)) {
        const crData = JSON.parse(fs.readFileSync(CR_DATA_FILE, 'utf-8'));
        characters = crData.characters || [];
        console.log(`✅ 載入 ${characters.length} 個角色\n`);
    } else {
        console.warn('⚠️  找不到 cr_data.json，將無法匹配角色\n');
    }
    
    // 建立角色名稱 → ID 對應表
    const characterNameMap = new Map();
    characters.forEach(char => {
        characterNameMap.set(char.name, char.id);
    });
    
    // 3. 取得欄位索引
    const colType = getColumnIndex(header, 'Type');
    const colLabel = getColumnIndex(header, 'Label');
    const colInternalId = getColumnIndex(header, 'Internal ID');
    const colSummary = getColumnIndex(header, 'Summary');
    const colParent = getColumnIndex(header, 'Parent');
    const colOngoing = getColumnIndex(header, 'Ongoing');
    const colStartDate = getColumnIndex(header, 'Start Date');
    const colEndDate = getColumnIndex(header, 'End Date');
    const colPerson = getColumnIndex(header, 'Person');
    const colLocation = getColumnIndex(header, 'Location');
    const colTags = getColumnIndex(header, 'Tags');
    const col勢力 = getColumnIndex(header, '勢力');
    const col特殊專有名詞 = getColumnIndex(header, '特殊專有名詞');
    const colHEvent = getColumnIndex(header, 'H Event');
    const colRelatesTo = getColumnIndex(header, 'Relates to');
    const colBlockedBy = getColumnIndex(header, 'Blocked by');
    const colBlocks = getColumnIndex(header, 'Blocks');
    const col深層設定 = getColumnIndex(header, '深層設定');
    const col額外資訊 = getColumnIndex(header, '額外資訊');
    
    // 4. 先處理 Location（建立 map）
    console.log('📍 處理地點資料...');
    const locationMap = new Map(); // label -> TimelineLocation
    const locationIdMap = new Map(); // internalId -> TimelineLocation
    
    const locationRows = dataRows.filter(row => row[colType] === 'Location');
    let minYear = Infinity;
    
    // 先建立所有地點（不處理 parentId）
    for (let i = 0; i < locationRows.length; i++) {
        const row = locationRows[i];
        const internalId = row[colInternalId]?.trim();
        const label = row[colLabel]?.trim();
        const summary = row[colSummary]?.trim() || '';
        
        if (!internalId || !label) {
            console.warn(`⚠️  地點資料不完整（行 ${i + 2}）：缺少 Internal ID 或 Label`);
            continue;
        }
        
        const now = Date.now();
        const location = {
            id: internalId,
            label: label,
            description: summary,
            parentId: undefined, // 稍後處理
            createdAt: now,
            updatedAt: now,
            _parentLabel: row[colParent]?.trim() // 暫存 parent label
        };
        
        locationMap.set(label, location);
        locationIdMap.set(internalId, location);
    }
    
    // 處理地點的 parentId（以 label 反查成 id）
    locationMap.forEach(loc => {
        if (loc._parentLabel) {
            const parentLoc = locationMap.get(loc._parentLabel);
            if (parentLoc) {
                loc.parentId = parentLoc.id;
            }
        }
        delete loc._parentLabel; // 清理暫存欄位
    });
    
    console.log(`✅ 建立 ${locationMap.size} 個地點\n`);
    
    // 5. 處理 Event（第一輪：建立基本資料）
    console.log('📅 處理事件資料（第一輪：建立基本資料）...');
    const eventMap = new Map(); // internalId -> TimelineEvent
    const eventLabelMap = new Map(); // label -> internalId
    
    const eventRows = dataRows.filter(row => row[colType] === 'Event');
    
    // 先找出所有有年份的事件，計算 minYear
    for (const row of eventRows) {
        const startYear = parseYear(row[colStartDate]);
        if (startYear !== null && startYear < minYear) {
            minYear = startYear;
        }
    }
    
    // 缺年事件的年份 = minYear - 1
    const missingYearValue = minYear !== Infinity ? minYear - 1 : GAME_START_YEAR - 1;
    
    const validation = new ValidationErrors();
    
    for (let i = 0; i < eventRows.length; i++) {
        const row = eventRows[i];
        const internalId = row[colInternalId]?.trim();
        const label = row[colLabel]?.trim();
        
        if (!internalId || !label) {
            validation.addError('MISSING_REQUIRED', `事件缺少 Internal ID 或 Label`, i + 2);
            continue;
        }
        
        // 年份處理
        let startYear = parseYear(row[colStartDate]);
        if (startYear === null) {
            startYear = missingYearValue;
            validation.addWarning('MISSING_YEAR', `事件 "${label}" 缺少 Start Date，設為 ${missingYearValue}`, i + 2);
        }
        const relativeStartYear = startYear - GAME_START_YEAR;
        
        let endYear = parseYear(row[colEndDate]);
        const relativeEndYear = endYear !== null ? endYear - GAME_START_YEAR : undefined;
        
        // Ongoing
        const ongoing = row[colOngoing]?.trim().toLowerCase() === 'true';
        
        // 地點處理（只取第一個）
        const locationStr = row[colLocation]?.trim() || '';
        const locations = splitMultiLine(locationStr);
        const primaryLocation = locations.length > 0 ? locations[0] : '';
        const extraLocations = locations.slice(1);
        
        // Person 處理（匹配角色）
        const personStr = row[colPerson]?.trim() || '';
        const personNames = splitMultiLine(personStr);
        const characterIds = [];
        const npcNames = [];
        
        for (const name of personNames) {
            const charId = characterNameMap.get(name);
            if (charId) {
                characterIds.push(charId);
            } else {
                npcNames.push(name);
            }
        }
        
        // 建立事件
        const now = Date.now();
        const event = {
            id: internalId,
            title: label,
            startYear: relativeStartYear,
            endYear: relativeEndYear,
            isContinuous: ongoing,
            size: 'medium', // 預設 medium
            parentEventIds: [], // 稍後處理
            relatedEventIds: [], // 稍後處理
            characterIds: characterIds,
            npcNames: npcNames,
            tagIds: [], // 稍後處理
            publicInfo: row[colSummary]?.trim() || '',
            deepInfo: row[col深層設定]?.trim() || '',
            notes: (row[col額外資訊]?.trim() || '') + (extraLocations.length > 0 ? `\n\n其他地點：${extraLocations.join('、')}` : ''),
            location: primaryLocation,
            createdAt: now,
            updatedAt: now
        };
        
        eventMap.set(internalId, event);
        eventLabelMap.set(label, internalId);
    }
    
    console.log(`✅ 建立 ${eventMap.size} 個事件\n`);
    
    // 6. 處理事件關聯（第二輪：回填 parent/relates）
    console.log('🔗 處理事件關聯...');
    let fixedRefs = 0;
    let brokenRefs = 0;
    
    eventMap.forEach((event, internalId) => {
        const row = eventRows.find(r => r[colInternalId]?.trim() === internalId);
        if (!row) return;
        
        // Parent + Blocked by → parentEventIds
        const parentLabel = row[colParent]?.trim();
        const blockedByLabels = splitMultiLine(row[colBlockedBy]?.trim() || '');
        
        const allParentLabels = [parentLabel, ...blockedByLabels].filter(Boolean);
        for (const label of allParentLabels) {
            const parentId = eventLabelMap.get(label);
            if (parentId && parentId !== internalId) {
                event.parentEventIds.push(parentId);
            } else if (label) {
                validation.addWarning('BROKEN_REF', `事件 "${event.title}" 的 Parent/Blocked by "${label}" 找不到對應事件`, null);
                brokenRefs++;
            }
        }
        
        // Relates to + Blocks → relatedEventIds
        const relatesToLabels = splitMultiLine(row[colRelatesTo]?.trim() || '');
        const blocksLabels = splitMultiLine(row[colBlocks]?.trim() || '');
        
        const allRelatedLabels = [...relatesToLabels, ...blocksLabels];
        for (const label of allRelatedLabels) {
            const relatedId = eventLabelMap.get(label);
            if (relatedId && relatedId !== internalId) {
                event.relatedEventIds.push(relatedId);
            } else if (label) {
                validation.addWarning('BROKEN_REF', `事件 "${event.title}" 的 Relates to/Blocks "${label}" 找不到對應事件`, null);
                brokenRefs++;
            }
        }
        
        // 去除重複的 ID
        event.parentEventIds = [...new Set(event.parentEventIds)];
        event.relatedEventIds = [...new Set(event.relatedEventIds)];
    });
    
    console.log(`✅ 處理完成（修復 ${fixedRefs} 個引用，${brokenRefs} 個無法修復）\n`);
    
    // 7. 處理 Tags（從 Tags/勢力/特殊專有名詞/H Event）
    console.log('🏷️  處理事件標籤...');
    const tagMap = new Map(); // label -> TimelineTag
    const tagIdCounter = { count: 0 };
    
    function getOrCreateTag(label) {
        if (!label || label.trim() === '') return null;
        const trimmed = label.trim();
        if (tagMap.has(trimmed)) {
            return tagMap.get(trimmed);
        }
        tagIdCounter.count++;
        const tag = {
            id: `tag-${tagIdCounter.count}`,
            label: trimmed,
            color: getTagColor(tagIdCounter.count)
        };
        tagMap.set(trimmed, tag);
        return tag;
    }
    
    function getTagColor(index) {
        const colors = ['#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#06b6d4', '#f59e0b', '#ec4899'];
        return colors[index % colors.length];
    }
    
    // 收集所有標籤來源
    const allTagSources = new Set();
    eventRows.forEach(row => {
        const tags = splitMultiLine(row[colTags]?.trim() || '');
        const 勢力 = splitMultiLine(row[col勢力]?.trim() || '');
        const 特殊專有名詞 = splitMultiLine(row[col特殊專有名詞]?.trim() || '');
        const hEvent = splitMultiLine(row[colHEvent]?.trim() || '');
        
        [...tags, ...勢力, ...特殊專有名詞, ...hEvent].forEach(label => {
            if (label) allTagSources.add(label);
        });
    });
    
    // 建立所有 tags
    allTagSources.forEach(label => getOrCreateTag(label));
    
    // 為事件分配 tagIds
    eventMap.forEach((event, internalId) => {
        const row = eventRows.find(r => r[colInternalId]?.trim() === internalId);
        if (!row) return;
        
        const tags = splitMultiLine(row[colTags]?.trim() || '');
        const 勢力 = splitMultiLine(row[col勢力]?.trim() || '');
        const 特殊專有名詞 = splitMultiLine(row[col特殊專有名詞]?.trim() || '');
        const hEvent = splitMultiLine(row[colHEvent]?.trim() || '');
        
        const allLabels = [...tags, ...勢力, ...特殊專有名詞, ...hEvent];
        const tagIds = [];
        for (const label of allLabels) {
            const tag = getOrCreateTag(label);
            if (tag && !tagIds.includes(tag.id)) {
                tagIds.push(tag.id);
            }
        }
        event.tagIds = tagIds;
    });
    
    console.log(`✅ 建立 ${tagMap.size} 個標籤\n`);
    
    // 8. 處理地點的 parentId（檢查是否有錯誤）
    console.log('📍 檢查地點層級...');
    let locationParentErrors = 0;
    locationMap.forEach(loc => {
        if (loc.parentId) {
            const parentExists = locationIdMap.has(loc.parentId);
            if (!parentExists) {
                validation.addWarning('BAD_LOCATION_PARENT', `地點 "${loc.label}" 的 Parent ID "${loc.parentId}" 不存在`, null);
                loc.parentId = undefined; // 自動修復：移除無效 parentId
                locationParentErrors++;
            }
        }
    });
    
    if (locationParentErrors > 0) {
        console.log(`⚠️  修復 ${locationParentErrors} 個地點 parent 引用錯誤\n`);
    } else {
        console.log('✅ 地點層級檢查通過\n');
    }
    
    // 9. 輸出驗證結果
    validation.print();
    
    if (validation.hasErrors()) {
        console.error('\n❌ 匯入中止：發現致命錯誤');
        process.exit(1);
    }
    
    // 10. 建立 TimelineData
    console.log('📦 組裝 TimelineData...');
    const timelineData = {
        gameStartYear: GAME_START_YEAR,
        events: Array.from(eventMap.values()),
        locations: Array.from(locationMap.values()).map(loc => loc.label), // 舊格式相容
        locationNodes: Array.from(locationMap.values()),
        tags: Array.from(tagMap.values())
    };
    
    console.log(`✅ 組裝完成：
  - 事件：${timelineData.events.length} 個
  - 地點：${timelineData.locationNodes.length} 個
  - 標籤：${timelineData.tags.length} 個\n`);
    
    // 11. 備份現有檔案
    console.log('💾 備份現有檔案...');
    if (fs.existsSync(TIMELINE_DATA_FILE)) {
        fs.copyFileSync(TIMELINE_DATA_FILE, BACKUP_FILE);
        console.log(`✅ 已備份至：${BACKUP_FILE}\n`);
    } else {
        console.log('ℹ️  沒有現有檔案需要備份\n');
    }
    
    // 12. 寫入新檔案
    console.log('💾 寫入新檔案...');
    fs.writeFileSync(
        TIMELINE_DATA_FILE,
        JSON.stringify(timelineData, null, 2),
        'utf-8'
    );
    console.log(`✅ 已寫入：${TIMELINE_DATA_FILE}\n`);
    
    console.log('🎉 匯入完成！');
    console.log(`\n📊 統計：
  - 事件：${timelineData.events.length} 個
  - 地點：${timelineData.locationNodes.length} 個（含層級）
  - 標籤：${timelineData.tags.length} 個
  - 警告：${validation.warnings.length} 個
  - 錯誤：${validation.errors.length} 個`);
}

// 執行匯入
importTimeline().catch(err => {
    console.error('❌ 匯入失敗：', err);
    process.exit(1);
});

