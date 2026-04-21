import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function CPRReport() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const reportData = location.state;
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
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="font-bold text-gray-800 text-base">手肘彎曲</span><span className="text-xs text-gray-500 font-bold">出現 {reportData.errors.armBent} 次</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-full bg-red-200 h-3 rounded-full overflow-hidden flex"><div className="bg-red-500 h-full rounded-full" style={{ width: `${Math.min(reportData.errors.armBent * 10, 100)}%` }}></div></div>
                  <span className="text-xs font-bold text-red-500 w-10 text-right">注意</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="font-bold text-gray-800 text-base">身體前傾不足</span><span className="text-xs text-gray-500 font-bold">出現 {reportData.errors.notVertical} 次</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-full bg-yellow-100 h-3 rounded-full overflow-hidden flex"><div className="bg-yellow-400 h-full rounded-full" style={{ width: `${Math.min(reportData.errors.notVertical * 10, 100)}%` }}></div></div>
                  <span className="text-xs font-bold text-yellow-500 w-10 text-right">需改善</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="font-bold text-gray-800 text-base">按壓位置偏移</span><span className="text-xs text-gray-500 font-bold">出現 {reportData.errors.positionOffset} 次</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-full bg-blue-200 h-3 rounded-full overflow-hidden flex"><div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(reportData.errors.positionOffset * 10, 100)}%` }}></div></div>
                  <span className="text-xs font-bold text-blue-500 w-10 text-right">輕微</span>
                </div>
              </div>
              
              {/* 🔥 這裡已經修正為 &lt; */}
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="font-bold text-gray-800 text-base">按壓深度不足(&lt;5cm)</span><span className="text-xs text-gray-500 font-bold">出現 {reportData.errors.notDeepEnough || 0} 次</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-full bg-purple-200 h-3 rounded-full overflow-hidden flex"><div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min((reportData.errors.notDeepEnough || 0) * 10, 100)}%` }}></div></div>
                  <span className="text-xs font-bold text-purple-500 w-10 text-right">致命</span>
                </div>
              </div>

              {/* 🔥 這裡已經修正為 &gt; */}
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="font-bold text-gray-800 text-base">按壓過深(&gt;6cm)</span><span className="text-xs text-gray-500 font-bold">出現 {reportData.errors.tooDeep || 0} 次</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-full bg-red-100 h-3 rounded-full overflow-hidden flex"><div className="bg-red-600 h-full rounded-full" style={{ width: `${Math.min((reportData.errors.tooDeep || 0) * 10, 100)}%` }}></div></div>
                  <span className="text-xs font-bold text-red-600 w-10 text-right">危險</span>
                </div>
              </div>

            </div>
          </div>

          <div className="bg-[#f0f7f9] rounded-2xl p-5 mb-8">
            <h3 className="text-base font-bold text-gray-900 mb-2">改善建議</h3>
            <ul className="space-y-1 text-gray-800 text-sm font-medium leading-relaxed">
              <li>• 保持手肘完全伸直，利用身體重量按壓</li>
              <li>• 確保身體與地面呈現適當角度，增加按壓深度</li>
              <li>• 跟隨節拍器節奏，維持穩定的按壓頻率</li>
            </ul>
          </div>
          
          <div className="flex justify-end">
            <button onClick={() => navigate('/practice')} className="bg-[#fdf3ce] text-gray-800 px-8 py-3 rounded-full font-bold shadow-sm active:scale-95 transition-transform">再次練習</button>
          </div>
        </main>
      </div>
    </div>
  );
}