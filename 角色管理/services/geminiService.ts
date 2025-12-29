
import { GoogleGenAI, Type } from "@google/genai";
// FIX: Import ParsedData from shared types file and remove unused type imports.
import type { ParsedData } from '../types';

// FIX: Removed userApiKey parameter to enforce using environment variables for Gemini API key.
export async function parseWithGemini(text: string): Promise<ParsedData> {
  // FIX: API key must be obtained exclusively from environment variables.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    // FIX: Updated error message for missing environment variable.
    throw new Error("Google Gemini API Key 未在環境變數中設定。請設定 API_KEY 環境變數。");
  }
  
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `從以下文字中提取人物及其關係。人物名稱應唯一。關係應包含來源、目標和關係標籤。例如，'A是B的父親' 應該解析為 A -> B，標籤為 '父親'。\n\n輸入文字：\n${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            characters: {
              type: Type.ARRAY,
              description: '所有獨立角色的列表。',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: '角色的名字。'
                  }
                },
                required: ['name']
              }
            },
            relationships: {
              type: Type.ARRAY,
              description: '所有角色之間的關係列表。',
              items: {
                type: Type.OBJECT,
                properties: {
                  source: {
                    type: Type.STRING,
                    description: '關係中的來源角色名字。'
                  },
                  target: {
                    type: Type.STRING,
                    description: '關係中的目標角色名字。'
                  },
                  label: {
                    type: Type.STRING,
                    description: '描述關係的標籤 (例如 "父親", "朋友")'
                  }
                },
                required: ['source', 'target', 'label']
              }
            }
          },
          required: ['characters', 'relationships']
        },
      },
    });

    const jsonString = response.text;
    if (!jsonString) {
      throw new Error("API 返回了空的響應。");
    }
    
    // Sometimes the response might be wrapped in markdown backticks
    const cleanedJsonString = jsonString.replace(/^```json\n?/, '').replace(/```$/, '');
    
    return JSON.parse(cleanedJsonString) as ParsedData;
  } catch (error) {
    console.error("Error parsing relationships with Gemini API:", error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('invalid'))) {
         // FIX: Updated error message as API key is not user-provided.
         throw new Error("設定的 Google Gemini API Key 無效。");
    }
    throw new Error("使用 Gemini 處理文字時發生錯誤。請檢查您的輸入內容和 API Key。");
  }
}
