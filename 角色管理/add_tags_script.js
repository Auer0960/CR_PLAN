const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const userDataPath = path.join(__dirname, 'user_data.json');

try {
    const dataRaw = fs.readFileSync(userDataPath, 'utf8');
    const data = JSON.parse(dataRaw);

    // 1. Ensure tagCategories exist
    if (!data.tagCategories) {
        data.tagCategories = [];
    }

    // Check if categories already exist to avoid duplicates
    let clothingCat = data.tagCategories.find(c => c.name === '服裝');
    let expressionCat = data.tagCategories.find(c => c.name === '表情');
    let sceneCat = data.tagCategories.find(c => c.name === '場景');

    // Create categories if they don't exist
    if (!clothingCat) {
        clothingCat = {
            id: uuidv4(),
            name: '服裝',
            color: '#3b82f6', // Blue
            tags: [],
            selectionMode: 'multiple'
        };
        data.tagCategories.push(clothingCat);
    }

    if (!expressionCat) {
        expressionCat = {
            id: uuidv4(),
            name: '表情',
            color: '#ef4444', // Red
            tags: [],
            selectionMode: 'multiple'
        };
        data.tagCategories.push(expressionCat);
    }

    if (!sceneCat) {
        sceneCat = {
            id: uuidv4(),
            name: '場景',
            color: '#10b981', // Green
            tags: [],
            selectionMode: 'multiple'
        };
        data.tagCategories.push(sceneCat);
    }

    // Helper to get or create tag
    const getOrCreateTag = (category, label) => {
        let tag = category.tags.find(t => t.label === label);
        if (!tag) {
            tag = { id: uuidv4(), label: label };
            category.tags.push(tag);
        }
        return tag.id;
    };

    // Create specific tags
    const tagMaid = getOrCreateTag(clothingCat, '女僕裝');
    const tagCasual = getOrCreateTag(clothingCat, '便服');
    const tagAngry = getOrCreateTag(expressionCat, '生氣');
    const tagShy = getOrCreateTag(expressionCat, '害羞');
    const tagIndoor = getOrCreateTag(sceneCat, '室內');

    // 2. Find and update the images
    const targetImage1 = '2befe678-453c-44b1-86b5-3a35a28f4e8e';
    const targetImage2 = '84d04819-25eb-4817-b36d-1b8ca928fdaa';

    let updatedCount = 0;

    if (data.characterImages) {
        data.characterImages.forEach(img => {
            if (img.imageDataUrl.includes(targetImage1)) {
                // Add tags to image 1 (Maid, Angry, Indoor)
                const newTags = [tagMaid, tagAngry, tagIndoor];
                // Merge with existing tags if any, avoiding duplicates
                const existingTags = img.tagIds || [];
                img.tagIds = [...new Set([...existingTags, ...newTags])];
                console.log(`Updated tags for image ${targetImage1}`);
                updatedCount++;
            } else if (img.imageDataUrl.includes(targetImage2)) {
                // Add tags to image 2 (Maid, Shy, Indoor)
                const newTags = [tagMaid, tagShy, tagIndoor];
                const existingTags = img.tagIds || [];
                img.tagIds = [...new Set([...existingTags, ...newTags])];
                console.log(`Updated tags for image ${targetImage2}`);
                updatedCount++;
            }
        });
    } else {
        console.log('No characterImages found in user_data.json');
    }

    if (updatedCount > 0) {
        fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2), 'utf8');
        console.log('Successfully saved user_data.json');
    } else {
        console.log('No matching images found to update.');
    }

} catch (error) {
    console.error('Error updating user_data.json:', error);
}
