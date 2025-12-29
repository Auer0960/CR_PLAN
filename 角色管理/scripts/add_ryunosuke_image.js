import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const characterId = 'e4a5d8f9b2c3';
const characterName = '相田 龍之介';
const sourceImage = 'c:/Users/Auer0960/Desktop/專區/CR專案/文件/CursorAI_CR專用/CR母專案劇情資料/character/相田 龍之介/cr102.png';
const outputDir = path.join(__dirname, '../public/character_images');
const thumbDir = path.join(outputDir, 'thumbnails');

async function processImage() {
    console.log(`開始處理圖片: ${characterName}`);

    // Create directories if not exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
    }

    const destFilename = `${characterId}_cr102.png`;
    const destPath = path.join(outputDir, destFilename);
    const thumbPath = path.join(thumbDir, destFilename);

    try {
        // 1. Main Image Optimization (Max width 1200px)
        await sharp(sourceImage)
            .resize({ width: 1200, withoutEnlargement: true })
            .toFile(destPath);
        console.log(`✓ 主圖已處理: ${destFilename}`);

        // 2. Thumbnail Generation (Width 200px)
        await sharp(sourceImage)
            .resize({ width: 200 })
            .toFile(thumbPath);
        console.log(`✓ 縮圖已生成: thumbnails/${destFilename}`);

        console.log('\n圖片處理完成！');
    } catch (err) {
        console.error('圖片處理失敗:', err);
        process.exit(1);
    }
}

processImage();

