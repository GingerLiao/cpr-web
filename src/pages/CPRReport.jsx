import React, { useState, useEffect } from 'react'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient'; 

export default function CPRReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const [aiAdvice, setAiAdvice] = useState('系統正在分析您的實作數據，請稍候...');
  const reportData = location.state;

  const handleBack = () => {
    if (location.state?.fromPractice) {
      navigate('/');
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    async function fetchAiAdvice() {
      if (!reportData) return;
      try {
        const { data, error } = await supabase.functions.invoke('generate-cpr-advice', {
          body: { results: reportData } 
        });
        if (error) throw error;
        setAiAdvice(data.advice);
      } catch (err) {
        console.error("無法取得 AI 建議:", err);
        setAiAdvice('分析系統暫時無法連線，請確認網路狀態後再試。');
      }
    }
    fetchAiAdvice();
  }, [reportData]);

  const getSeverity = (count) => {
    if (count === 0) return { label: '完美', textColor: 'text-green-500', barColor: 'bg-green-500', bgColor: 'bg-green-100' };
    if (count <= 5) return { label: '警告', textColor: 'text-blue-500', barColor: 'bg-blue-500', bgColor: 'bg-blue-100' };
    if (count <= 15) return { label: '注意', textColor: 'text-yellow-600', barColor: 'bg-yellow-400', bgColor: 'bg-yellow-100' };
    return { label: '危險', textColor: 'text-red-600', barColor: 'bg-red-500', bgColor: 'bg-red-100' };
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
          <button onClick={() => navigate('/')} className="cpr-btn-secondary">
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  const errorItems = [
    { label: '手肘彎曲', count: reportData.errors.armBent || 0 },
    { label: '身體前傾不足', count: reportData.errors.notVertical || 0 },
    { label: '按壓位置偏移', count: reportData.errors.positionOffset || 0 },
    { label: '按壓深度不足(<5cm)', count: reportData.errors.notDeepEnough || 0 },
    { label: '按壓過深(>6cm)', count: reportData.errors.tooDeep || 0 }
  ];

  return (
    <div className="cpr-layout">
      <div className="cpr-container-scroll">
        <header className="cpr-header-center">
          <button onClick={handleBack} className="cpr-icon-btn">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="cpr-title text-[#E09E75] mr-12">實作練習分析</h1>
        </header>
        
        <main className="flex-1 px-6 pb-24 relative z-10">
          <div className="text-slate-800 text-base font-bold mb-3">
            DAY {reportData.date} <span className="text-slate-500 font-normal">{reportData.time}</span>
          </div>
          <div className="text-slate-800 text-base font-bold mb-6">
            整體準確率 : <span className="text-rose-500">{reportData.accuracy}%</span>
          </div>
          
          <div className="cpr-card border-[#E09E75]/20 mb-6">
            <div className="absolute -top-5 left-5 bg-white border-4 border-[#E09E75]/20 w-10 h-10 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-[#E09E75] font-black">!</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 ml-10">常見錯誤分析</h3>
            <div className="space-y-5">
              {errorItems.map((item, index) => {
                const severity = getSeverity(item.count);
                return (
                  <div key={index}>
                    <div className="flex justify-between items-end mb-1">
                      <span className="font-bold text-slate-700 text-base">{item.label}</span>
                      <span className="text-xs text-slate-500 font-bold">出現 {item.count} 次</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-full ${severity.bgColor} h-3 rounded-full overflow-hidden flex`}>
                        <div className={`${severity.barColor} h-full rounded-full`} style={{ width: `${Math.min(item.count * 10, 100)}%` }}></div>
                      </div>
                      <span className={`text-xs font-bold ${severity.textColor} w-10 text-right`}>{severity.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="cpr-card border-[#6B908F]/20 mb-8 bg-teal-50/30">
            <h3 className="text-base font-bold text-[#6B908F] mb-3 tracking-wide">AI 專屬改善建議</h3>
            <div className="text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-line">
              {aiAdvice}
            </div>
          </div>
          
          <div className="flex justify-end">
            <button onClick={() => navigate('/practice')} className="cpr-btn-primary">再次練習</button>
          </div>
        </main>
      </div>
    </div>
  );
}