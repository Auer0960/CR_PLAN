import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
// Load environment variables manually
const envPath = path.join(__dirname, '../.env');
let envConfig = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            envConfig[key] = value;
        }
    });
}

// Configuration
let CHARACTERS_DIR = envConfig.CHARACTERS_DIR || 'c:/Users/Auer0960/Desktop/專區/CR專案/文件/CursorAI_CR專用/CR母專案劇情資料/character';

// Resolve relative paths
if (!path.isAbsolute(CHARACTERS_DIR)) {
    CHARACTERS_DIR = path.resolve(__dirname, '..', CHARACTERS_DIR);
}

console.log(`Using Character Directory: ${CHARACTERS_DIR}`);

const OUTPUT_FILE = path.join(__dirname, '../public/cr_data.json');

// Helper to generate stable ID from string
function generateId(name) {
    return crypto.createHash('md5').update(name).digest('hex').substring(0, 12);
}

// Helper for random IDs
function generateRandomId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function extractData() {
    console.log('Starting data extraction...');

    if (!fs.existsSync(CHARACTERS_DIR)) {
        console.error(`Directory not found: ${CHARACTERS_DIR}`);
        return;
    }

    const characters = [];
    const relationships = [];
    const characterImages = [];
    const characterMap = new Map(); // Name -> ID

    // 1. Scan directories
    const entries = fs.readdirSync(CHARACTERS_DIR, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) {
            const charName = entry.name;
            const charDir = path.join(CHARACTERS_DIR, charName);

            // Look for *人物設定.md
            const files = fs.readdirSync(charDir);
            const settingFile = files.find(f => f.endsWith('人物設定.md'));

            if (settingFile) {
                const content = fs.readFileSync(path.join(charDir, settingFile), 'utf-8');
                const charId = generateId(charName); // Stable ID

                characterMap.set(charName, charId);

                // Extract basic info
                const profile = {};

                // Extract Appearance
                const appearanceMatch = content.match(/## 外觀([\s\S]*?)(?=\n##\s|$)/);
                if (appearanceMatch) profile.appearance = appearanceMatch[1].trim();

                // Extract Personality
                const personalityMatch = content.match(/## 性格特徵([\s\S]*?)(?=\n##\s|$)/);
                if (personalityMatch) profile.personality = personalityMatch[1].trim();

                // Extract Background
                const backgroundMatch = content.match(/## 背景故事([\s\S]*?)(?=\n##\s|$)/);
                const jobMatch = content.match(/## 職業背景([\s\S]*?)(?=\n##\s|$)/);
                let backgroundText = '';
                if (jobMatch) backgroundText += `### 職業背景\n${jobMatch[1].trim()}\n\n`;
                if (backgroundMatch) backgroundText += `### 背景故事\n${backgroundMatch[1].trim()}`;
                if (backgroundText) profile.background = backgroundText.trim();

                // Extract Specialty/Interests
                const specialtyMatch = content.match(/## 專長與興趣([\s\S]*?)(?=\n##\s|$)/);
                if (specialtyMatch) profile.specialty = specialtyMatch[1].trim();

                // Extract Quote
                const quoteMatch = content.match(/## 語氣示例([\s\S]*?)(?=\n##\s|$)/);
                if (quoteMatch) profile.quote = quoteMatch[1].trim();

                // Extract Avatar Settings
                const avatarMatch = content.match(/## 頭像設定([\s\S]*?)(?=\n##\s|$)/);
                let preferredAvatar = null;
                if (avatarMatch) {
                    const avatarText = avatarMatch[1];
                    const fileMatch = avatarText.match(/檔案[:：]\s*(.+)/);
                    if (fileMatch) {
                        preferredAvatar = fileMatch[1].trim();
                    }
                }

                const newChar = {
                    id: charId,
                    name: charName,
                    notes: `From ${settingFile}`,
                    tagIds: [],
                    profile: profile,
                    image: undefined // Will be set if image found
                };
                characters.push(newChar);

                // Process Images
                const imageFiles = fs.readdirSync(charDir).filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file));

                if (imageFiles.length > 0) {
                    // Create images directory if not exists
                    const publicImagesDir = path.join(path.dirname(OUTPUT_FILE), 'character_images');
                    if (!fs.existsSync(publicImagesDir)) {
                        fs.mkdirSync(publicImagesDir, { recursive: true });
                    }

                    // Create thumbnails directory
                    const publicThumbDir = path.join(publicImagesDir, 'thumbnails');
                    if (!fs.existsSync(publicThumbDir)) {
                        fs.mkdirSync(publicThumbDir, { recursive: true });
                    }

                    let mainImageSet = false;

                    // Use for...of loop for async operations
                    for (const [index, imgFile] of imageFiles.entries()) {
                        const srcPath = path.join(charDir, imgFile);

                        // Sanitize filename: replace non-alphanumeric chars (except dot) with underscore
                        const sanitizedImgFile = imgFile.replace(/[^a-zA-Z0-9.\u4e00-\u9fa5_-]/g, '_');
                        const destFilename = `${charId}_${sanitizedImgFile}`;

                        const destPath = path.join(publicImagesDir, destFilename);
                        const thumbPath = path.join(publicThumbDir, destFilename);
                        const webPath = `/character_images/${destFilename}`;

                        // Image Processing with Sharp
                        try {
                            // 1. Main Image Optimization (Max width 1200px)
                            // Only process if it doesn't exist or we want to force update. 
                            // For simplicity in this script, we overwrite to ensure latest optimization.
                            await sharp(srcPath)
                                .resize({ width: 1200, withoutEnlargement: true }) // Limit width to 1200px
                                .toFile(destPath);

                            // 2. Thumbnail Generation (Width 200px)
                            await sharp(srcPath)
                                .resize({ width: 200 })
                                .toFile(thumbPath);

                            // console.log(`Processed: ${destFilename}`);
                        } catch (err) {
                            console.error(`Failed to process image ${imgFile} for ${charName}:`, err);
                            // Fallback to copy if sharp fails? Or just skip? 
                            // Let's try copy as fallback for main image at least
                            try {
                                fs.copyFileSync(srcPath, destPath);
                            } catch (copyErr) {
                                console.error('Fallback copy failed:', copyErr);
                            }
                        }

                        // Set main avatar logic
                        if (preferredAvatar && imgFile.includes(preferredAvatar)) {
                            newChar.image = webPath;
                            mainImageSet = true;
                        } else if (!preferredAvatar && index === 0) {
                            newChar.image = webPath;
                            mainImageSet = true;
                        }

                        // Add to characterImages
                        characterImages.push({
                            id: generateId(charName + imgFile), // Stable Image ID
                            characterId: charId,
                            imageDataUrl: webPath,
                            tagIds: [],
                            notes: `Imported from ${imgFile}`
                        });
                    }

                    // Fallback: If preferred avatar was set but not found, use the first image
                    if (!mainImageSet && imageFiles.length > 0 && preferredAvatar) {
                        console.warn(`Preferred avatar "${preferredAvatar}" not found for ${charName}, falling back to first image.`);
                        const sanitizedImgFile = imageFiles[0].replace(/[^a-zA-Z0-9.\u4e00-\u9fa5_-]/g, '_');
                        const firstSafeFilename = `${charId}_${sanitizedImgFile}`;
                        newChar.image = `/character_images/${firstSafeFilename}`;
                    }
                }

                // Parse Relationships
                const relSectionMatch = content.match(/## 人際關係([\s\S]*?)(?=\n##\s|$)/);
                if (relSectionMatch) {
                    const relText = relSectionMatch[1];
                    if (charName === '西奧多' || charName === '小島 繪里奈') {
                        console.log(`Found relationship text for ${charName}:`, relText);
                    }
                    const relLines = relText.split('\n');
                    for (const line of relLines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('-')) {
                            const match = trimmed.match(/-\s*(?:與)?\s*([^：:]+?)\s*[：:](.*)/);
                            if (match) {
                                const targetName = match[1].trim();
                                const fullDescription = match[2].trim();

                                // Filter out non-character entries
                                if (targetName.includes('特殊羈絆') || targetName.includes('關係列表')) {
                                    continue;
                                }

                                const splitMatch = fullDescription.match(/^([^，。！？、；：（(]+)/);
                                let shortLabel = splitMatch ? splitMatch[1].trim() : fullDescription;

                                if (shortLabel.length > 12) {
                                    shortLabel = shortLabel.substring(0, 12) + '...';
                                }

                                relationships.push({
                                    sourceName: charName,
                                    targetName: targetName,
                                    label: shortLabel,
                                    description: fullDescription
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // 2. Resolve Relationship IDs
    const finalRelationships = [];
    for (const rel of relationships) {
        const sourceId = characterMap.get(rel.sourceName);
        let targetId = characterMap.get(rel.targetName);

        if (rel.sourceName === '小島 繪里奈') {
            console.log(`Resolving relationship for Kojima: -> ${rel.targetName}`);
            console.log(`  Target ID found directly? ${targetId}`);
            if (!targetId) {
                console.log(`  Map has target? ${characterMap.has(rel.targetName)}`);
            }
        }

        if (!targetId) {
            // Fuzzy match attempt - Stricter rules to avoid false positives (e.g., 安 -> 安藤 加奈)
            // Only attempt fuzzy match if the name is long enough used to be specific
            if (rel.targetName.length >= 2) {
                for (const [name, id] of characterMap.entries()) {
                    // Only check if targetName is part of name (e.g. "To" -> "Theodore" is bad, but "Theodore" -> "Theodore" handled by map)
                    // If targetName is "安", length is 1, so we skip.
                    // If targetName is "安藤", maybe acceptable to match "安藤 加奈".
                    if (name.includes(rel.targetName)) {
                        targetId = id;
                        break;
                    }
                }
            }
        }

        if (sourceId && targetId) {
            finalRelationships.push({
                id: generateId(sourceId + targetId + rel.label), // Stable ID
                source: sourceId,
                target: targetId,
                label: rel.label,
                description: rel.description,
                arrowStyle: 'arrow'
            });
        }
    }

    const output = {
        characters,
        relationships: finalRelationships,
        tagCategories: [],
        characterImages: characterImages
    };

    const publicDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`Data extracted to ${OUTPUT_FILE}`);
    console.log(`Found ${characters.length} characters and ${finalRelationships.length} relationships.`);
}

extractData();
