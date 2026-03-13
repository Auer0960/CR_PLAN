import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '../public/character_images');
const MAX_WIDTH = 500;
const QUALITY = 80;

async function optimizeImages() {
    console.log('Starting image optimization...');

    if (!fs.existsSync(IMAGES_DIR)) {
        console.error(`Directory not found: ${IMAGES_DIR}`);
        return;
    }

    const files = fs.readdirSync(IMAGES_DIR).filter(file => /\.(png|jpg|jpeg|webp)$/i.test(file));
    console.log(`Found ${files.length} images.`);

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const file of files) {
        const filePath = path.join(IMAGES_DIR, file);

        try {
            const image = sharp(filePath);
            const metadata = await image.metadata();

            if (metadata.width && metadata.width > MAX_WIDTH) {
                console.log(`Processing ${file} (Width: ${metadata.width}px -> ${MAX_WIDTH}px)...`);

                const buffer = await image
                    .resize({ width: MAX_WIDTH })
                    .jpeg({ quality: QUALITY, mozjpeg: true }) // Convert to JPEG for better compression, or keep original format?
                    // Actually, keeping original format is safer for transparency (PNG).
                    // Let's detect format.
                    .toBuffer();

                // If original was PNG, we should probably keep it PNG or WebP.
                // But to keep it simple and overwrite, we need to respect the extension or change it.
                // If we overwrite, we must output the same format.

                // Let's re-do:
                const pipeline = sharp(filePath).resize({ width: MAX_WIDTH });

                if (path.extname(file).toLowerCase() === '.png') {
                    await pipeline.png({ quality: QUALITY }).toFile(filePath + '.tmp');
                } else if (path.extname(file).toLowerCase() === '.webp') {
                    await pipeline.webp({ quality: QUALITY }).toFile(filePath + '.tmp');
                } else {
                    await pipeline.jpeg({ quality: QUALITY, mozjpeg: true }).toFile(filePath + '.tmp');
                }

                fs.renameSync(filePath + '.tmp', filePath);
                processedCount++;
            } else {
                // console.log(`Skipping ${file} (Width: ${metadata.width}px)`);
                skippedCount++;
            }
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
            errorCount++;
        }
    }

    console.log('-----------------------------------');
    console.log(`Optimization complete.`);
    console.log(`Processed: ${processedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
}

optimizeImages();
