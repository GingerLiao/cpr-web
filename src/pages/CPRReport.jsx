import React, { useState, useEffect } from 'react'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 

export default function CPRReport() {
  const navigate = useNavigate();
  const location = useLocation();

  const [aiAdvice, setAiAdvice] = useState('系統正在分析您的實作數據，請稍候...');

  const reportData = location.state;

  useEffect(() => {
    async function fetchAiAdvice() {
      if (!reportData) return;

      try {
        const { data, error } = await supabase.functions.invoke('generate-cpr-advice', {
          body: { results: reportData } 
        });

        if (error) {
          throw error;
        }

        setAiAdvice(data.advice);
      } catch (err) {
        console.error("無法取得 AI 建議:", err);
        setAiAdvice('分析系統暫時無法連線，請確認網路狀態後再試。');
      }
    }

    fetchAiAdvice();
  }, [reportData]);

  // 🔥 新增：動態判斷錯誤次數，回傳對應的四個階段與 Tailwind 顏色
  const getSeverity = (count) => {
    if (count === 0) return { label: '輕微', textColor: 'text-green-500', barColor: 'bg-green-500', bgColor: 'bg-green-100' };
    if (count <= 5) return { label: '警告', textColor: 'text-blue-500', barColor: 'bg-blue-500', bgColor: 'bg-blue-100' };
    if (count <= 15) return { label: '注意', textColor: 'text-yellow-600', barColor: 'bg-yellow-400', bgColor: 'bg-yellow-100' };
    return { label: '危險', textColor: 'text-red-600', barColor: 'bg-red-500', bgColor: 'bg-red-100' };
  };

  if (!location.state) {
    return (
      <div className="bg-gray-100 h-screen flex flex-col items-center justify-center font-sans">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">找不到報告資料</h2>
        <p className="text-gray-500 mb-6">請先進行 CPR 練習，或從歷史紀錄查看。</p>
        <button 
          onClick={() => navigate('/')} 
          className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-md active:scale-95"
        >
          返回首頁
        </button>
      </div>
    );
  }

  // 整理要渲染的五個錯誤項目
  const errorItems = [
    { label: '手肘彎曲', count: reportData.errors.armBent || 0 },
    { label: '身體前傾不足', count: reportData.errors.notVertical || 0 },
    { label: '按壓位置偏移', count: reportData.errors.positionOffset || 0 },
    { label: '按壓深度不足(<5cm)', count: reportData.errors.notDeepEnough || 0 },
    { label: '按壓過深(>6cm)', count: reportData.errors.tooDeep || 0 }
  ];

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden overflow-y-auto">
        <header className="flex items-center p-6 pt-12 bg-white z-10">
          <button onClick={() => navigate(-1)} className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-gray-800 active:scale-90 transition-transform">
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <h1 className="flex-1 text-center text-2xl font-medium text-orange-400 mr-12 tracking-wide">實作練習分析</h1>
        </header>

        <main className="flex-1 px-6 pb-24">
          <div className="text-gray-800 text-base font-bold mb-3">DAY {reportData.date} <span className="text-gray-500 font-normal">{reportData.time}</span></div>
          <div className="text-gray-800 text-base font-bold mb-6">整體準確率 : <span className="text-red-500">{reportData.accuracy}%</span></div>
          
          <div className="border border-orange-200 rounded-2xl p-5 mb-6 bg-white relative">
            <div className="absolute -top-4 left-4 bg-orange-100 w-8 h-8 rounded-full flex items-center justify-center"><span className="text-orange-500 font-bold">!</span></div>
            <h3 className="text-lg font-bold text-gray-800 mb-6 ml-10">常見錯誤分析</h3>
            <div className="space-y-5">
              
              {/* 🔥 修改：使用迴圈與動態階段顏色渲染進度條 */}
              {errorItems.map((item, index) => {
                const severity = getSeverity(item.count);
                return (
                  <div key={index}>
                    <div className="flex justify-between items-end mb-1">
                      <span className="font-bold text-gray-800 text-base">{item.label}</span>
                      <span className="text-xs text-gray-500 font-bold">出現 {item.count} 次</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-full ${severity.bgColor} h-3 rounded-full overflow-hidden flex`}>
                        <div className={`${severity.barColor} h-full rounded-full`} style={{ width: `${Math.min(item.count * 10, 100)}%` }}></div>
                      </div>
                      <span className={`text-xs font-bold ${severity.textColor} w-10 text-right`}>
                        {severity.label}
                      </span>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          <div className="bg-[#f0f7f9] rounded-2xl p-5 mb-8">
            <h3 className="text-base font-bold text-gray-900 mb-3">AI 專屬改善建議</h3>
            <div className="text-gray-800 text-sm font-medium leading-relaxed" style={{ whiteSpace: 'pre-line' }}>
              {aiAdvice}
            </div>
          </div>
          
          <div className="flex justify-end">
            <button onClick={() => navigate('/practice')} className="bg-[#fdf3ce] text-gray-800 px-8 py-3 rounded-full font-bold shadow-sm active:scale-95 transition-transform">再次練習</button>
          </div>
        </main>
      </div>
    </div>
  );
}