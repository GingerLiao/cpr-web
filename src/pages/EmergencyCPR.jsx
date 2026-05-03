import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function EmergencyCPR() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(location.state?.step || 0);
  const [isCalling, setIsCalling] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  useEffect(() => {
    let timer;
    if (isCalling) timer = setInterval(() => setCallSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [isCalling]);

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const stepData = [
    { titleLeft: <span className="text-red-500 font-black text-2xl">叫</span>, titleRight: <span className="text-gray-800 font-medium text-2xl tracking-widest">叫CD</span>, heading: "確認反應與呼吸：", points: ["確認環境安全。", "輕拍患者肩膀、大聲呼喊，檢查有無意識。", "快速掃描胸部起伏，確認有無正常呼吸（5-10秒內）。"] },
    { titleLeft: <span className="text-gray-800 font-medium text-2xl">叫</span>, titleRight: <><span className="text-red-500 font-black text-2xl tracking-widest">叫</span><span className="text-gray-800 font-medium text-2xl tracking-widest">CD</span></>, heading: "呼叫求援、取得AED：", points: ["若無意識、無呼吸，立即撥打119。", "若現場有AED，設法取得；若有旁人，請旁人協助取得。", "完成通話後，系統將自動進入下一步。"] },
    { titleLeft: <span className="text-gray-800 font-medium text-2xl">叫叫</span>, titleRight: <><span className="text-red-500 font-black text-2xl tracking-widest">C</span><span className="text-gray-800 font-medium text-2xl tracking-widest">D</span></>, heading: "胸外按壓：", points: ["位置：雙乳頭連線中央（胸骨下半段）。", "姿勢：雙手交疊，手指緊扣，手肘打直，以身體重量垂直下壓。", "口訣：用力壓、快快壓、胸回彈、莫中斷。速率100~120下/分，深度5-6公分。"] },
    { titleLeft: <span className="text-gray-800 font-medium text-2xl">叫叫C</span>, titleRight: <span className="text-red-500 font-black text-2xl tracking-widest">D</span>, heading: "操作 AED 電擊器：", points: ["【AED 操作口訣：開、貼、插、電】", "開：打開 AED 電擊器，取出 AED 貼片並開啟電源。", "貼：將 AED 貼片貼在患者的右胸上方和左胸下方。", "插：AED 貼片貼好後，將電擊貼片插銷與主機連結，若取得 AED 時插銷已接上則可略過此步驟。", "電：待 AED 自動分析心律結束之後，會判斷患者是否須要電擊。若有電擊必要，則在確認周圍無人觸碰患者後，按下電擊鍵。"] }
  ];

  const handleEmergencyCall = () => {
    // 1. 觸發手機真實撥號 (測試時請填自己的手機或 123，正式展示前再改成 119)
    const phoneNumber = "123"; 
    window.location.href = `tel:${phoneNumber}`;
  };
  const currentStep = stepData[step];

  return (
    <div className="bg-gray-100 h-[100dvh] overflow-hidden flex justify-center font-sans">
      <div className="w-full max-w-md bg-white h-[100dvh] relative flex flex-col shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between p-6 pt-12 bg-white">
          <button onClick={() => navigate('/')} className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-gray-800 active:scale-90 transition-transform">
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>
          <div className="flex items-center">{currentStep.titleLeft}{currentStep.titleRight}</div>
        </header>

        <main className="flex-1 p-6 flex flex-col">
          <div className="bg-white border-2 border-gray-400 rounded-xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3">{currentStep.heading}</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700 font-medium leading-relaxed">
              {currentStep.points.map((point, idx) => <li key={idx}>{point}</li>)}
            </ul>
          </div>

          <div className="mt-2">
            {step === 0 && (
              <div className="flex justify-end">
                <button onClick={() => setStep(1)} className="bg-[#dcf0d1] text-green-900 px-8 py-3 rounded-full font-bold shadow-sm active:scale-95 transition-transform">下一步</button>
              </div>
            )}
            
            {step === 1 && (
              <div className="flex flex-col gap-3">
                <button onClick={() => navigate('/aed', { state: { fromEmergency: true } })} className="w-full bg-orange-400 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  開啟地圖尋找 AED
                </button>
                <div className="flex justify-between mt-2">
                   <button onClick={() => setStep(0)} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-full font-bold shadow-sm active:scale-95 transition-transform">
                     上一步
                   </button>
                   <button onClick={() => setStep(2)} className="bg-[#dcf0d1] text-green-900 px-6 py-3 rounded-full font-bold shadow-sm active:scale-95 transition-transform">
                     下一步 (已取得或略過)
                   </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4">
                <button onClick={() => { !isCalling && step < 2 ? alert("請先完成 119 通話！") : navigate('/emergency-camera'); }}  className="bg-blue-600 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-sm active:scale-95 transition-transform w-full">
                  開啟偵測鏡頭協助
                </button>
                <div className="flex justify-between">
                   <button onClick={() => setStep(1)} className="bg-gray-200 text-gray-700 px-6 py-3 rounded-full font-bold shadow-sm active:scale-95 transition-transform">
                     上一步
                   </button>
                   <button onClick={() => setStep(3)} className="bg-[#dcf0d1] text-green-900 px-6 py-3 rounded-full font-bold shadow-sm active:scale-95 transition-transform">
                     下一步
                   </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => { !isCalling ? navigate('/emergency-camera') : alert("請先完成或取消 119 通話！"); }} 
                  className={`${!isCalling ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'} px-6 py-4 rounded-xl font-bold text-lg shadow-sm active:scale-95 transition-transform w-full`}
                >
                  {!isCalling ? "繼續開啟偵測鏡頭協助" : "通話中無法開啟鏡頭"}
                </button>
                
                <div className="flex justify-end mt-2">
                   <button 
                     onClick={() => navigate('/')} 
                     className="bg-[#dcf0d1] text-green-900 px-6 py-3 rounded-full font-bold shadow-sm active:scale-95 transition-transform"
                   >
                    結束急救
                   </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {step === 1 && (
          <div className="absolute bottom-10 left-0 w-full px-6 flex justify-between gap-4">
            {!isCalling ? (
              <button onClick={handleEmergencyCall} className="bg-red-500 text-white font-bold text-lg py-4 px-8 rounded-full shadow-lg active:scale-95 transition-transform w-full">
                撥打 119
              </button>
            ) : (
              <>
                <div className="bg-red-500 text-white font-bold text-lg py-4 px-6 rounded-full shadow-lg flex-1 text-center">通話中 {formatTime(callSeconds)}</div>
                <button onClick={() => setIsCalling(false)} className="bg-yellow-400 text-gray-900 font-bold text-lg py-4 px-6 rounded-full shadow-lg active:scale-95 transition-transform">取消撥通</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}