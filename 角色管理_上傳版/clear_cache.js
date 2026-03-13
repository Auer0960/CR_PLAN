// 安全清除方案:只清除圖片資料,保留角色頭像設定
// 在瀏覽器的 Console (F12) 中執行此腳本

console.log('讀取現有資料...');
const savedData = localStorage.getItem('characterMapData');

if (savedData) {
    const data = JSON.parse(savedData);
    console.log('原有 characterImages 數量:', data.characterImages?.length || 0);

    // 只清除 characterImages,保留 characters (包含頭像設定)
    data.characterImages = [];

    localStorage.setItem('characterMapData', JSON.stringify(data));
    console.log('✅ 已清除圖片資料,但保留角色頭像設定');
} else {
    console.log('⚠️ 沒有找到 localStorage 資料');
}

console.log('請重新整理頁面 (F5)');
