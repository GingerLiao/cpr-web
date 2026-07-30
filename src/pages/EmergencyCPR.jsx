import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function EmergencyCPR() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(location.state?.step || 0);

  // 更新標題樣式：當前步驟紅字放大 (text-3xl)，其餘維持原本大小 (text-2xl)
  const stepData = [
    { titleLeft: <span className="text-[#E35E68] font-black text-3xl drop-shadow-sm">叫</span>, titleRight: <span className="text-slate-700 font-medium text-2xl tracking-widest ml-1">叫CD</span>, heading: "檢查意識與呼吸", points: ["呼喚患者並輕拍雙肩", "檢查有無正常呼吸", "如果無意識且無正常呼吸，請立刻進行下一步"] },
    { titleLeft: <span className="text-slate-700 font-medium text-2xl tracking-widest">叫</span>, titleRight: <><span className="text-[#E35E68] font-black text-3xl tracking-widest mx-1 drop-shadow-sm">叫</span><span className="text-slate-700 font-medium text-2xl tracking-widest">CD</span></>, heading: "大聲求救並拿 AED", points: ["請旁人撥打 119", "請旁人去拿 AED", "若無旁人，請自行撥打 119 並開啟擴音"] },
    { titleLeft: <span className="text-slate-700 font-medium text-2xl tracking-widest">叫叫</span>, titleRight: <><span className="text-[#E35E68] font-black text-3xl tracking-widest mx-1 drop-shadow-sm">C</span><span className="text-slate-700 font-medium text-2xl tracking-widest">D</span></>, heading: "胸外按壓", points: ["雙手交扣，掌根放在兩乳頭連線中央", "用力壓(5-6公分)、快快壓(每分鐘 100~120 下)", "胸部要完全回彈"] },
    { titleLeft: <span className="text-slate-700 font-medium text-2xl tracking-widest">叫叫C</span>, titleRight: <span className="text-[#E35E68] font-black text-3xl tracking-widest ml-1 drop-shadow-sm">D</span>, heading: "使用 AED 電擊", points: ["打開 AED 電源", "聽從 AED 語音指示貼上貼片", "分析心律時，不要碰觸患者", "若 AED 建議電擊，請確認無人碰觸患者後按下電擊鈕", "電擊後立刻繼續胸外按壓"] }
  ];

  const handleEmergencyCall = () => {
    const phoneNumber = "119"; 
    window.location.href = `tel:${phoneNumber}`;
  };

  const currentStep = stepData[step];

  return (
    <div className="cpr-layout">
      <div className="cpr-container relative">
        <header className="flex items-center justify-between pt-10 pb-2 px-6">
          {/*  頂部返回按鈕改為淡粉底紅字箭頭 */}
          <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          {/* 叫叫CD 標題置右 */}
          <div className="flex items-center">{currentStep.titleLeft}{currentStep.titleRight}</div>
        </header>

        <main className="flex-1 px-6 py-6 flex flex-col overflow-y-auto pb-48">
          
          {/*  文字卡片：清爽白底微陰影，並將 bullet points 顏色改為紅色 (marker:text-rose-400) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{currentStep.heading}</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 font-medium leading-snug marker:text-rose-400">
              {currentStep.points.map((point, idx) => <li key={idx}>{point}</li>)}
            </ul>
          </div>

          <div className="space-y-4">
            {step === 1 && (
              <div className="flex flex-col gap-4">
                {/* 撥打 119 - 粉底紅字柔和風格 */}
                <button 
                  onClick={handleEmergencyCall} 
                  className="bg-[#FFF0F2] text-[#E35E68] active:bg-[#FFE4E8] rounded-2xl py-4 font-bold flex items-center justify-center w-full transition-colors border border-rose-100 shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  點此撥打 119
                </button>

                {/* 尋找 AED - 紫底藍字柔和風格 */}
                <button 
                  onClick={() => navigate('/aed', { state: { fromEmergency: true } })} 
                  className="bg-[#F4F5FF] text-[#4151C8] active:bg-[#EBEDFF] rounded-2xl py-4 font-bold flex items-center justify-center w-full transition-colors border border-indigo-100/50 shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  尋找最近 AED
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => { navigate('/emergency-camera'); }}  
                  className="bg-[#FFF0F2] text-[#E35E68] active:bg-[#FFE4E8] rounded-2xl py-4 font-bold flex items-center justify-center w-full transition-colors border border-rose-100 shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  開啟相機輔助按壓
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => { navigate('/emergency-camera'); }}  
                  className="bg-[#FFF0F2] text-[#E35E68] active:bg-[#FFE4E8] rounded-2xl py-4 font-bold flex items-center justify-center w-full transition-colors border border-rose-100 shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  開啟相機輔助按壓
                </button>
              </div>
            )}
          </div>
        </main>

        {/* 底部導覽列 */}
        <div className="absolute bottom-0 left-0 w-full px-6 pb-8 flex flex-col items-center z-20 bg-gradient-to-t from-white via-white to-transparent pt-12">
          
          {/* ✅ 橫條進度指示器 (Dots) */}
          <div className="flex gap-3 mb-6">
            {[0, 1, 2, 3].map((idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-300 ${step === idx ? 'w-8 bg-[#E35E68]' : 'w-6 bg-slate-200'}`}
              ></div>
            ))}
          </div>

          <div className="flex gap-4 w-full">
            {step > 0 && (
              <button 
                onClick={() => setStep(step - 1)} 
                className="w-1/2 bg-white text-slate-700 font-bold text-lg py-2 rounded-full shadow-sm border border-slate-200 active:scale-95 transition-transform flex items-center justify-center"
              >
                上一步
              </button>
            )}
            <button 
              onClick={() => {
                if (step < 3) setStep(step + 1);
                else navigate('/'); 
              }} 
              className={`${step === 0 ? 'w-full' : 'w-1/2'} bg-gradient-to-r from-[#E35E68] to-[#EF858C] text-white font-bold text-lg py-3.5 rounded-full shadow-md active:scale-95 transition-transform flex items-center justify-center`}
            >
              {step < 3 ? '下一步' : '結束急救'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}