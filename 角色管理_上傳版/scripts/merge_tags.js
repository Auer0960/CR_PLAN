// merge_tags.js
const fs = require('fs');
const path = require('path');

const csvPath = path.join('c:/Users/Auer0960/Downloads/角色管理/local', '上市角色列表 - 角色TAG (1).csv');
const jsonPath = path.join('c:/Users/Auer0960/Downloads/角色管理', 'user_data.json');

function parseCSV(content) {
    const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
    // Skip first two lines (description and header)
    const dataLines = lines.slice(2);
    const nameMap = {};
    const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
    for (const line of dataLines) {
        const parts = line.split(',');
        const charId = parts[0].trim();
        const nameRaw = parts[1] || '';
        const name = nameRaw.replace(/"/g, '').trim();
        const tags = line.match(uuidRegex) || [];
        if (name) {
            nameMap[name] = tags;
        }
    }
    return nameMap;
}

try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const nameTagMap = parseCSV(csvContent);
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (!jsonData.characters) throw new Error('No characters field in JSON');
    let updated = 0;
    for (const [key, char] of Object.entries(jsonData.characters)) {
        const charName = char.name;
        if (charName && nameTagMap[charName]) {
            char.tagIds = nameTagMap[charName];
            updated++;
        }
    }
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log(`Merge completed. Updated ${updated} characters based on name matching.`);
} catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
}
