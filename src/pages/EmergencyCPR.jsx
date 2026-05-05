import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function EmergencyCPR() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(location.state?.step || 0);

  const stepData = [
    { titleLeft: <span className="text-red-500 font-black text-2xl">叫</span>, titleRight: <span className="text-slate-800 font-medium text-2xl tracking-widest">叫CD</span>, heading: "檢查意識與呼吸", points: ["呼喚患者並輕拍雙肩", "檢查有無正常呼吸", "如果無意識且無正常呼吸，請立刻進行下一步"] },
    { titleLeft: <span className="text-slate-800 font-medium text-2xl">叫</span>, titleRight: <><span className="text-red-500 font-black text-2xl tracking-widest">叫</span><span className="text-slate-800 font-medium text-2xl tracking-widest">CD</span></>, heading: "大聲求救並拿 AED", points: ["請旁人撥打 119", "請旁人去拿 AED", "若無旁人，請自行撥打 119 並開啟擴音"] },
    { titleLeft: <span className="text-slate-800 font-medium text-2xl">叫叫</span>, titleRight: <><span className="text-red-500 font-black text-2xl tracking-widest">C</span><span className="text-slate-800 font-medium text-2xl tracking-widest">D</span></>, heading: "胸外按壓", points: ["雙手交扣，掌根放在兩乳頭連線中央", "用力壓(5-6公分)、快快壓(每分鐘 100~120 下)", "胸部要完全回彈"] },
    { titleLeft: <span className="text-slate-800 font-medium text-2xl">叫叫C</span>, titleRight: <span className="text-red-500 font-black text-2xl tracking-widest">D</span>, heading: "使用 AED 電擊", points: ["打開 AED 電源", "聽從 AED 語音指示貼上貼片", "分析心律時，不要碰觸患者", "若 AED 建議電擊，請確認無人碰觸患者後按下電擊鈕", "電擊後立刻繼續胸外按壓"] }
  ];

  const handleEmergencyCall = () => {
    const phoneNumber = "117"; 
    window.location.href = `tel:${phoneNumber}`;
  };

  const currentStep = stepData[step];

  return (
    <div className="cpr-layout">
      <div className="cpr-container relative">
        <header className="cpr-header-center justify-between border-b border-slate-200/50 pb-4">
          <button onClick={() => navigate('/')} className="cpr-icon-btn shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div className="flex items-center mr-6">{currentStep.titleLeft}{currentStep.titleRight}</div>
        </header>

        {/* 加上 pb-32 確保內容滑到底時，不會被下方的導航按鈕擋住 */}
        <main className="flex-1 px-6 py-8 flex flex-col overflow-y-auto pb-32">
          
          {/* ✅ 這裡把文字說明框改成了灰色系 (border-slate-200 bg-slate-50) */}
          <div className="cpr-card !mb-6 !p-6 border-slate-200 bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800 mb-3">{currentStep.heading}</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-700 font-medium leading-relaxed">
              {currentStep.points.map((point, idx) => <li key={idx}>{point}</li>)}
            </ul>
          </div>

          <div className="mt-2 space-y-4">
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => navigate('/aed', { state: { fromEmergency: true } })} 
                  className="cpr-btn-secondary bg-[#E09E75] hover:bg-[#C77F52] text-white shadow-md py-3.5 flex items-center justify-center w-full"
                >
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  尋找最近 AED
                </button>
                
                <button 
                  onClick={handleEmergencyCall} 
                  className="cpr-btn-danger bg-red-500 hover:bg-red-600 text-white shadow-lg py-3.5 border-none flex items-center justify-center w-full"
                >
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  點此撥打 119
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4">
                <button onClick={() => { navigate('/emergency-camera'); }}  className="cpr-btn-secondary bg-[#A83232] hover:bg-red-800 text-white w-full shadow-md py-4">
                  開啟相機輔助按壓
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-4">
                <button onClick={() => { navigate('/emergency-camera'); }}  className="cpr-btn-secondary bg-[#A83232] hover:bg-red-800 text-white w-full shadow-md py-4">
                  開啟相機輔助按壓
                </button>
              </div>
            )}
          </div>
        </main>

        {/* 統一在畫面最下方的導航列：白底上一步、綠底下一步，各佔 50% 且置中 */}
        <div className="absolute bottom-8 left-0 w-full px-6 flex gap-4 z-20">
          {step > 0 && (
            <button 
              onClick={() => setStep(step - 1)} 
              className="w-1/2 bg-white text-slate-700 font-bold text-lg py-3.5 rounded-full shadow-lg border-2 border-slate-100 active:scale-95 transition-transform flex items-center justify-center"
            >
              上一步
            </button>
          )}
          <button 
            onClick={() => {
              if (step < 3) setStep(step + 1);
              else navigate('/'); 
            }} 
            className={`${step === 0 ? 'w-full' : 'w-1/2'} bg-[#6B908F] text-white font-bold text-lg py-3.5 rounded-full shadow-lg active:scale-95 transition-transform flex items-center justify-center`}
          >
            {step < 3 ? '下一步' : '結束急救'}
          </button>
        </div>

      </div>
    </div>
  );
}