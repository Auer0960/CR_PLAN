import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, '../user_data.json');
const PUBLIC_DIR = path.join(__dirname, '../public');
const THUMBNAILS_DIR = path.join(PUBLIC_DIR, 'character_images/thumbnails');
const THUMBNAIL_WIDTH = 200;
const QUALITY = 80;

async function generateThumbnails() {
    console.log('Starting thumbnail generation...');

    if (!fs.existsSync(DATA_FILE)) {
        console.error(`Data file not found: ${DATA_FILE}`);
        return;
    }

    // Create thumbnails directory if it doesn't exist
    if (!fs.existsSync(THUMBNAILS_DIR)) {
        console.log(`Creating thumbnails directory: ${THUMBNAILS_DIR}`);
        fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
    }

    const userData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    const characterImages = userData.characterImages || [];

    console.log(`Found ${characterImages.length} images to process.`);

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let updatedCount = 0;

    for (const img of characterImages) {
        // Check if image path is valid (starts with /character_images/)
        if (!img.imageDataUrl || !img.imageDataUrl.startsWith('/character_images/')) {
            // Skip base64 or invalid paths for now, or handle them if needed
            // Assuming most are local paths based on previous inspection
            // console.log(`Skipping non-local image: ${img.id}`);
            skippedCount++;
            continue;
        }

        const originalRelPath = img.imageDataUrl;
        const originalAbsPath = path.join(PUBLIC_DIR, originalRelPath);
        const filename = path.basename(originalRelPath);
        const thumbnailFilename = `thumb_${filename}`;
        const thumbnailAbsPath = path.join(THUMBNAILS_DIR, thumbnailFilename);
        const thumbnailRelPath = `/character_images/thumbnails/${thumbnailFilename}`;

        try {
            // Check if original file exists
            if (!fs.existsSync(originalAbsPath)) {
                console.warn(`Original image not found: ${originalAbsPath}`);
                errorCount++;
                continue;
            }

            // Check if thumbnail already exists
            if (!fs.existsSync(thumbnailAbsPath)) {
                // Generate thumbnail
                // console.log(`Generating thumbnail for ${filename}...`);
                await sharp(originalAbsPath)
                    .resize({ width: THUMBNAIL_WIDTH })
                    .jpeg({ quality: QUALITY, mozjpeg: true }) // Convert to JPEG for consistency and size
                    .toFile(thumbnailAbsPath);

                processedCount++;
            } else {
                // console.log(`Thumbnail already exists for ${filename}`);
                skippedCount++;
            }

            // Update user_data if thumbnailUrl is missing or different
            if (img.thumbnailUrl !== thumbnailRelPath) {
                img.thumbnailUrl = thumbnailRelPath;
                updatedCount++;
            }

        } catch (error) {
            console.error(`Error processing ${filename}:`, error);
            errorCount++;
        }
    }

    if (updatedCount > 0) {
        console.log(`Updating user_data.json with ${updatedCount} thumbnail paths...`);
        fs.writeFileSync(DATA_FILE, JSON.stringify(userData, null, 2), 'utf-8');
    }

    console.log('-----------------------------------');
    console.log(`Thumbnail generation complete.`);
    console.log(`Generated: ${processedCount}`);
    console.log(`Skipped (already exists/non-local): ${skippedCount}`);
    console.log(`Updated in DB: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
}

generateThumbnails();
