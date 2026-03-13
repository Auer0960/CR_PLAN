const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CHARACTERS_DIR = 'c:/Users/Auer0960/Desktop/專區/CR專案/文件/CursorAI_CR專用/CR母專案劇情資料/character';

function generateId(text) {
    return crypto.createHash('md5').update(text).digest('hex').substring(0, 12);
}

const characterMap = new Map();

// 1. Scan directories and build character map
const charDirs = fs.readdirSync(CHARACTERS_DIR);

console.log('Scanning directories...');
for (const dir of charDirs) {
    const charDir = path.join(CHARACTERS_DIR, dir);
    if (fs.statSync(charDir).isDirectory()) {
        const files = fs.readdirSync(charDir);
        const settingFile = files.find(f => f.endsWith('人物設定.md'));

        if (settingFile) {
            const content = fs.readFileSync(path.join(charDir, settingFile), 'utf-8');
            const nameMatch = content.match(/#\s*(.+?)人物設定/);

            if (nameMatch) {
                const charName = nameMatch[1].trim();
                const charId = generateId(charName);
                characterMap.set(charName, charId);
                console.log(`Found character: "${charName}" (ID: ${charId})`);

                if (charName === '荻野 瑠衣') {
                    console.log('  Codes:', charName.split('').map(c => c.charCodeAt(0)));
                }
            }
        }
    }
}

// 2. Debug Kojima Erina
console.log('\n--- Debugging Kojima Erina ---');
const kojimaDir = path.join(CHARACTERS_DIR, '小島 繪里奈');
const kojimaFile = fs.readdirSync(kojimaDir).find(f => f.endsWith('人物設定.md'));
if (kojimaFile) {
    const content = fs.readFileSync(path.join(kojimaDir, kojimaFile), 'utf-8');
    const relSectionMatch = content.match(/## 人際關係([\s\S]*?)(?=\n##\s|$)/);
    if (relSectionMatch) {
        const relText = relSectionMatch[1];
        const relLines = relText.split('\n');
        for (const line of relLines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('-')) {
                const match = trimmed.match(/-\s*(?:與)?\s*([^：:]+?)\s*[：:](.*)/);
                if (match) {
                    const targetName = match[1].trim();
                    console.log(`Parsed Target: "${targetName}"`);

                    if (targetName === '荻野 瑠衣') {
                        console.log('  Target Codes:', targetName.split('').map(c => c.charCodeAt(0)));
                        const mapKey = '荻野 瑠衣';
                        console.log('  Map Key Codes:', mapKey.split('').map(c => c.charCodeAt(0)));
                        console.log('  Strict Equality:', targetName === mapKey);
                        console.log('  In Map?', characterMap.has(targetName));
                    }
                }
            }
        }
    }
}
