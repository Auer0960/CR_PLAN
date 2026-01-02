import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceFile = path.join(__dirname, '../user_data.json');
const destFile = path.join(__dirname, '../public/user_data.json');

try {
    if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, destFile);
        console.log('✅ Copied user_data.json to public folder');
    } else {
        console.warn('⚠️ user_data.json not found in root directory');
    }
} catch (error) {
    console.error('❌ Failed to copy user_data.json:', error);
    process.exit(1);
}




