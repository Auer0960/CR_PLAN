import { GoogleGenAI, Type } from "@google/genai";
import type { TagCategory, AiTagSuggestion } from '../types';

export async function extractTagsWithGemini(text: string): Promise<string[]> {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("Google Gemini API Key 未在環境變數中設定。請設定 API_KEY 環境變數。");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `從以下文字中提取關鍵字作為標籤 (tag)。每個標籤都必須是繁體中文，且應該是簡短的名詞或形容詞。請只回傳標籤本身，不要包含編號或項目符號。\n\n輸入文字：\n${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              description: '從文字中提取的標籤列表。',
              items: {
                type: Type.STRING,
                description: '一個標籤'
              }
            }
          },
          required: ['tags']
        },
      },
    });

    const jsonString = response.text;
    if (!jsonString) {
      throw new Error("API 返回了空的響應。");
    }

    const cleanedJsonString = jsonString.replace(/^```json\n?/, '').replace(/```$/, '');
    const parsed = JSON.parse(cleanedJsonString) as { tags: string[] };
    return parsed.tags;
  } catch (error) {
    console.error("Error extracting tags with Gemini API:", error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('invalid'))) {
         throw new Error("設定的 Google Gemini API Key 無效。");
    }
    throw new Error("使用 Gemini 提取標籤時發生錯誤。");
  }
}

export async function suggestTagsForImageWithGemini(imageDataUrl: string, tagCategories: TagCategory[]): Promise<AiTagSuggestion> {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("Google Gemini API Key 未在環境變數中設定。請設定 API_KEY 環境變數。");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Extract base64 data and mime type from data URL
  const match = imageDataUrl.match(/^data:(.*);base64,(.*)$/);
  if (!match) {
    throw new Error("無效的圖片資料格式。");
  }
  const mimeType = match[1];
  const base64Data = match[2];

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };

  const existingTagsPrompt = JSON.stringify(tagCategories.map(cat => ({
      category: cat.name,
      tags: cat.tags.map(t => t.label)
  })));

  const prompt = `分析這張圖片的視覺特徵 (例如：外貌、配件、物品、顏色)。根據這些特徵，建議相關的標籤。
所有建議的標籤都必須是繁體中文。
這是一個現有的標籤庫，請優先使用這裡面的標籤：
${existingTagsPrompt}

如果圖片中有標籤庫裡沒有的顯著特徵，請將它們作為新標籤建議。
你的回覆必須是 JSON 格式。`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            existingTags: {
              type: Type.ARRAY,
              description: '從現有標籤庫中找到的匹配標籤的標籤名稱 (label) 列表。',
              items: { type: Type.STRING }
            },
            newTagSuggestions: {
              type: Type.ARRAY,
              description: '圖片中有，但現有標籤庫沒有的新標籤建議 (標籤名稱)。',
              items: { type: Type.STRING }
            }
          },
          required: ['existingTags', 'newTagSuggestions']
        },
      },
    });

    const jsonString = response.text;
    if (!jsonString) {
      throw new Error("API 返回了空的響應。");
    }
    
    const cleanedJsonString = jsonString.replace(/^```json\n?/, '').replace(/```$/, '');
    return JSON.parse(cleanedJsonString) as AiTagSuggestion;

  } catch (error) {
    console.error("Error suggesting tags with Gemini API:", error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('invalid'))) {
         throw new Error("設定的 Google Gemini API Key 無效。");
    }
    throw new Error("使用 Gemini 建議圖片標籤時發生錯誤。");
  }
}