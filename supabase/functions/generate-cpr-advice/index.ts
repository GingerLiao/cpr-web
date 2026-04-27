const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { results } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) throw new Error("伺服器端缺少 API 金鑰設定");

    // 🌟 加入禁止 Markdown 和星號的指令
const systemPrompt = "你是一個專業的醫療急救輔助系統。請根據使用者的 CPR 實作數據，產出精確、客觀且具備專業學術口吻的改善建議。開頭先給一段約100字的概述，重點再以列點方式呈現，總共三點，每點嚴格限制 60 字以內。【絕對禁止】使用任何 Markdown 語法或特殊符號（例如星號 *、粗體、# 等），請純文字輸出，直接以數字開頭即可（例如：1. ）。";
    
    const userPrompt = `
      實作數據如下：
      - 準確率：${results.accuracy}%
      - 手肘彎曲：${results.errors.armBent} 次
      - 身體前傾不足：${results.errors.notVertical} 次
      - 按壓位置偏移：${results.errors.positionOffset} 次
      - 按壓深度不足(<5cm)：${results.errors.notDeepEnough || 0} 次
      - 按壓過深(>6cm)：${results.errors.tooDeep || 0} 次
      請針對上述失誤數據，輸出專業修正建議。
    `;

    // 🌟 修正 1：確保使用 1.5-flash，絕對不會有 404 問題
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

    return new Response(JSON.stringify({ advice }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // 🌟 修正 2：改成回傳 200，並把錯誤訊息直接送到前端畫面上！
    return new Response(JSON.stringify({ advice: `【後端真實錯誤】: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    })
  }
})