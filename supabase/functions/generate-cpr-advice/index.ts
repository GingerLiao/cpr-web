declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (req: Request) => Promise<Response> | Response): void
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 🌟 核心修正：這裡只取 body，不要直接解構出 results，因為新功能沒有 results
    const body = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) throw new Error("伺服器端缺少 API 金鑰設定");

    let systemPrompt = "";
    let userPrompt = "";

    // 🌟 分流邏輯：判斷前端傳來的是新版歷史紀錄(type) 還是舊版單次分析(results)
    if (body.type === 'cpr' || body.type === 'quiz') {
      
      // ==========================================
      // 📍 新功能：歷史紀錄分析 (CPR 或 考照題庫)
      // ==========================================
      systemPrompt = "你是一個專業的醫療急救與考照輔助系統。請根據使用者的歷史練習或測驗數據，產出精確、客觀的綜合評價與改善建議。開頭先給一段不超過 70 字的概述，接著以列點方式給出1-2點具體建議，每點嚴格限制 50 字以內。【絕對禁止】使用任何 Markdown 語法或特殊符號（例如星號 *、粗體、# 等），請純文字輸出，直接以數字開頭即可（例如：1. ）。";
      // 直接使用前端在 HistoryRecord.jsx 組裝好傳過來的 prompt
      userPrompt = body.prompt; 

    } else if (body.results) {

      // ==========================================
      // 📍 舊功能：單次 CPR 實作分析 (保持原樣，確保舊功能不壞)
      // ==========================================
      const { results } = body; // 只有在確定是舊功能時，才把 results 解構出來
      systemPrompt = "你是一個專業的醫療急救輔助系統。請根據使用者的 CPR 實作數據，產出精確、客觀且具備專業學術口吻的改善建議。開頭先給一段不超過 70 字的概述，重點再以列點方式呈現，可以依情況給出1-3點建議，最多不超過3點，每點嚴格限制 50 字以內。【絕對禁止】使用任何 Markdown 語法或特殊符號（例如星號 *、粗體、# 等），請純文字輸出，直接以數字開頭即可（例如：1. ）。";
      
      userPrompt = `
        實作數據如下：
        - 準確率：${results.accuracy}%
        - 按壓總次數：${results.totalPresses ?? results.count ?? 'N/A'}
        - 平均頻率：${results.finalBpm ?? results.bpm ?? 'N/A'} BPM
        - 手肘彎曲：${results.errors?.armBent ?? 0} 次
        - 身體前傾不足：${results.errors?.notVertical ?? 0} 次
        - 按壓位置偏移：${results.errors?.positionOffset ?? 0} 次
        - 按壓過淺（< 5 cm）：${results.errors?.depthTooShallow ?? 0} 次
        - 按壓過深（> 6 cm）：${results.errors?.depthTooDeep ?? 0} 次
        請針對上述失誤數據，輸出專業修正建議。
      `;

    } else {
      throw new Error("無效的請求參數，缺少 type 或 results");
    }

    // 🌟 共用的 Gemini API 呼叫區塊
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }]
      })
    })

    const data = await response.json()
    
    if (data.error) throw new Error(data.error.message);

    const advice = data.candidates[0].content.parts[0].text

    // 🌟 雙重回傳：舊版單次分析抓 `advice`，新版歷史紀錄抓 `ai_reply`
    return new Response(JSON.stringify({ 
      advice: advice,     
      ai_reply: advice    
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ 
    advice: "目前 AI 分析伺服器忙碌中，請稍後再試。",
    ai_reply: "目前 AI 分析伺服器忙碌中，請稍後再試。"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})