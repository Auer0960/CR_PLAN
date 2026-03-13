import type { ParsedData } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function parseWithOpenAI(text: string, apiKey: string | null): Promise<ParsedData> {
  if (!apiKey) {
    throw new Error("OpenAI API Key 未設定。請在右上角的設定中提供您的 API Key。");
  }

  const systemPrompt = `從使用者輸入的文字中提取人物及其關係。你的任務是將這些資訊轉換成一個特定的 JSON 結構。
JSON 結構應包含兩個主要鍵：'characters' 和 'relationships'。
'characters' 應該是一個物件陣列，每個物件只包含一個 'name' 鍵，值為角色的名字。請確保列出所有在文字中提到的人物。
'relationships' 應該是一個物件陣列，每個物件包含 'source' (來源角色名字), 'target' (目標角色名字), 和 'label' (描述關係的文字，例如 "父親", "朋友")。

範例輸入: 'A是B的父親，C和B是朋友。'
範例輸出 JSON:
{
  "characters": [
    { "name": "A" },
    { "name": "B" },
    { "name": "C" }
  ],
  "relationships": [
    { "source": "A", "target": "B", "label": "父親" },
    { "source": "C", "target": "B", "label": "朋友" }
  ]
}

請只回傳 JSON 物件，不要包含任何額外的文字、解釋或 markdown 語法。`;

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API Error:", errorData);
        if (errorData?.error?.code === 'invalid_api_key') {
             throw new Error("您提供的 OpenAI API Key 無效。請檢查並在設定中更正。");
        }
        throw new Error(`OpenAI API 請求失敗，狀態碼：${response.status}。${errorData?.error?.message || ''}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("OpenAI API 返回了空的響應。");
    }

    return JSON.parse(content) as ParsedData;
  } catch (error) {
    console.error("Error parsing relationships with OpenAI API:", error);
     if (error instanceof Error) {
        throw error;
    }
    throw new Error("使用 OpenAI 處理文字時發生未知錯誤。");
  }
}
