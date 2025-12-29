import fs from 'fs';
import path from 'path';
import { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import sharp from 'sharp';

// Define paths
// Load environment variables manually to avoid dependency issues
const envPath = path.resolve(__dirname, '.env');
let envConfig: Record<string, string> = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
            envConfig[key] = value;
        }
    });
}

// Define paths
const USER_DATA_FILE = path.resolve(__dirname, 'user_data.json');
let CHARACTERS_DIR = envConfig.CHARACTERS_DIR || 'c:/Users/Auer0960/Desktop/專區/CR專案/文件/CursorAI_CR專用/CR母專案劇情資料/character'; // Fallback to original if missing

// Resolve relative paths
if (!path.isAbsolute(CHARACTERS_DIR)) {
    CHARACTERS_DIR = path.resolve(__dirname, CHARACTERS_DIR);
}

console.log(`[Local API] Using Character Data Directory: ${CHARACTERS_DIR}`);


function parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                if (!body) resolve({});
                else resolve(JSON.parse(body));
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

export default function localApiPlugin(): Plugin {
    return {
        name: 'local-api-plugin',
        configureServer(server) {
            server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
                const url = req.url?.split('?')[0]; // Simple URL parsing

                // API: Get User Data (支援 /api/user-data 和 /CR_PLAN/api/user-data)
                if ((url === '/api/user-data' || url === '/CR_PLAN/api/user-data') && req.method === 'GET') {
                    try {
                        if (fs.existsSync(USER_DATA_FILE)) {
                            const data = fs.readFileSync(USER_DATA_FILE, 'utf-8');
                            res.setHeader('Content-Type', 'application/json');
                            res.setHeader('Cache-Control', 'no-store');
                            res.end(data);
                        } else {
                            res.setHeader('Content-Type', 'application/json');
                            res.setHeader('Cache-Control', 'no-store');
                            res.end(JSON.stringify({}));
                        }
                    } catch (error) {
                        console.error('Error reading user data:', error);
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: 'Failed to read user data' }));
                    }
                    return;
                }

                // API: Save Metadata (支援 /api/save-metadata 和 /CR_PLAN/api/save-metadata)
                if ((url === '/api/save-metadata' || url === '/CR_PLAN/api/save-metadata') && req.method === 'POST') {
                    try {
                        const newData = await parseBody(req);
                        let currentData = {};

                        if (fs.existsSync(USER_DATA_FILE)) {
                            try {
                                currentData = JSON.parse(fs.readFileSync(USER_DATA_FILE, 'utf-8'));
                            } catch (e) {
                                console.warn('Corrupt user_data.json, starting fresh');
                            }
                        }

                        // Merge new data
                        const updatedData = { ...currentData, ...newData };

                        fs.writeFileSync(USER_DATA_FILE, JSON.stringify(updatedData, null, 2));

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Cache-Control', 'no-store');
                        res.end(JSON.stringify({ success: true, message: 'Metadata saved' }));
                    } catch (error) {
                        console.error('Error saving metadata:', error);
                        res.statusCode = 500;
                        res.setHeader('Cache-Control', 'no-store');
                        res.end(JSON.stringify({ success: false, error: 'Failed to save metadata' }));
                    }
                    return;
                }

                // API: Upload Image
                if (url === '/api/upload-image' && req.method === 'POST') {
                    try {
                        const body = await parseBody(req);
                        const { characterName, fileName, imageBase64 } = body;

                        if (!characterName || !fileName || !imageBase64) {
                            res.statusCode = 400;
                            res.end(JSON.stringify({ success: false, error: 'Missing required fields' }));
                            return;
                        }

                        // Remove header (data:image/png;base64,)
                        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
                        const buffer = Buffer.from(base64Data, 'base64');

                        // 1. Save to App public directory (Primary Storage for decoupled mode)
                        const publicDir = path.resolve(__dirname, 'public/character_images');
                        if (!fs.existsSync(publicDir)) {
                            fs.mkdirSync(publicDir, { recursive: true });
                        }
                        const publicPath = path.join(publicDir, fileName);
                        fs.writeFileSync(publicPath, buffer);

                        // 1.1 Generate Thumbnail for App
                        const publicThumbDir = path.join(publicDir, 'thumbnails');
                        if (!fs.existsSync(publicThumbDir)) {
                            fs.mkdirSync(publicThumbDir, { recursive: true });
                        }
                        const publicThumbPath = path.join(publicThumbDir, fileName);
                        try {
                            await sharp(buffer)
                                .resize(200) // Width 200px, auto height
                                .toFile(publicThumbPath);
                            console.log(`[Local API] Thumbnail generated: ${publicThumbPath}`);
                        } catch (err) {
                            console.error('[Local API] Failed to generate public thumbnail:', err);
                        }


                        // 2. Save to External Character Directory (Optional Backup/Sync)
                        // If path is valid and exists, we sync to it. If not (decoupled mode), we skip.
                        const charDir = path.join(CHARACTERS_DIR, characterName);
                        if (fs.existsSync(CHARACTERS_DIR) && fs.existsSync(charDir)) {
                            try {
                                const filePath = path.join(charDir, fileName);
                                fs.writeFileSync(filePath, buffer);
                                console.log(`[Local API] Synced to external: ${filePath}`);

                                // 2.1 Generate Thumbnail in External Directory
                                const charThumbDir = path.join(charDir, 'thumbnails');
                                if (!fs.existsSync(charThumbDir)) {
                                    fs.mkdirSync(charThumbDir, { recursive: true });
                                }
                                const charThumbPath = path.join(charThumbDir, fileName);
                                await sharp(buffer)
                                    .resize(200)
                                    .toFile(charThumbPath);
                                console.log(`[Local API] Synced external thumbnail: ${charThumbPath}`);

                            } catch (syncErr) {
                                console.warn('[Local API] Warning: Failed to sync to external directory:', syncErr);
                                // We do NOT fail the request if sync fails, as long as public save worked.
                            }
                        } else {
                            console.log('[Local API] External character directory not found, running in reduced mode.');
                        }

                        // Return the public URL
                        const publicUrl = `/character_images/${fileName}`;

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ success: true, path: publicUrl }));
                    } catch (error) {
                        console.error('Error uploading image:', error);
                        res.statusCode = 500;
                        res.end(JSON.stringify({ success: false, error: 'Failed to upload image' }));
                    }
                    return;
                }

                next();
            });
        },
    };
}
