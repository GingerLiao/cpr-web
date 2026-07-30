import React, { useState, useEffect } from 'react'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 

export default function CPRReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [aiAdvice, setAiAdvice] = useState('系統正在分析您的練習數據，請稍候...');
  const reportData = location.state;

  const handleBack = () => {
    navigate('/history', { state: { activeTab: 'cpr' } });
  };

  useEffect(() => {
    async function fetchAiAdvice() {
      if (!reportData) return;

      // 1. 滿分防呆 (不扣 Token)
      const totalErrors = (reportData.errors?.armBent || 0)
        + (reportData.errors?.notVertical || 0)
        + (reportData.errors?.positionOffset || 0)
        + (reportData.errors?.depthTooShallow || 0)
        + (reportData.errors?.depthTooDeep || 0);
      const totalPresses = reportData.count || 0;
      if (totalPresses === 0 && totalErrors === 0 && reportData.accuracy === 0) {
        setAiAdvice('未能準確偵測動作，請再練習一次');
        return;
      }
      if (reportData.accuracy === 100 || totalErrors === 0) {
        setAiAdvice('您的按壓姿勢與頻率都非常完美，符合急救標準，請繼續保持！');
        return;
      }

      // 2. 檢查快取與「自我修復機制」
      // 如果快取存在，且「不包含」失敗的關鍵字，才算是有效的快取
      const hasCache = reportData.aiAdvice && reportData.aiAdvice.trim() !== "";
      const isFailedCache = hasCache && (reportData.aiAdvice.includes("無法連線") || reportData.aiAdvice.includes("後端真實錯誤"));

      if (hasCache && !isFailedCache) {
        // 這是一份完美的歷史分析紀錄，直接顯示，不扣 Token！
        setAiAdvice(reportData.aiAdvice);
        return;
      }

      // 3. 走到這裡代表：(A) 沒快取 或 (B) 上次分析失敗了。開始重新呼叫 API！
      try {
        // 如果是重新分析，先在畫面上給個提示
        if (isFailedCache) {
           setAiAdvice('系統正在為您分析中...');
        }

        const { data, error } = await supabase.functions.invoke('generate-cpr-advice', {
          body: { results: reportData } 
        });

        if (error) throw error;

        // ✅ 立刻更新畫面
        setAiAdvice(data.advice);

        // ✅ 背景存入資料庫作快取 (覆蓋掉原本失敗的紀錄)
        if (reportData.id) {
          supabase.from('CprRecord')
            .update({ ai_advice: data.advice })
            .eq('id', reportData.id)
            .then(({ error: dbError }) => {
              if (dbError) {
                console.warn("⚠️ 快取寫入失敗:", dbError);
              } else {
                console.log("✅ 重新分析成功，已修復資料庫快取！");
              }
            });
        }

      } catch (err) {
        console.error("無法取得 AI 建議:", err);
        setAiAdvice('分析系統暫時無法連線，請確認網路狀態後再試。');
      }
    }
    
    fetchAiAdvice();
  }, [reportData]);

  const totalPresses = reportData?.totalPresses || reportData?.count || 1;

  const getSeverity = (count) => {
    const ratio = totalPresses > 0 ? count / totalPresses : 0;
    if (count === 0)   return { label: '完美', textColor: 'text-teal-500', barColor: 'bg-teal-400', bgColor: 'bg-teal-50', ratio };
    if (ratio <= 0.10) return { label: '警告', textColor: 'text-[#8B7EE0]',  barColor: 'bg-[#8B7EE0]',  bgColor: 'bg-[#EFEBFB]',  ratio };
    if (ratio <= 0.25) return { label: '注意', textColor: 'text-[#F59E0B]', barColor: 'bg-[#F59E0B]', bgColor: 'bg-[#FFF9EB]', ratio };
    return               { label: '危險', textColor: 'text-[#E35E68]',   barColor: 'bg-[#E35E68]',   bgColor: 'bg-[#FFF5F6]',   ratio };
  };

  if (!location.state) {
    return (
      <div className="cpr-layout items-center">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">找不到報告資料</h2>
          <p className="text-slate-500 mb-6">請先進行 CPR 練習，或從歷史紀錄查看。</p>
          <button onClick={() => navigate('/')} className="cpr-btn-secondary">返回首頁</button>
        </div>
      </div>
    );
  }

  const errorItems = [
    { label: '手肘未打直', count: reportData.errors.armBent || 0 },
    { label: '身體前傾不足', count: reportData.errors.notVertical || 0 },
    { label: '按壓位置偏移', count: reportData.errors.positionOffset || 0 },
    { label: '按壓過淺', count: reportData.errors.depthTooShallow || 0 },
    { label: '按壓過深', count: reportData.errors.depthTooDeep || 0 }
  ];


  return (
    <div className="cpr-layout bg-[#F8F9FE]">
      <div className="cpr-container-scroll flex flex-col relative overflow-hidden h-full">
        
        {/* 頂部標題與返回鍵 */}
        <header className="sticky top-0 bg-[#F8F9FE] flex items-center justify-between px-6 pt-10 pb-4 z-50">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all shrink-0 z-40">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="text-xl font-black text-[#2F2659] tracking-widest absolute left-1/2 transform -translate-x-1/2 z-40">練習分析</h1>
          
          {/* 右上角愛心角色 */}
          <div className="absolute right-1 top-25 w-36 h-20 pointer-events-none z-30">
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-18 h-2.5 bg-slate-300/60 rounded-[100%] blur-[2px]"></div>
            <img src="/mascot/history.png" alt="Mascot" className="w-full h-full object-contain relative z-10" />
            <span className="absolute -top-1 right-4 text-purple-300 text-xl font-black opacity-70">✦</span>
          </div>
        </header>
        
        <main className="flex-1 px-6 pb-0 relative z-10">
          
          {/* 日期與時間區塊 */}
          <div className="flex items-center gap-2 mb-4 mt-2">
            <div className="w-7 h-7 bg-gradient-to-br from-[#EBF0FF] to-[#DCE6FF] border border-white shadow-sm rounded-lg flex items-center justify-center text-[#5B8DEF] shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>
            <span className="text-slate-800 font-bold text-sm tracking-wide">DAY {reportData.date}</span>
            <span className="text-slate-400 font-medium text-sm ml-1">{reportData.time}</span>
          </div>

          {/*  整體準確率 */}
          <div className="bg-white/80 backdrop-blur-sm border border-rose-50 rounded-2xl px-4 py-2 flex items-center justify-between mb-4 shadow-sm relative overflow-hidden w-full max-w-[240px]">
            <div className="flex items-baseline gap-3 relative z-10">
              <span className="text-slate-700 font-bold text-[15px]">整體準確率</span>
              <div className="text-2xl font-black text-[#E35E68]">{reportData.accuracy}<span className="text-lg ml-0.5">%</span></div>
            </div>
            {/* 心跳波動裝飾線 */}
            <svg className="absolute right-4 w-12 h-6 text-rose-200/50" viewBox="0 0 50 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M0 10h10l5-8 10 16 5-8h20" />
            </svg>
          </div>
          
          {/* 常見錯誤分析卡片 */}
          <div className="bg-white rounded-[2rem] p-5 mb-4 shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-50 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#EBF0FF] text-[#5B8DEF] flex items-center justify-center shadow-inner">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
              </div>
              <h3 className="text-[17px] font-bold text-slate-800 tracking-wide">常見錯誤分析</h3>
            </div>
            
            <div className="space-y-3">
              {errorItems.map((item, index) => {
                const severity = getSeverity(item.count);
                return (
                  <div key={index} className="flex gap-4">
                    
                    <div className="flex-1 pt-0.5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-700 text-[15px]">{item.label}</span>
                        <span className="text-[15px] font-bold text-slate-600">
                          {item.count} <span className="text-[11px] text-slate-400 font-normal">次</span>
                        </span>
                      </div>
          
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                          <div className={`${severity.barColor} h-full rounded-full transition-all duration-700`} style={{ width: `${Math.round(severity.ratio * 100)}%` }}></div>
                        </div>
                        <span className={`text-[12px] font-bold ${severity.textColor} shrink-0 w-6 text-right`}>
                          {severity.label}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </main>
        
        {/* 改善建議底部區塊 */}
        <div className="px-5 pb-8 w-full relative z-0 mt-1">
          <div className="p-5 rounded-2xl bg-[#F4F7FF] border border-[#5B8DEF]/20 shadow-sm relative overflow-hidden">
            {/* 左側藍色邊條 */}
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#5B8DEF]/60"></div>
            
            <div className="pl-2">
              {/* 標題與燈泡圖示 */}
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-[#5B8DEF] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="font-bold text-[#5B8DEF] text-base tracking-wide">改善建議</span>
              </div>

              {/* 建議內容 */}
              <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line text-justify">
                {aiAdvice}
              </p>
            </div>
          </div>

          {/* 再次練習按鈕 */}
          <div className="flex justify-end mt-6">
            <button onClick={() => navigate('/practice')} className="bg-[#5B8DEF] text-white font-bold py-3.5 px-8 rounded-full shadow-md active:scale-95 transition-transform hover:bg-[#4A7BD5] tracking-wider">
              再次練習
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}