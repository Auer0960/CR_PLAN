import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userDataPath = path.join(__dirname, '../user_data.json');
const backupPath = path.join(__dirname, `../user_data.backup.${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

// Canonical IDs are the ones in cr_data.json (project data).
// Old IDs are duplicates that should be mapped into canonical ones.
const ID_MAP = {
  // 安東
  c8a2b1d3e4f5: '1a4889cddbd5',
  // 藤原 亞璃紗
  '8f7c3e9a2b1d': '5b0ba53871bb',
  // 相田 龍之介
  e4a5d8f9b2c3: 'c5c6abfed105',
};

const asArray = (v) => (Array.isArray(v) ? v : []);

function uniq(arr) {
  return Array.from(new Set(arr));
}

function mergeCharacterEntry(a = {}, b = {}) {
  // Prefer non-empty fields, union tagIds
  const tagIds = uniq([...(a.tagIds || []), ...(b.tagIds || [])].filter(Boolean));
  return {
    name: a.name || b.name,
    notes: a.notes || b.notes,
    image: a.image || b.image,
    avatarPosition: a.avatarPosition || b.avatarPosition,
    tagIds,
  };
}

function signatureOfRel(r) {
  return `${r.source}→${r.target}::${r.label || ''}::${r.arrowStyle || ''}::${r.description || ''}`;
}

function signatureOfImage(img) {
  // Dedup images by (characterId + imageDataUrl) primarily; fallback to URL
  const cid = img.characterId || '';
  const url = img.imageDataUrl || '';
  return `${cid}::${url}`;
}

function main() {
  if (!fs.existsSync(userDataPath)) {
    console.error(`❌ 找不到 user_data.json：${userDataPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(userDataPath, 'utf8');
  const data = JSON.parse(raw);

  // 0) backup
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ 已備份：${backupPath}`);

  // 1) Characters: merge old-id entries into canonical-id entries, then delete old
  const chars = data.characters && typeof data.characters === 'object' ? data.characters : {};

  for (const [oldId, newId] of Object.entries(ID_MAP)) {
    if (!chars[oldId]) continue;
    chars[newId] = mergeCharacterEntry(chars[newId], chars[oldId]);
    delete chars[oldId];
  }

  // Also normalize any stored image path (if it contains old IDs)
  for (const [oldId, newId] of Object.entries(ID_MAP)) {
    if (chars[newId] && typeof chars[newId].image === 'string') {
      chars[newId].image = chars[newId].image.replace(oldId, newId);
    }
  }

  data.characters = chars;

  // 2) Relationships: rewrite source/target, then dedupe
  const rels = asArray(data.relationships).map((r) => {
    const source = ID_MAP[r.source] || r.source;
    const target = ID_MAP[r.target] || r.target;
    return { ...r, source, target };
  });

  const seenRel = new Set();
  const dedupedRels = [];
  for (const r of rels) {
    const sig = signatureOfRel(r);
    if (seenRel.has(sig)) continue;
    seenRel.add(sig);
    dedupedRels.push(r);
  }
  data.relationships = dedupedRels;

  // 3) Character Images: rewrite characterId, then dedupe
  const imgs = asArray(data.characterImages).map((img) => {
    const characterId = ID_MAP[img.characterId] || img.characterId;
    const imageDataUrl = typeof img.imageDataUrl === 'string'
      ? Object.entries(ID_MAP).reduce((s, [oldId, newId]) => s.replace(oldId, newId), img.imageDataUrl)
      : img.imageDataUrl;
    return { ...img, characterId, imageDataUrl };
  });

  const seenImg = new Set();
  const dedupedImgs = [];
  for (const img of imgs) {
    const sig = signatureOfImage(img);
    if (seenImg.has(sig)) continue;
    seenImg.add(sig);
    dedupedImgs.push(img);
  }
  data.characterImages = dedupedImgs;

  // 4) deleted*Ids: rewrite any mapped IDs just in case
  data.deletedRelationshipIds = asArray(data.deletedRelationshipIds);
  data.deletedImageIds = asArray(data.deletedImageIds);

  // 5) Write back
  fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ 已完成：合併/去重 user_data.json（同名雙角色會消失）');
}

main();


