import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const testImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
);

(async () => {
    try {
        console.log('Checking sharp version:', await sharp().version);

        // Create verify_output directory
        const outDir = path.resolve('verify_output');
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

        const outFile = path.join(outDir, 'test_thumb.png');

        // Attempt resize
        await sharp(testImageBuffer)
            .resize(200)
            .toFile(outFile);

        console.log('Successfully generated thumbnail with sharp!');
        console.log('Output path:', outFile);

        // Clean up
        fs.unlinkSync(outFile);
        fs.rmdirSync(outDir);

    } catch (err) {
        console.error('Sharp verification failed:', err);
        process.exit(1);
    }
})();
