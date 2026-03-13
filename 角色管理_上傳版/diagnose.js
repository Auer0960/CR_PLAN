// 診斷腳本 - 在瀏覽器 Console 中執行
// 這會顯示應用程式當前載入的資料狀態

console.log('=== 診斷開始 ===');

// 1. 檢查 localStorage
const savedData = localStorage.getItem('characterMapData');
if (savedData) {
    const data = JSON.parse(savedData);
    console.log('localStorage characterImages 數量:', data.characterImages?.length || 0);

    const ruiImg = data.characterImages?.find(img => img.characterId === '1fb2240ea2dc');
    const shionImg = data.characterImages?.find(img => img.characterId === '61a1c136a07c');

    console.log('localStorage 中荻野 瑠衣的圖片:', ruiImg ? '✅ 找到' : '❌ 沒有');
    console.log('localStorage 中黑澤 詩音的圖片:', shionImg ? '✅ 找到' : '❌ 沒有');
} else {
    console.log('localStorage: 無資料');
}

// 2. 檢查 cr_data.json
fetch('/cr_data.json')
    .then(res => res.json())
    .then(data => {
        console.log('\ncr_data.json characterImages 數量:', data.characterImages?.length || 0);

        const ruiImg = data.characterImages?.find(img => img.characterId === '1fb2240ea2dc');
        const shionImg = data.characterImages?.find(img => img.characterId === '61a1c136a07c');

        console.log('cr_data.json 中荻野 瑠衣的圖片:', ruiImg ? '✅ 找到' : '❌ 沒有');
        console.log('cr_data.json 中黑澤 詩音的圖片:', shionImg ? '✅ 找到' : '❌ 沒有');

        if (ruiImg) console.log('  路徑:', ruiImg.imageDataUrl);
        if (shionImg) console.log('  路徑:', shionImg.imageDataUrl);

        console.log('\n=== 診斷完成 ===');
        console.log('\n建議操作:');
        if (savedData) {
            const localData = JSON.parse(savedData);
            if (localData.characterImages?.length < data.characterImages?.length) {
                console.log('⚠️ localStorage 的圖片數量少於 cr_data.json');
                console.log('請執行以下指令清除 localStorage:');
                console.log('localStorage.removeItem("characterMapData"); location.reload();');
            }
        }
    })
    .catch(err => console.error('無法載入 cr_data.json:', err));
