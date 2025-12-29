import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '../user_data.json');

function checkDuplicates() {
    if (!fs.existsSync(DATA_FILE)) {
        console.error(`Data file not found: ${DATA_FILE}`);
        return;
    }

    const userData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const characterImages = userData.characterImages || [];

    console.log(`Total images: ${characterImages.length}`);

    const idMap = new Map();
    const urlMap = new Map();
    const duplicates = [];

    characterImages.forEach((img, index) => {
        // Check ID duplicates
        if (idMap.has(img.id)) {
            duplicates.push({ type: 'ID', value: img.id, index, originalIndex: idMap.get(img.id) });
        } else {
            idMap.set(img.id, index);
        }

        // Check URL duplicates
        if (urlMap.has(img.imageDataUrl)) {
            duplicates.push({ type: 'URL', value: img.imageDataUrl, index, originalIndex: urlMap.get(img.imageDataUrl) });
        } else {
            urlMap.set(img.imageDataUrl, index);
        }
    });

    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicates:`);
        duplicates.forEach(d => {
            console.log(`- Type: ${d.type}, Value: ${d.value} (Index: ${d.index}, Original: ${d.originalIndex})`);
        });
    } else {
        console.log('No duplicates found.');
    }
}

checkDuplicates();
