const fs = require('fs');
const path = require('path');

// 讀取檔案
const crDataPath = path.join(__dirname, 'public', 'cr_data.json');
const tagsPath = path.join(__dirname, 'local', 'tags (1).json');

try {
    console.log('讀取 cr_data.json...');
    const crData = JSON.parse(fs.readFileSync(crDataPath, 'utf8'));
    
    console.log('讀取專案內的 TAG 資料 (local/tags (1).json)...');
    const tagsData = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));
    
    // 將 tagCategories 加入 cr_data.json
    crData.tagCategories = tagsData.tagCategories;
    
    console.log('寫入更新後的 cr_data.json...');
    fs.writeFileSync(crDataPath, JSON.stringify(crData, null, 2), 'utf8');
    
    console.log('✅ TAG 資料已成功整合！');
    console.log(`   - 角色數量: ${crData.characters.length}`);
    console.log(`   - TAG 分類數量: ${crData.tagCategories.length}`);
} catch (error) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
}

