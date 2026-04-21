import React, { useRef, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
// 🔥 新增：導入 Supabase 客戶端連線
import { supabase } from './supabaseClient';
import Login from './Login';

// ==========================================
// 共用數學公式與常數區
// ==========================================
const TARGET_BPM = 110; // 目標節拍器頻率

function calculateAngle(a, b, c) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

function calculateCenterVerticalAngle(ls, rs, lw, rw) {
  const midShoulder = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const midWrist = { x: (lw.x + rw.x) / 2, y: (lw.y + rw.y) / 2 };
  const dx = midWrist.x - midShoulder.x;
  const dy = midWrist.y - midShoulder.y;
  const angle = Math.abs(Math.atan2(dy, dx) * 180.0 / Math.PI);
  return { angle, midShoulder, midWrist };
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const userIcon = L.divIcon({
  className: 'custom-user-icon',
  html: `<div style="background-color: #3b82f6; border-radius: 50%; width: 16px; height: 16px; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.8); animation: pulse 2s infinite;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const aedIcon = L.divIcon({
  className: 'custom-aed-icon',
  html: `<div style="background-color: #ef4444; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.3);">AED</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// ==========================================
// 1. 首頁 (Home)
// ==========================================
function Home() {
  const navigate = useNavigate();
  const handleLogout = async () => {
  // 1. 登出 Supabase 會員
  await supabase.auth.signOut();
  
  // 2. 清除訪客標記
  localStorage.removeItem('isGuest');
  
  // 3. 強制跳轉回登入頁面
  window.location.href = "/login";
};

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden">
        <header className="flex justify-between items-center p-6 pt-12">
          <button className="w-12 h-12 border-2 border-gray-800 rounded-full flex flex-col justify-center items-center gap-1.5 active:scale-90 transition-transform">
            <div className="w-6 h-0.5 bg-gray-800"></div>
            <div className="w-6 h-0.5 bg-gray-800"></div>
            <div className="w-6 h-0.5 bg-gray-800"></div>
          </button>
          <button className="w-12 h-12 flex justify-center items-center active:scale-90 transition-transform">
            <svg className="w-10 h-10 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          </button>
        </header>

        <main className="flex-1 p-6 relative flex flex-col justify-center pb-24">
          <div className="grid grid-cols-2 gap-4 relative">
            <button onClick={() => navigate('/aed')} className="bg-orange-200 h-56 rounded-2xl flex flex-col items-center justify-center active:scale-95 transition-transform shadow-sm">
              <span className="text-xl font-bold text-gray-800 tracking-wider">尋找AED</span>
            </button>
            <button onClick={() => navigate('/practice')} className="bg-indigo-300 h-56 rounded-2xl flex flex-col items-center justify-center active:scale-95 transition-transform shadow-sm">
              <span className="text-xl font-bold text-gray-800 tracking-wider">CPR練習</span>
            </button>
            <button onClick={() => navigate('/quiz')} className="bg-green-200 h-56 rounded-2xl flex flex-col items-center justify-center active:scale-95 transition-transform shadow-sm">
              <span className="text-xl font-bold text-gray-800 tracking-wider">考照題庫</span>
            </button>
            <button onClick={() => navigate('/history')} className="bg-cyan-100 h-56 rounded-2xl flex flex-col items-center justify-center active:scale-95 transition-transform shadow-sm">
              <span className="text-xl font-bold text-gray-800 tracking-wider">歷史紀錄</span>
            </button>
          </div>
          
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <button onClick={() => navigate('/emergency')} className="bg-red-500 w-48 h-48 rounded-full border-[10px] border-white shadow-xl flex flex-col items-center justify-center active:scale-95 transition-transform">
              <span className="text-white text-3xl font-bold tracking-widest mb-2">緊急CPR</span>
              <span className="text-white text-xs text-center leading-tight px-4 font-light">點擊撥打119並啟動<br/>CPR指導</span>
            </button>
          </div>
        </main>

        {/* 🔥 新增：最下方的登出按鈕區 */}
        <footer className="p-6 pb-10 flex justify-center">
          <button 
            onClick={handleLogout}
            className="text-gray-400 text-sm font-medium hover:text-red-500 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            登出系統
          </button>
        </footer>
        
      </div>
    </div>
  );
}

// ==========================================
// 2. 真實 AED 地圖頁 (AEDMap)
// ==========================================
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 16);
  }, [center, map]);
  return null;
}

function AEDMap() {
  const navigate = useNavigate();
  const location = useLocation();
  const isFromEmergency = location.state?.fromEmergency;
  
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyAeds, setNearbyAeds] = useState([]);
  const [errorMsg, setErrorMsg] = useState("正在抓取您的 GPS 定位...");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;
          setUserLocation({ lat: currentLat, lng: currentLng });
          
          setErrorMsg("定位成功！正在下載衛福部全國 AED 資料庫...");
          
          try {
            const { data, error } = await supabase
              .from('AedLocation')
              .select('*')
              .limit(15000); 

            if (error) throw error;
            
            const processedAeds = data
              .map(item => {
                // 1. 處理時間 (優先使用備註，若無備註則顯示平日時間)
                const memo = item['開放使用時間備註'];
                const wdStart = item['周一至周五起'];
                const wdEnd = item['周一至周五迄'];
                let timeStr = "未提供時間";
                
                if (memo && memo !== 'EMPTY' && memo.trim() !== '') {
                  timeStr = memo; // 例如："24H" 或 "全時段開放"
                } else if (wdStart && wdStart !== 'EMPTY') {
                  // 擷取前五個字元，把 08:00:00 變成 08:00
                  timeStr = `平日 ${wdStart.substring(0,5)}-${wdEnd.substring(0,5)}`;
                }

                // 2. 處理放置地點與描述
                const placement = item['AED放置地點'] && item['AED放置地點'] !== 'EMPTY' ? item['AED放置地點'] : '';
                const desc = item['場所描述'] && item['場所描述'] !== 'EMPTY' ? item['場所描述'] : '';
                let detailInfo = placement;
                if (desc) detailInfo += (detailInfo ? ` (${desc})` : desc);
                if (!detailInfo) detailInfo = "無詳細位置資訊";

                return {
                  id: item['AEDID'] || item['場所ID'] || Math.random(), 
                  name: item['場所名稱'],
                  lat: parseFloat(item['地點LAT']), 
                  lng: parseFloat(item['地點LNG']), 
                  address: item['場所地址'],
                  time: timeStr,
                  detail: detailInfo // 🔥 新增詳細位置欄位
                };
              })
              // 剔除沒有經緯度或轉換失敗的壞資料
              .filter(item => !isNaN(item.lat) && !isNaN(item.lng))
              // 計算每台 AED 與你的距離
              .map(aed => ({ ...aed, distance: getDistance(currentLat, currentLng, aed.lat, aed.lng) }))
              // 效能優化：只留下距離你小於 3 公里 (3km) 的 AED
              .filter(aed => aed.distance < 3)
              // 依照距離由近到遠排序
              .sort((a, b) => a.distance - b.distance);
            
            setNearbyAeds(processedAeds);
            if (processedAeds.length === 0) setErrorMsg("您方圓 3 公里內目前無 AED 資料。");
            else setErrorMsg(null);

          } catch (error) {
            console.error("Supabase 讀取失敗:", error);
            setErrorMsg("無法連接您的專屬資料庫，請稍後再試。");
          }
        },
        (error) => { setErrorMsg("無法取得定位，請確認手機或瀏覽器是否允許 GPS 權限。"); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setErrorMsg("您的瀏覽器不支援定位功能。");
    }
  }, []);

  const handleBack = () => {
    if (isFromEmergency) navigate('/emergency', { state: { step: 2 } });
    else navigate(-1);
  };

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden">
        <header className="flex items-center p-6 pt-12 bg-white shadow-sm z-20 relative">
          <button onClick={handleBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 shadow-sm active:scale-90 transition-transform">
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="flex-1 text-center text-xl font-bold text-gray-800 mr-10">附近 AED 地圖</h1>
        </header>

        <main className="flex-1 relative flex flex-col">
          {errorMsg && (
            <div className="bg-yellow-100 text-yellow-800 text-xs px-4 py-2 text-center font-bold absolute w-full z-[1000] shadow-md flex items-center justify-center gap-2">
              {errorMsg.includes("下載") && <div className="w-3 h-3 border-2 border-yellow-800 border-t-transparent rounded-full animate-spin"></div>}
              {errorMsg}
            </div>
          )}
          
          <div className="flex-1 w-full bg-gray-200 z-10 relative">
            {userLocation ? (
              <MapContainer center={[userLocation.lat, userLocation.lng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='© CARTO' />
                <MapUpdater center={[userLocation.lat, userLocation.lng]} />
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}><Popup>📍 您的目前位置</Popup></Marker>
                {nearbyAeds.map(aed => (
                  <Marker key={aed.id} position={[aed.lat, aed.lng]} icon={aedIcon}>
                    <Popup>
                      <b className="text-gray-800 text-sm">{aed.name}</b><br/>
                      <span className="text-xs text-blue-600 font-bold block mt-1">📍 {aed.detail}</span>
                      <span className="text-xs text-gray-500 mt-1 block">{aed.address}</span>
                      <span className="text-xs font-bold text-green-600 block mt-1">🕒 {aed.time}</span>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-20 relative -mt-6">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center justify-between">
              距離最近的 AED <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">資料來源: 衛福部</span>
            </h2>
            <div className="space-y-3 mb-5 overflow-y-auto max-h-[30vh] pr-2">
              {nearbyAeds.length > 0 ? (
                nearbyAeds.map((aed, index) => (
                  <div key={aed.id} className="flex justify-between items-center border border-gray-100 p-3 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-bold text-xs shrink-0">{index + 1}</div>
                      <div className="truncate">
                        <div className="font-bold text-gray-800 text-sm truncate">{aed.name}</div>
                        <div className="text-xs text-blue-600 font-bold mt-0.5 truncate">📍 {aed.detail}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{aed.address}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-blue-600">{aed.distance < 1 ? `${Math.round(aed.distance * 1000)}m` : `${aed.distance.toFixed(1)}km`}</div>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${aed.lat},${aed.lng}`} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded mt-1 inline-block font-bold active:scale-95">Google 導航</a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-4 text-sm font-medium">{errorMsg ? "正在搜尋中..." : "方圓 3 公里內找不到 AED 資料"}</div>
              )}
            </div>
            {isFromEmergency && (
              <button onClick={handleBack} className="w-full bg-red-500 text-white font-bold text-lg py-4 rounded-xl shadow-lg active:scale-95 transition-transform animate-pulse">
                取得 AED 後，返回進行 CPR
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ==========================================
// 3. 緊急 CPR 引導頁 (EmergencyCPR)
// ==========================================
function EmergencyCPR() {
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
    { titleLeft: <span className="text-gray-800 font-medium text-2xl">叫</span>, titleRight: <><span className="text-red-500 font-black text-2xl tracking-widest">叫</span><span className="text-gray-800 font-medium text-2xl tracking-widest">CD</span></>, heading: "呼叫求援、取得AED：", points: ["若無意識、無呼吸，立即撥打119。", "若現場有AED，設法取得；若有旁人，請旁人協助取得。"] },
    { titleLeft: <span className="text-gray-800 font-medium text-2xl">叫叫</span>, titleRight: <><span className="text-red-500 font-black text-2xl tracking-widest">C</span><span className="text-gray-800 font-medium text-2xl tracking-widest">D</span></>, heading: "胸外按壓：", points: ["位置：雙乳頭連線中央（胸骨下半段）。", "姿勢：雙手交疊，手指緊扣，手肘打直，以身體重量垂直下壓。", "口訣：用力壓、快快壓、胸回彈、莫中斷。速率100~120下/分，深度5-6公分。"] },
    { titleLeft: <span className="text-gray-800 font-medium text-2xl">叫叫C</span>, titleRight: <span className="text-red-500 font-black text-2xl tracking-widest">D</span>, heading: "操作 AED 電擊器：", points: ["【AED 操作口訣：開、貼、插、電】", "開：打開 AED 電擊器，取出 AED 貼片並開啟電源。", "貼：將 AED 貼片貼在患者的右胸上方和左胸下方。", "插：AED 貼片貼好後，將電擊貼片插銷與主機連結，若取得 AED 時插銷已接上則可略過此步驟。", "電：待 AED 自動分析心律結束之後，會判斷患者是否須要電擊。若有電擊必要，則在確認周圍無人觸碰患者後，按下電擊鍵。"] }
  ];

  const currentStep = stepData[step];

  // 🔥 修正：使用 h-[100dvh] 與 overflow-hidden 徹底防止手機網址列造成的上下滾動
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

        {step < 2 && (
          <div className="absolute bottom-10 left-0 w-full px-6 flex justify-between gap-4">
            {!isCalling ? (
              <button onClick={() => { setIsCalling(true); setCallSeconds(0); }} className="bg-red-500 text-white font-bold text-lg py-4 px-8 rounded-full shadow-lg active:scale-95 transition-transform w-full">
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

// ==========================================
// 4. 緊急鏡頭輔助 (EmergencyCamera)
// ==========================================
function EmergencyCamera() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null); 
  const poseLandmarkerRef = useRef(null);
  const requestRef = useRef(null);
  
  const [bpm, setBpm] = useState(0);
  const [pressCount, setPressCount] = useState(0);
  const [warningMsg, setWarningMsg] = useState("模型載入中...");
  const [depthWarning, setDepthWarning] = useState(""); 
  const [isTraining, setIsTraining] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [facingMode, setFacingMode] = useState("environment"); 
  const facingModeRef = useRef("environment"); 

  const isTrainingRef = useRef(false);
  const pressCountRef = useRef(0);
  const startTimeRef = useRef(0);
  const positionStateRef = useRef("up");
  const highestYRef = useRef(1.0);
  const lowestYRef = useRef(0.0);
  const highestWristYRef = useRef(10000);
  const lowestWristYRef = useRef(0.0);   
  const baselineShoulderYRef = useRef(null); 
  const currentPressMaxDepthRef = useRef(0.0); 
  const threshold = 0.04;
  const lastWarningTimeRef = useRef(0); 
  const lastPressTimeRef = useRef(0);
  const depthWarningRef = useRef("");
  const switchCamera = async () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    facingModeRef.current = newMode;
    
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: newMode } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("切換鏡頭失敗:", err);
      alert("無法切換鏡頭，請確認相機權限！");
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(err => console.log(err));
      }
    };
  }, []);

  useEffect(() => {
    let interval;
    if (isTraining && audioCtxRef.current) {
      interval = setInterval(() => {
        if (audioCtxRef.current.state === 'running') {
          const osc = audioCtxRef.current.createOscillator();
          const gainNode = audioCtxRef.current.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, audioCtxRef.current.currentTime);
          
          gainNode.gain.setValueAtTime(1, audioCtxRef.current.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.1);
          
          osc.connect(gainNode);
          gainNode.connect(audioCtxRef.current.destination);
          osc.start(audioCtxRef.current.currentTime);
          osc.stop(audioCtxRef.current.currentTime + 0.1);
        }
      }, (60 / TARGET_BPM) * 1000);
    }
    return () => clearInterval(interval);
  }, [isTraining]);

  useEffect(() => {
    let timer;
    if (isTraining && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isTraining) {
      alert("⚠️ 2 分鐘已到！請換人接手按壓！");
      setTimeLeft(120); 
    }
    return () => clearInterval(timer);
  }, [isTraining, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStartEmergency = () => {
      // ✨ 新增：請求全螢幕
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    }
    setIsTraining(true);
    isTrainingRef.current = true;
    pressCountRef.current = 0;
    setPressCount(0);
    startTimeRef.current = Date.now();
    setBpm(0);
    setTimeLeft(120); 
    setWarningMsg("請開始按壓！");
    setDepthWarning("");
    depthWarningRef.current = "";
    baselineShoulderYRef.current = null;
    currentPressMaxDepthRef.current = 0.0;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  };

  const handleStopEmergency = () => {
          // ✨ 新增：退出全螢幕
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    
    setIsTraining(false);
    isTrainingRef.current = false;
    navigate('/emergency', { state: { step: 3 } });
  };

  useEffect(() => {
    let lastVideoTime = -1;
    let canvasCtx = null;
    let drawingUtils = null;

    const initializeMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
        );
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/pose_landmarker_full.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1
        });
        setWarningMsg("請將雙方對準人體輪廓...");
        
        navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "environment" } })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
            }
          })
          .catch((err) => {
            console.error("相機權限遭拒或錯誤:", err);
            setWarningMsg("請允許相機權限！");
          });
      } catch (error) {
        console.error("模型載入失敗:", error);
      }
    };

    initializeMediaPipe();

    const renderLoop = () => {
      const videoElement = videoRef.current;
      const canvasElement = canvasRef.current;
      
      if (videoElement && videoElement.readyState >= 2 && poseLandmarkerRef.current && canvasElement) {
        if (!canvasCtx) {
          canvasCtx = canvasElement.getContext('2d');
          drawingUtils = new DrawingUtils(canvasCtx);
        }

        if (lastVideoTime !== videoElement.currentTime) {
          lastVideoTime = videoElement.currentTime;
          let startTimeMs = performance.now();
          const results = poseLandmarkerRef.current.detectForVideo(videoElement, startTimeMs);

          canvasElement.width = videoElement.videoWidth;
          canvasElement.height = videoElement.videoHeight;
          const w = canvasElement.width;
          const h = canvasElement.height;

          canvasCtx.save();
          canvasCtx.clearRect(0, 0, w, h);
          
          if (facingModeRef.current === 'user') {
            canvasCtx.translate(w, 0);
            canvasCtx.scale(-1, 1);
          }
          
          canvasCtx.drawImage(videoElement, 0, 0, w, h);

          if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const TARGET_LANDMARKS = [11, 12, 13, 14, 15, 16, 23, 24];
            const UPPER_BODY_CONNECTIONS = [
              { start: 11, end: 12 }, { start: 11, end: 13 }, { start: 13, end: 15 },
              { start: 12, end: 14 }, { start: 14, end: 16 }, { start: 11, end: 23 },
              { start: 12, end: 24 }, { start: 23, end: 24 }
            ];

            landmarks.forEach((lm, index) => {
              if (!TARGET_LANDMARKS.includes(index)) { if (lm) lm.visibility = 0; }
            });

            drawingUtils.drawConnectors(landmarks, UPPER_BODY_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
            const pointsToDraw = TARGET_LANDMARKS.map(index => landmarks[index]).filter(Boolean);
            drawingUtils.drawLandmarks(pointsToDraw, { color: '#FF0000', lineWidth: 2, radius: 3 });

            const ls = landmarks[11], rs = landmarks[12], lw = landmarks[15], rw = landmarks[16];
            const re = landmarks[14]; 

            if (isTrainingRef.current && ls && lw && (ls.visibility || 1) > 0.5 && (lw.visibility || 1) > 0.5) {
              const { angle: centerVertAngle, midShoulder, midWrist } = calculateCenterVerticalAngle(ls, rs, lw, rw);
              
              if (baselineShoulderYRef.current === null || midShoulder.y < baselineShoulderYRef.current) {
                baselineShoulderYRef.current = midShoulder.y;
              }
              

              const isInTargetBox = midShoulder.x >= 0.3 && midShoulder.x <= 0.7 && midShoulder.y >= 0.25 && midShoulder.y <= 0.65;
              const now = Date.now();
              if (!isInTargetBox) {
                if (now - lastWarningTimeRef.current > 500) {
                  setWarningMsg("請將雙方對準人體輪廓");
                  lastWarningTimeRef.current = now;
                }
              } else {
                let errors = [];
                let isArmBent = calculateAngle(ls, landmarks[13], lw) < 160 || calculateAngle(rs, landmarks[14], rw) < 160;
                let isNotVertical = centerVertAngle < 80 || centerVertAngle > 100;
                let isOffset = Math.abs(midWrist.x - midShoulder.x) > 0.15;

                if (isArmBent) errors.push("手肘請打直");
                if (isNotVertical) errors.push("重心未垂直");
                if (isOffset) errors.push("未垂直按壓")

                // 宣告 newMsg 變數，解決崩潰問題
                const newMsg = errors.length > 0 ? errors.join(" | ") : "姿勢良好維持！";
                
                // 2. 有對準時的提示，加入 0.5 秒節流防卡死
                if (now - lastWarningTimeRef.current > 500) {
                  setWarningMsg(newMsg);
                  lastWarningTimeRef.current = now;
                }

                const currentShoulderY = midShoulder.y;
                const shoulderWidth = Math.hypot((ls.x - rs.x) * w, (ls.y - rs.y) * h);

                if (positionStateRef.current === "up") {
                  if (currentShoulderY < highestYRef.current) highestYRef.current = currentShoulderY;

                  if (currentShoulderY > highestYRef.current + threshold) { 
                    positionStateRef.current = "down"; 
                    lowestYRef.current = currentShoulderY; 
                  }
                } else if (positionStateRef.current === "down") {
                  if (currentShoulderY > lowestYRef.current) lowestYRef.current = currentShoulderY;

                  // 往下壓再回彈 (完成一次按壓)
                  if (currentShoulderY < lowestYRef.current - threshold) {
                    positionStateRef.current = "up";
                    let pressDepth = (lowestYRef.current - highestYRef.current) * h;
                    
                    // 重置最高點
                    highestYRef.current = currentShoulderY;

                    if (now - lastPressTimeRef.current > 250) { 
                        lastPressTimeRef.current = now; 
                        
                        pressCountRef.current += 1;
                        setPressCount(pressCountRef.current);

                        let ratio = shoulderWidth > 0 ? (pressDepth / shoulderWidth) : 0;
                        
                        let msg = "";
                        if (ratio < 0.12){
                          msg = `深度不足! (比例: ${ratio.toFixed(2)})`;
                        } else if (ratio > 0.15) {
                          msg = `按壓過深! (比例: ${ratio.toFixed(2)})`;
                        } else {
                          msg = `深度良好! (比例: ${ratio.toFixed(2)})`;
                        }
                        setDepthWarning(msg);
                        depthWarningRef.current = msg; 

                        const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
                        if (elapsedTime > 3) {
                           setBpm(Math.floor((pressCountRef.current / elapsedTime) * 60));
                        }
                    }
                  }
                }

                
              }

              canvasCtx.beginPath();
              canvasCtx.moveTo(midShoulder.x * w, midShoulder.y * h);
              canvasCtx.lineTo(midWrist.x * w, midWrist.y * h);
              canvasCtx.strokeStyle = "#FFFF00";
              canvasCtx.lineWidth = 5;
              canvasCtx.stroke();
            }
          }
          canvasCtx.restore(); 

          // 🔥 UI 疊加層繪製 (使用你微調過的完美比例與手臂畫法)
          canvasCtx.save();
          const S = h / 780; // 根據鏡頭畫面高度動態計算縮放比例
          canvasCtx.lineWidth = 6 * S; 
          canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.5)"; 
          canvasCtx.setLineDash([12 * S, 10 * S]); 
          
          const centerX = w * 0.5;
          const rescuerHeadY = h * 0.35; 
          const patientY = rescuerHeadY + 300 * S; 
          
          // 1. 畫躺著的患者
          canvasCtx.beginPath();
          canvasCtx.arc(centerX - 130 * S, patientY, 42 * S, 0, 2 * Math.PI);
          canvasCtx.stroke();
          
          canvasCtx.beginPath();
          canvasCtx.moveTo(centerX - 85 * S, patientY - 26 * S);
          canvasCtx.lineTo(centerX + 160 * S, patientY - 26 * S);
          canvasCtx.moveTo(centerX - 85 * S, patientY + 26 * S);
          canvasCtx.lineTo(centerX + 160 * S, patientY + 26 * S);
          canvasCtx.stroke();

          // 2. 畫施救者
          canvasCtx.beginPath();
          canvasCtx.arc(centerX, rescuerHeadY, 60 * S, 0, 2 * Math.PI);
          canvasCtx.stroke();
          
          // 施救者身體外側/背部 (直直向下)
          canvasCtx.beginPath();
          canvasCtx.moveTo(centerX - 50 * S, rescuerHeadY + 45 * S);
          canvasCtx.lineTo(centerX - 90 * S, rescuerHeadY + 130 * S);
          canvasCtx.lineTo(centerX - 90 * S, patientY - 26 * S); 
          canvasCtx.moveTo(centerX + 50 * S, rescuerHeadY + 45 * S);
          canvasCtx.lineTo(centerX + 90 * S, rescuerHeadY + 130 * S);
          canvasCtx.lineTo(centerX + 90 * S, patientY - 26 * S);
          canvasCtx.stroke();
          
          // 施救者手臂 (完美符合紅線的 V 字打直手臂)
          canvasCtx.beginPath();
          canvasCtx.lineWidth = 4 * Math.max(1, S); 
          canvasCtx.moveTo(centerX - 90 * S, rescuerHeadY + 130 * S); // 從外緣轉折點出發
          canvasCtx.lineTo(centerX - 10 * S, patientY - 26 * S);      // 連接至按壓點
          canvasCtx.moveTo(centerX + 90 * S, rescuerHeadY + 130 * S); // 從外緣轉折點出發
          canvasCtx.lineTo(centerX + 10 * S, patientY - 26 * S);      // 連接至按壓點
          canvasCtx.stroke();

          // 3. 畫按壓目標位置
          canvasCtx.setLineDash([]); 
          canvasCtx.fillStyle = "rgba(100, 255, 100, 0.6)"; 
          canvasCtx.beginPath();
          canvasCtx.arc(centerX, patientY, 28 * S, 0, 2 * Math.PI);
          canvasCtx.fill();
          
          canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          canvasCtx.lineWidth = 4 * Math.max(1, S);
          canvasCtx.stroke();

          // 提示文字
          canvasCtx.font = `bold ${18 * S}px sans-serif`;
          canvasCtx.fillStyle = "rgba(255, 80, 80, 0.9)";
          canvasCtx.textAlign = "center";
          canvasCtx.fillText("按壓位置", centerX, patientY + 60 * S);

          if (isTrainingRef.current && depthWarningRef.current !== "") {
            canvasCtx.font = `bold ${26 * S}px sans-serif`;
            canvasCtx.fillStyle = depthWarningRef.current.includes("良好") ? "#00FF00" : "#FF0000";
            canvasCtx.fillText(depthWarningRef.current, centerX, patientY + 100 * S);
          }
          canvasCtx.restore();
        }
      }
      requestRef.current = requestAnimationFrame(renderLoop);
    };

    if (videoRef.current) {
      videoRef.current.addEventListener('loadeddata', renderLoop);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadeddata', renderLoop);
        if (videoRef.current.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
      }
      if (poseLandmarkerRef.current) poseLandmarkerRef.current.close();
    };
  }, []);

  return (
    <div className="bg-black h-[100dvh] overflow-hidden flex justify-center font-sans">
      <div className="w-full max-w-md bg-black h-[100dvh] relative flex flex-col overflow-hidden">
        
        <video ref={videoRef} className="hidden" playsInline></video>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover"></canvas>

        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-20 pointer-events-none">
          <button 
            onClick={() => navigate('/emergency', { state: { step: 2 } })} 
            className="pointer-events-auto bg-black/50 text-white w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm active:scale-90 transition-transform shadow-lg border border-white/20"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>

          <div className="pointer-events-auto bg-black/60 backdrop-blur-md rounded-2xl px-5 py-2 flex gap-5 text-white shadow-lg border border-white/10 mt-1">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-300 font-medium">速率</span>
              <span className={`text-lg font-black ${bpm >= 100 && bpm <= 120 ? 'text-green-400' : 'text-red-400'}`}>{bpm}</span>
            </div>
            <div className="w-px bg-white/20 my-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-300 font-medium">次數</span>
              <span className="text-lg font-black text-blue-400">{pressCount}</span>
            </div>
            <div className="w-px bg-white/20 my-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-300 font-medium">換手</span>
              <span className="text-lg font-black text-red-400 animate-pulse">{formatTime(timeLeft)}</span>
            </div>
          </div>
          
          <button 
            onClick={switchCamera} 
            className="pointer-events-auto bg-black/50 text-white w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm active:scale-90 transition-transform shadow-lg border border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none w-[80%] max-w-sm">
          <div className={`px-4 py-2 rounded-full flex items-center justify-center gap-2 text-sm font-bold shadow-lg text-white backdrop-blur-md transition-colors 
            ${!isTraining ? 'bg-gray-800/80' : warningMsg.includes("良好") || warningMsg.includes("完美") ? 'bg-green-600/80' : 'bg-red-600/80'}`}>
            <div className={`w-2 h-2 rounded-full ${isTraining ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="tracking-wider">{warningMsg}</span>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-[85%] max-w-sm z-20">
          {!isTraining ? (
            <button onClick={handleStartEmergency} className="w-full bg-blue-600/90 backdrop-blur-sm text-white font-bold text-base py-3.5 rounded-full shadow-2xl active:scale-95 transition-transform border border-blue-400/30">
              開始偵測
            </button>
          ) : (
            <button onClick={handleStopEmergency} className="w-full bg-red-600/90 backdrop-blur-sm text-white font-bold text-base py-3.5 rounded-full shadow-2xl active:scale-95 transition-transform border border-red-400/30">
              AED已抵達 / 暫停按壓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. CPR 練習頁 (CPRPractice)
// ==========================================
function CPRPractice() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null); 
  const poseLandmarkerRef = useRef(null);
  const requestRef = useRef(null);
  
  const [bpm, setBpm] = useState(0);
  const [pressCount, setPressCount] = useState(0); 
  const [warningMsg, setWarningMsg] = useState("模型載入中...");
  const [depthWarning, setDepthWarning] = useState(""); 
  const [isTraining, setIsTraining] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [facingMode, setFacingMode] = useState("environment");
  const facingModeRef = useRef("environment"); 

  const isTrainingRef = useRef(false);
  const pressCountRef = useRef(0);
  const startTimeRef = useRef(0);
  const positionStateRef = useRef("up");
  const highestYRef = useRef(1.0);
  const lowestYRef = useRef(0.0);
  const baselineShoulderYRef = useRef(null); 
  const currentPressMaxDepthRef = useRef(0.0); 
  const threshold = 0.04;
  const highestWristYRef = useRef(10000);
  const lowestWristYRef = useRef(0.0);   
  const lastWarningTimeRef = useRef(0); 
  const lastPressTimeRef = useRef(0);
  const depthWarningRef = useRef("");
  const errorsLogRef = useRef({ armBent: 0, notVertical: 0, positionOffset: 0, notDeepEnough: 0, tooDeep: 0 }); 

  const switchCamera = async () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    facingModeRef.current = newMode;
    
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: newMode } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("切換鏡頭失敗:", err);
      alert("無法切換鏡頭，請確認相機權限！");
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(err => console.log(err));
      }
    };
  }, []);

  useEffect(() => {
    let interval;
    if (isTraining && audioCtxRef.current) {
      interval = setInterval(() => {
        if (audioCtxRef.current.state === 'running') {
          const osc = audioCtxRef.current.createOscillator();
          const gainNode = audioCtxRef.current.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, audioCtxRef.current.currentTime);
          
          gainNode.gain.setValueAtTime(1, audioCtxRef.current.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.1);
          
          osc.connect(gainNode);
          gainNode.connect(audioCtxRef.current.destination);
          osc.start(audioCtxRef.current.currentTime);
          osc.stop(audioCtxRef.current.currentTime + 0.1);
        }
      }, (60 / TARGET_BPM) * 1000);
    }
    return () => clearInterval(interval);
  }, [isTraining]);

  useEffect(() => {
    let timer;
    if (isTraining && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isTraining) {
      handleStopTraining();
    }
    return () => clearInterval(timer);
  }, [isTraining, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStartTraining = () => {
      // ✨ 新增：請求全螢幕
    const element = document.documentElement; // 取得整個網頁節點
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) { /* 支援 Safari */
      element.webkitRequestFullscreen();
    }
    setIsTraining(true);
    isTrainingRef.current = true;
    pressCountRef.current = 0;
    setPressCount(0); 
    errorsLogRef.current = { armBent: 0, notVertical: 0, positionOffset: 0, notDeepEnough: 0, tooDeep: 0 };
    startTimeRef.current = Date.now();
    setBpm(0);
    setTimeLeft(120);
    setWarningMsg("請開始按壓！");
    setDepthWarning("");
    depthWarningRef.current = "";
    baselineShoulderYRef.current = null;
    currentPressMaxDepthRef.current = 0.0;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  };

// 🔥 修改：改為 async，並將資料存入 Supabase
  const handleStopTraining = async () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setIsTraining(false);
    isTrainingRef.current = false;
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours() > 12 ? '下午' : '上午'}${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')}`;

    let accuracy = 0;
    const totalPresses = pressCountRef.current;

    if (totalPresses > 0 && bpm > 0) {
      // 1. 速率分數 (BPM) - 權重 30%
      // 標準：100~120 BPM 滿分。每偏離 1 下扣 2 分。
      let bpmScore = 100;
      if (bpm < 100) bpmScore = Math.max(0, 100 - (100 - bpm) * 2);
      else if (bpm > 120) bpmScore = Math.max(0, 100 - (bpm - 120) * 2);

      // 2. 深度分數 - 權重 35%
      // 深度不足與過深都算嚴重失誤
      const depthErrors = errorsLogRef.current.notDeepEnough + errorsLogRef.current.tooDeep;
      const depthScore = Math.max(0, 100 - (depthErrors / totalPresses) * 100);

      // 3. 位置分數 - 權重 20%
      const positionScore = Math.max(0, 100 - (errorsLogRef.current.positionOffset / totalPresses) * 100);

      // 4. 姿勢分數 - 權重 15%
      // 手肘彎曲與身體未垂直合併計算
      const postureErrors = errorsLogRef.current.armBent + errorsLogRef.current.notVertical;
      const postureScore = Math.max(0, 100 - (postureErrors / totalPresses) * 100);

      // 計算最終加權總分 (四捨五入至整數)
      accuracy = Math.round(
        (bpmScore * 0.30) + 
        (depthScore * 0.35) + 
        (positionScore * 0.20) + 
        (postureScore * 0.15)
      );
    } else {
      // 如果完全沒按壓，或者沒算出 BPM，直接給 0 分
      accuracy = 0;
    }

    // 準備寫入資料庫的格式
    const recordData = {
      user_id: user?.id,
      date: dateStr,
      time: timeStr,
      accuracy: accuracy,
      count: pressCountRef.current,
      bpm: bpm,
      armBent: errorsLogRef.current.armBent,
      notVertical: errorsLogRef.current.notVertical,
      positionOffset: errorsLogRef.current.positionOffset,
      notDeepEnough: errorsLogRef.current.notDeepEnough,
      tooDeep: errorsLogRef.current.tooDeep
    };

    // 寫入 Supabase 資料庫
    try {
      await supabase.from('CprRecord').insert([recordData]);
      console.log('成功儲存紀錄至雲端！');
    } catch (error) {
      console.error('儲存至 Supabase 失敗:', error);
    }

    // 跳轉到報告頁面
    navigate('/report', { state: { finalBpm: bpm, totalPresses: pressCountRef.current, errors: errorsLogRef.current, date: dateStr, time: timeStr, accuracy: accuracy } });
  };

  useEffect(() => {
    let lastVideoTime = -1;
    let canvasCtx = null;
    let drawingUtils = null;

    const initializeMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
        );
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/pose_landmarker_full.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1
        });
        setWarningMsg("請將雙方對準人體輪廓...");
        
        navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "environment" } })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
            }
          })
          .catch((err) => {
            console.error("相機權限遭拒或錯誤:", err);
            setWarningMsg("請允許相機權限！");
          });
      } catch (error) {
        console.error("模型載入失敗:", error);
      }
    };

    initializeMediaPipe();

    const renderLoop = () => {
      const videoElement = videoRef.current;
      const canvasElement = canvasRef.current;
      
      if (videoElement && videoElement.readyState >= 2 && poseLandmarkerRef.current && canvasElement) {
        if (!canvasCtx) {
          canvasCtx = canvasElement.getContext('2d');
          drawingUtils = new DrawingUtils(canvasCtx);
        }

        if (lastVideoTime !== videoElement.currentTime) {
          lastVideoTime = videoElement.currentTime;
          let startTimeMs = performance.now();
          const results = poseLandmarkerRef.current.detectForVideo(videoElement, startTimeMs);

          canvasElement.width = videoElement.videoWidth;
          canvasElement.height = videoElement.videoHeight;
          const w = canvasElement.width;
          const h = canvasElement.height;

          canvasCtx.save();
          canvasCtx.clearRect(0, 0, w, h);
          
          if (facingModeRef.current === 'user') {
            canvasCtx.translate(w, 0);
            canvasCtx.scale(-1, 1);
          }
          
          canvasCtx.drawImage(videoElement, 0, 0, w, h);

          if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const TARGET_LANDMARKS = [11, 12, 13, 14, 15, 16, 23, 24]
            const UPPER_BODY_CONNECTIONS = [
              { start: 11, end: 12 }, { start: 11, end: 13 }, { start: 13, end: 15 },
              { start: 12, end: 14 }, { start: 14, end: 16 }, { start: 11, end: 23 },
              { start: 12, end: 24 }, { start: 23, end: 24 }
            ];

            landmarks.forEach((lm, index) => {
              if (!TARGET_LANDMARKS.includes(index)) { if (lm) lm.visibility = 0; }
            });

            drawingUtils.drawConnectors(landmarks, UPPER_BODY_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
            const pointsToDraw = TARGET_LANDMARKS.map(index => landmarks[index]).filter(Boolean);
            drawingUtils.drawLandmarks(pointsToDraw, { color: '#FF0000', lineWidth: 2, radius: 3 });

            const ls = landmarks[11], rs = landmarks[12], lw = landmarks[15], rw = landmarks[16];
            const re = landmarks[14];

            if (isTrainingRef.current && ls && lw && (ls.visibility || 1) > 0.5 && (lw.visibility || 1) > 0.5) {
              const { angle: centerVertAngle, midShoulder, midWrist } = calculateCenterVerticalAngle(ls, rs, lw, rw);
              
              if (baselineShoulderYRef.current === null || midShoulder.y < baselineShoulderYRef.current) {
                baselineShoulderYRef.current = midShoulder.y;
              }
              

              const isInTargetBox = midShoulder.x >= 0.3 && midShoulder.x <= 0.7 && midShoulder.y >= 0.25 && midShoulder.y <= 0.65;
              const now= Date.now();
             if (!isInTargetBox) {
                if (now - lastWarningTimeRef.current > 500) {
                  setWarningMsg("請將雙方對準人體輪廓");
                  lastWarningTimeRef.current = now;
                }
              } else {
                let errors = [];
                let isArmBent = calculateAngle(ls, landmarks[13], lw) < 160 || calculateAngle(rs, landmarks[14], rw) < 160;
                let isNotVertical = centerVertAngle < 80 || centerVertAngle > 100;
                let isOffset = Math.abs(midWrist.x - midShoulder.x) > 0.15;

                if (isArmBent) errors.push("手肘請打直");
                if (isNotVertical) errors.push("重心未垂直");
                if (isOffset) errors.push("未垂直按壓")

                // 宣告 newMsg 變數
                const newMsg = errors.length > 0 ? errors.join(" | ") : "姿勢完美，請保持！";

                // 2. 有對準時的提示，加入 0.5 秒節流防卡死
                if (now - lastWarningTimeRef.current > 500) {
                  setWarningMsg(newMsg);
                  lastWarningTimeRef.current = now;
                }

                const currentShoulderY = midShoulder.y;
                const shoulderWidth = Math.hypot((ls.x - rs.x) * w, (ls.y - rs.y) * h);

                if (positionStateRef.current === "up") {
                  // 更新最高點 (只需看肩膀)
                  if (currentShoulderY < highestYRef.current) highestYRef.current = currentShoulderY;

                  if (currentShoulderY > highestYRef.current + threshold) { 
                    positionStateRef.current = "down"; 
                    lowestYRef.current = currentShoulderY; 
                  }
                } else if (positionStateRef.current === "down") {
                  // 更新最低點 (只需看肩膀)
                  if (currentShoulderY > lowestYRef.current) lowestYRef.current = currentShoulderY;

                  if (currentShoulderY < lowestYRef.current - threshold) {
                    positionStateRef.current = "up";
                    

                    let pressDepth = (lowestYRef.current - highestYRef.current) * h;
                    
                    // 重置最高點
                    highestYRef.current = currentShoulderY;

                    if (now - lastPressTimeRef.current > 250) { 
                        lastPressTimeRef.current = now; 
                        
                        pressCountRef.current += 1;
                        setPressCount(pressCountRef.current); 

                        if (typeof errorsLogRef !== 'undefined' && errorsLogRef.current) {
                          if (isArmBent) errorsLogRef.current.armBent += 1;
                          if (isNotVertical) errorsLogRef.current.notVertical += 1;
                          if (isOffset) errorsLogRef.current.positionOffset += 1;
                        }

                        // 深度比例計算
                        let ratio = shoulderWidth > 0 ? (pressDepth / shoulderWidth) : 0;

                        let msg = "";
                        if (ratio < 0.12){ 
                          if (typeof errorsLogRef !== 'undefined' && errorsLogRef.current) {
                            errorsLogRef.current.notDeepEnough += 1;
                          }
                          msg = `深度不足! (比例: ${ratio.toFixed(2)})`;
                        } else if (ratio > 0.15) {
                          if (typeof errorsLogRef !== 'undefined' && errorsLogRef.current) {
                            errorsLogRef.current.tooDeep += 1; 
                          }
                          msg = `按壓過深! (比例: ${ratio.toFixed(2)})`;
                        } else {
                          msg = `深度良好! (比例: ${ratio.toFixed(2)})`;
                        }

                        setDepthWarning(msg);
                        depthWarningRef.current = msg;
                        
                        const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
                        if (elapsedTime > 3) {
                           setBpm(Math.floor((pressCountRef.current / elapsedTime) * 60));
                        }
                    }
                  }
                }
              }

              canvasCtx.beginPath();
              canvasCtx.moveTo(midShoulder.x * w, midShoulder.y * h);
              canvasCtx.lineTo(midWrist.x * w, midWrist.y * h);
              canvasCtx.strokeStyle = "#FFFF00";
              canvasCtx.lineWidth = 5;
              canvasCtx.stroke();
            }
          }
          canvasCtx.restore();

          // 🔥 UI 疊加層繪製 (使用你微調過的完美比例與手臂畫法)
          canvasCtx.save();
          const S = h / 780; // 根據鏡頭畫面高度動態計算縮放比例
          canvasCtx.lineWidth = 6 * S; 
          canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.5)"; 
          canvasCtx.setLineDash([12 * S, 10 * S]); 
          
          const centerX = w * 0.5;
          const rescuerHeadY = h * 0.35; 
          const patientY = rescuerHeadY + 300 * S; 
          
          // 1. 畫躺著的患者
          canvasCtx.beginPath();
          canvasCtx.arc(centerX - 130 * S, patientY, 42 * S, 0, 2 * Math.PI);
          canvasCtx.stroke();
          
          canvasCtx.beginPath();
          canvasCtx.moveTo(centerX - 85 * S, patientY - 26 * S);
          canvasCtx.lineTo(centerX + 160 * S, patientY - 26 * S);
          canvasCtx.moveTo(centerX - 85 * S, patientY + 26 * S);
          canvasCtx.lineTo(centerX + 160 * S, patientY + 26 * S);
          canvasCtx.stroke();

          // 2. 畫施救者
          canvasCtx.beginPath();
          canvasCtx.arc(centerX, rescuerHeadY, 60 * S, 0, 2 * Math.PI);
          canvasCtx.stroke();
          
          // 施救者身體外側/背部 (直直向下)
          canvasCtx.beginPath();
          canvasCtx.moveTo(centerX - 50 * S, rescuerHeadY + 45 * S);
          canvasCtx.lineTo(centerX - 90 * S, rescuerHeadY + 130 * S);
          canvasCtx.lineTo(centerX - 90 * S, patientY - 26 * S); 
          canvasCtx.moveTo(centerX + 50 * S, rescuerHeadY + 45 * S);
          canvasCtx.lineTo(centerX + 90 * S, rescuerHeadY + 130 * S);
          canvasCtx.lineTo(centerX + 90 * S, patientY - 26 * S);
          canvasCtx.stroke();
          
          // 施救者手臂 (完美符合紅線的 V 字打直手臂)
          canvasCtx.beginPath();
          canvasCtx.lineWidth = 4 * Math.max(1, S); 
          canvasCtx.moveTo(centerX - 90 * S, rescuerHeadY + 130 * S); // 從外緣轉折點出發
          canvasCtx.lineTo(centerX - 10 * S, patientY - 26 * S);      // 連接至按壓點
          canvasCtx.moveTo(centerX + 90 * S, rescuerHeadY + 130 * S); // 從外緣轉折點出發
          canvasCtx.lineTo(centerX + 10 * S, patientY - 26 * S);      // 連接至按壓點
          canvasCtx.stroke();

          // 3. 畫按壓目標位置
          canvasCtx.setLineDash([]); 
          canvasCtx.fillStyle = "rgba(100, 255, 100, 0.6)"; 
          canvasCtx.beginPath();
          canvasCtx.arc(centerX, patientY, 28 * S, 0, 2 * Math.PI);
          canvasCtx.fill();
          
          canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          canvasCtx.lineWidth = 4 * Math.max(1, S);
          canvasCtx.stroke();

          // 提示文字
          canvasCtx.font = `bold ${18 * S}px sans-serif`;
          canvasCtx.fillStyle = "rgba(255, 80, 80, 0.9)";
          canvasCtx.textAlign = "center";
          canvasCtx.fillText("按壓位置", centerX, patientY + 60 * S);

          if (isTrainingRef.current && depthWarningRef.current !== "") {
            canvasCtx.font = `bold ${26 * S}px sans-serif`;
            canvasCtx.fillStyle = depthWarningRef.current.includes("良好") ? "#00FF00" : "#FF0000";
            canvasCtx.fillText(depthWarningRef.current, centerX, patientY + 100 * S);
          }

          canvasCtx.restore();
        }
      }
      requestRef.current = requestAnimationFrame(renderLoop);
    };

    if (videoRef.current) {
      videoRef.current.addEventListener('loadeddata', renderLoop);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadeddata', renderLoop);
        if (videoRef.current.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
      }
      if (poseLandmarkerRef.current) poseLandmarkerRef.current.close();
    };
  }, []);

  return (
    <div className="bg-black h-[100dvh] overflow-hidden flex justify-center font-sans">
      <div className="w-full max-w-md bg-black h-[100dvh] relative flex flex-col overflow-hidden">
        
        <video ref={videoRef} className="hidden" playsInline></video>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover"></canvas>

        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-20 pointer-events-none">
          <button 
            onClick={() => navigate(-1)} 
            className="pointer-events-auto bg-black/50 text-white w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm active:scale-90 transition-transform shadow-lg border border-white/20"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>

          <div className="pointer-events-auto bg-black/60 backdrop-blur-md rounded-2xl px-5 py-2 flex gap-5 text-white shadow-lg border border-white/10 mt-1">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-300 font-medium">速率</span>
              <span className={`text-lg font-black ${bpm >= 100 && bpm <= 120 ? 'text-green-400' : 'text-indigo-400'}`}>{bpm}</span>
            </div>
            <div className="w-px bg-white/20 my-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-300 font-medium">次數</span>
              <span className="text-lg font-black text-blue-400">{pressCount}</span>
            </div>
            <div className="w-px bg-white/20 my-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-300 font-medium">倒數</span>
              <span className="text-lg font-black text-red-400">{formatTime(timeLeft)}</span>
            </div>
          </div>
          
          <button 
            onClick={switchCamera} 
            className="pointer-events-auto bg-black/50 text-white w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm active:scale-90 transition-transform shadow-lg border border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none w-[80%] max-w-sm">
          <div className={`px-4 py-2 rounded-full flex items-center justify-center gap-2 text-sm font-bold shadow-lg text-white backdrop-blur-md transition-colors 
            ${!isTraining ? 'bg-gray-800/80' : warningMsg.includes("完美") ? 'bg-green-500/80' : 'bg-red-500/80'}`}>
            <div className={`w-2 h-2 rounded-full ${isTraining ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="tracking-wider">{warningMsg}</span>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-[85%] max-w-sm z-20">
          {!isTraining ? (
            <button onClick={handleStartTraining} className="w-full bg-blue-600/90 backdrop-blur-sm text-white font-bold text-base py-3.5 rounded-full shadow-2xl active:scale-95 transition-transform border border-blue-400/30">
              開始訓練
            </button>
          ) : (
            <button onClick={handleStopTraining} className="w-full bg-red-500/90 backdrop-blur-sm text-white font-bold text-base py-3.5 rounded-full shadow-2xl active:scale-95 transition-transform border border-red-400/30">
              結束訓練並查看報告
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 6. 實作練習分析報告頁 (CPRReport)
// ==========================================
function CPRReport() {
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
              {/* 🔥 新增：按壓深度不足統計 */}
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="font-bold text-gray-800 text-base">按壓深度不足(&lt;5cm)</span><span className="text-xs text-gray-500 font-bold">出現 {reportData.errors.notDeepEnough || 0} 次</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-full bg-purple-200 h-3 rounded-full overflow-hidden flex"><div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min((reportData.errors.notDeepEnough || 0) * 10, 100)}%` }}></div></div>
                  <span className="text-xs font-bold text-purple-500 w-10 text-right">致命</span>
                </div>
              </div>

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

// ==========================================
// 7. 考照題庫頁 (CPRQuiz)
// ==========================================
function CPRQuiz() {
  const navigate = useNavigate();

  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [userRecord, setUserRecord] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // 新增載入狀態

  // 🔥 修改：從 Supabase 抓取題目
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        // 從資料庫抓取所有題目
        const { data, error } = await supabase
          .from('QuestionBank')
          .select('*');

        if (error) throw error;

        if (data) {
          // 隨取 20 題並打亂順序
          const shuffled = [...data].sort(() => 0.5 - Math.random()).slice(0, 20);
          setQuizQuestions(shuffled);
        }
      } catch (err) {
        console.error("抓取題庫失敗:", err.message);
        alert("無法載入題庫，請檢查網路連線");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // 處理載入中畫面
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-bold">題庫載入中...</p>
        </div>
      </div>
    );
  }

  if (quizQuestions.length === 0) return <div className="p-10 text-center">暫無題目資料</div>;

  const currentQ = quizQuestions[currentIndex];

  const handleOptionClick = (key) => {
    if (showExplanation) return;
    setSelectedOption(key);
    setShowExplanation(true);
    
    setUserRecord(prev => [
      ...prev, 
      {
        question: currentQ.question,
        options: currentQ.options,
        userAns: key,
        correctAns: currentQ.answer,
        explanation: currentQ.explanation
      }
    ]);
  };

// 🔥 修改為 async，在最後一題寫入雲端
  const handleNextQuestion = async () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      // 計算最終成績
      const correctCount = userRecord.filter(r => r.userAns === r.correctAns).length;
      const finalScore = Math.round((correctCount / quizQuestions.length) * 100);
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date();
      const dateStr = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
      const timeStr = `${now.getHours() > 12 ? '下午' : '上午'}${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')}`;

      // 準備寫入資料庫的格式
      const recordData = {
        user_id: user?.id,
        date: dateStr,
        time: timeStr,
        score: finalScore,
        correct: correctCount,
        total: quizQuestions.length,
        details: userRecord // 🔥 直接把整個陣列存成 JSONB！
      };

      try {
        await supabase.from('QuizRecord').insert([recordData]);
        console.log('題庫成績儲存成功！');
      } catch (error) {
        console.error('儲存題庫成績失敗:', error);
      }

      setIsFinished(true);
    }
  };

  if (isFinished) {
    const score = userRecord.filter(r => r.userAns === r.correctAns).length;
    return (
      <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
        <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden p-6">
          <header className="flex items-center pt-6 pb-4">
            <h1 className="flex-1 text-center text-xl font-bold text-gray-800">測驗結果</h1>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-5xl font-black text-green-600">{Math.round((score / quizQuestions.length) * 100)}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">測驗完成！</h2>
            <p className="text-gray-500 mb-8">你總共答對了 {score} / {quizQuestions.length} 題</p>
            <button onClick={() => navigate('/history')} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg active:scale-95 transition-transform">前往歷史紀錄查看</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden">
        <header className="flex items-center p-6 pt-12 bg-white shadow-sm z-10">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 shadow-sm active:scale-90 transition-transform">
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="flex-1 text-center text-xl font-bold text-gray-800 mr-10">考照題庫</h1>
        </header>

        <main className="flex-1 p-6 overflow-y-auto pb-24">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">答題進度: {currentIndex + 1} / {quizQuestions.length}</span>
          </div>
          <div className="mb-6"><h2 className="text-lg font-bold text-gray-800 leading-relaxed tracking-wide">{currentQ.question}</h2></div>
          
          <div className="space-y-3 mb-6">
            {currentQ.options.map((opt) => {
              let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex gap-3 bg-white ";
              if (!showExplanation) { btnClass += "border-gray-300"; } 
              else {
                if (opt.key === currentQ.answer) btnClass += "border-gray-300";
                else if (opt.key === selectedOption) btnClass += "border-gray-300";
                else btnClass += "border-gray-300 opacity-50";
              }
              return (
                <button key={opt.key} onClick={() => handleOptionClick(opt.key)} className={btnClass}>
                  <span className={`font-bold ${showExplanation && opt.key === currentQ.answer ? 'text-green-600' : showExplanation && opt.key === selectedOption ? 'text-red-600' : 'text-gray-800'}`}>({opt.key})</span>
                  <span className={`font-medium ${showExplanation && opt.key === currentQ.answer ? 'text-green-600' : showExplanation && opt.key === selectedOption ? 'text-red-600' : 'text-gray-800'}`}>{opt.text}</span>
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <>
              <div className="flex justify-around mb-4 font-bold text-lg">
                <div className="text-gray-800">你的答案: <span className={selectedOption === currentQ.answer ? "text-green-600" : "text-red-600"}>{selectedOption}</span></div>
                <div className="text-gray-800">正確答案: <span className="text-green-600">{currentQ.answer}</span></div>
              </div>
              <div className="p-5 rounded-xl bg-[#fdf8d5] border border-yellow-200 animate-fade-in-up">
                <p className="text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-line">
                  <span className="font-bold">詳解：</span><br/>
                  {currentQ.explanation}
                </p>
              </div>
            </>
          )}
        </main>
        {showExplanation && (
          <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white to-transparent">
            <button onClick={handleNextQuestion} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg active:scale-95 transition-transform">
              {currentIndex < quizQuestions.length - 1 ? '下一題' : '查看成績'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 8. 歷史練習紀錄頁 (HistoryRecord) - 🔥 即時讀取 Supabase 版
// ==========================================
function HistoryRecord() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('quiz');
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  // 🔥 狀態管理：同時管理 CPR 和 Quiz 歷史
  const [cprHistory, setCprHistory] = useState([]);
  const [quizHistory, setQuizHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuizLoading, setIsQuizLoading] = useState(true);

  // 🔥 同時抓取兩種雲端紀錄
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        // 抓取 CPR 紀錄
        const { data: cprData, error: cprError } = await supabase
          .from('CprRecord')
          .select('*')
          .order('created_at', { ascending: false });

        if (!cprError && cprData) {
          setCprHistory(cprData.map(item => ({
            id: item.id, date: item.date, time: item.time,
            accuracy: item.accuracy, count: item.count, bpm: item.bpm,
            errors: { armBent: item.armBent, notVertical: item.notVertical, positionOffset: item.positionOffset, notDeepEnough: item.notDeepEnough,tooDeep: item.tooDeep}
          })));
        }

        // 抓取 題庫 紀錄
        const { data: quizData, error: quizError } = await supabase
          .from('QuizRecord')
          .select('*')
          .order('created_at', { ascending: false });

        if (!quizError && quizData) {
          setQuizHistory(quizData.map(item => ({
            id: item.id, date: item.date, time: item.time,
            score: item.score, correct: item.correct, total: item.total,
            details: item.details // 剛剛整包存進去的 JSON
          })));
        }
      } catch (error) {
        console.error("獲取歷史紀錄失敗:", error);
      } finally {
        setIsLoading(false);
        setIsQuizLoading(false);
      }
    };

    fetchRecords();
  }, []);

  // 折線圖繪圖邏輯：取最新 10 筆並反轉順序 (從左至右為舊到新)
  const chartData = [...cprHistory].slice(0, 10).reverse(); 
  const xStep = chartData.length > 1 ? 100 / (chartData.length - 1) : 100;
  const pointsString = chartData.map((d, i) => `${i * xStep},${100 - d.accuracy}`).join(' ');

  if (selectedQuiz) {
    return (
      <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
        <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden">
          <header className="flex items-center p-6 pt-12 bg-white z-10">
            <button onClick={() => setSelectedQuiz(null)} className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-gray-800 active:scale-90 transition-transform">
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <h1 className="flex-1 text-center text-2xl font-medium text-orange-400 mr-12 tracking-wide">題目練習紀錄</h1>
          </header>

          <main className="flex-1 p-6 overflow-y-auto pb-10">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div className="text-gray-700 font-bold text-lg flex items-center gap-2">📅 {selectedQuiz.date}</div>
              <div className="text-gray-700 font-bold text-lg">答對:{selectedQuiz.correct}/{selectedQuiz.total}</div>
            </div>

            <div className="space-y-10">
              {selectedQuiz.details.map((item, idx) => (
                <div key={idx} className="border-2 border-gray-300 rounded-2xl p-5 bg-white shadow-sm">
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full mb-3 inline-block">第 {idx + 1} 題</span>
                  <p className="text-lg font-bold text-gray-800 mb-4 leading-relaxed">{item.question}</p>
                  
                  <div className="space-y-2 mb-4">
                    {item.options.map(opt => {
                      let textColor = "text-gray-800";
                      if (opt.key === item.correctAns) textColor = "text-green-600 font-bold";
                      else if (opt.key === item.userAns && opt.key !== item.correctAns) textColor = "text-red-500 font-bold line-through";
                      return (
                        <div key={opt.key} className={`${textColor} text-base`}>
                          ({opt.key}) {opt.text}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex justify-around mb-6 font-bold text-xl border-t pt-4">
                    <div className="text-gray-800">你的答案: <span className={item.userAns === item.correctAns ? "text-green-600" : "text-red-500"}>{item.userAns}</span></div>
                    <div className="text-gray-800">正確答案: <span className="text-green-600">{item.correctAns}</span></div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#fdf8d5] border border-yellow-100 shadow-sm">
                    <p className="text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-line">
                      <span className="font-bold">詳解：</span><br/>{item.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden">
        <header className="flex items-center p-6 pt-12 bg-white z-10">
          <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 shadow-sm active:scale-90 transition-transform">
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="flex-1 text-center text-xl font-bold text-gray-800 mr-10">歷史練習紀錄</h1>
        </header>

        <div className="flex border-b border-gray-200 bg-white">
          <button onClick={() => setActiveTab('quiz')} className={`flex-1 py-4 text-center font-bold transition-colors ${activeTab === 'quiz' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>題庫練習</button>
          <button onClick={() => setActiveTab('cpr')} className={`flex-1 py-4 text-center font-bold transition-colors ${activeTab === 'cpr' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>CPR練習</button>
        </div>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          
          {/* 🔥 來自 Supabase 的真實題庫紀錄 */}
          {activeTab === 'quiz' && (
            <div className="animate-fade-in">
              {/* 如果有紀錄，計算一下總完成率 (可以抓最新一次的題數) */}
              {quizHistory.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-gray-500 font-bold text-sm mb-1">最近一次完成狀況</h2>
                    <div className="text-sm font-bold text-gray-800">題數: {quizHistory[0].correct} / {quizHistory[0].total}</div>
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-blue-500 flex items-center justify-center">
                    <span className="font-black text-blue-600 text-xl">{quizHistory[0].score}%</span>
                  </div>
                </div>
              )}

              <h3 className="font-bold text-gray-800 mb-3 ml-1">過去測驗紀錄 (點擊查看詳細)</h3>
              <div className="space-y-3">
                {isQuizLoading ? (
                  <p className="text-center text-gray-400 text-sm py-4">資料載入中...</p>
                ) : quizHistory.length > 0 ? (
                  quizHistory.map((record) => (
                    <div key={record.id} onClick={() => setSelectedQuiz(record)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center active:scale-95 transition-transform cursor-pointer hover:border-blue-300">
                      <div>
                        <div className="font-bold text-gray-800">{record.date}</div>
                        <div className="text-sm text-gray-500">{record.time}</div>
                      </div>
                      <div className={`text-2xl font-black ${record.score >= 70 ? 'text-green-500' : 'text-orange-500'}`}>
                        {record.score} <span className="text-sm font-medium text-gray-500">分</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">目前沒有測驗紀錄，快去考一張吧！</div>
                )}
              </div>
            </div>
          )}

          {/* 🔥 來自 Supabase 的真實 CPR 紀錄列表與動態折線圖 */}
          {activeTab === 'cpr' && (
            <div className="animate-fade-in">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
                 <h4 className="text-gray-700 font-bold mb-6">最近練習分析 (準確率)</h4>
                 
                 {isLoading ? (
                   <div className="w-full h-32 flex flex-col items-center justify-center text-gray-400">
                     <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                     資料載入中...
                   </div>
                 ) : chartData.length > 0 ? (
                   <>
                     <div className="w-full relative h-32">
                       <svg viewBox="0 -10 100 120" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                         <defs>
                           <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor="#f97316" stopOpacity="0.3"/>
                             <stop offset="100%" stopColor="#f97316" stopOpacity="0.0"/>
                           </linearGradient>
                         </defs>
                         <polygon points={`0,100 ${pointsString} 100,100`} fill="url(#chartGradient)" />
                         <polyline points={pointsString} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                         {chartData.map((d, i) => (
                           <g key={d.id} className="group cursor-pointer">
                             <circle cx={i * xStep} cy={100 - d.accuracy} r="2.5" fill="#fff" stroke="#f97316" strokeWidth="1.5" />
                             <text x={i * xStep} y={100 - d.accuracy - 8} fontSize="5" fill="#4b5563" textAnchor="middle" className="font-bold opacity-0 group-hover:opacity-100 transition-opacity">{d.accuracy}%</text>
                           </g>
                         ))}
                       </svg>
                     </div>
                     <div className="flex justify-between mt-4">
                       <span className="text-[10px] text-gray-400">{chartData[0]?.date.slice(5)}</span>
                       {chartData.length > 2 && <span className="text-[10px] text-gray-400">{chartData[Math.floor(chartData.length/2)]?.date.slice(5)}</span>}
                       {chartData.length > 1 && <span className="text-[10px] text-gray-400">{chartData[chartData.length - 1]?.date.slice(5)}</span>}
                     </div>
                   </>
                 ) : (
                   <div className="w-full h-32 flex items-center justify-center text-gray-400 font-bold">
                     尚無雲端練習紀錄
                   </div>
                 )}
              </div>

              <h3 className="font-bold text-gray-800 mb-3 ml-1">練習紀錄列表 (點擊查看)</h3>
              <div className="space-y-4">
                {isLoading ? (
                  <p className="text-center text-gray-400 text-sm">請稍候...</p>
                ) : cprHistory.length > 0 ? (
                  cprHistory.map((record) => (
                    <div 
                      key={record.id} 
                      onClick={() => navigate('/report', { state: { finalBpm: record.bpm, totalPresses: record.count, errors: record.errors, date: record.date, time: record.time, accuracy: record.accuracy } })}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 active:scale-95 transition-transform"
                    >
                      <div className="text-sm font-bold text-gray-500 border-b pb-2 mb-3">{record.date} {record.time}</div>
                      <div className="flex justify-between items-center">
                        <div className="text-center">
                          <div className="text-xs text-gray-400 font-bold mb-1">準確率</div>
                          <div className="text-xl font-black text-indigo-600">{record.accuracy}%</div>
                        </div>
                        <div className="w-px h-8 bg-gray-200"></div>
                        <div className="text-center">
                          <div className="text-xs text-gray-400 font-bold mb-1">按壓次數</div>
                          <div className="text-xl font-black text-gray-800">{record.count}</div>
                        </div>
                        <div className="w-px h-8 bg-gray-200"></div>
                        <div className="text-center">
                          <div className="text-xs text-gray-400 font-bold mb-1">頻率</div>
                          <div className="text-xl font-black text-green-500">{record.bpm}<span className="text-xs text-gray-500">BPM</span></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">目前還沒有任何紀錄，快去練習一次吧！</div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ==========================================
// 總路由設定
// ==========================================
function App() {
  // 建立兩個狀態：一個存 Supabase 會員，一個存訪客標記
  const [session, setSession] = useState(null);
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem('isGuest') === 'true';
  });
  const [loading, setLoading] = useState(true); // 💡 新增一個「載入中」狀態
  
  useEffect(() => {
    // 1. 檢查目前的正式登入狀態
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false); // 檢查完畢
    });

    // 2. 監聽登入/登出事件 (例如使用者點了驗證信)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // 3. 檢查本地有沒有訪客標記
    const guestStatus = localStorage.getItem('isGuest') === 'true';
    setIsGuest(guestStatus);

    return () => subscription.unsubscribe();
  }, []);

  // 💡 關鍵：如果還在檢查狀態中，先不要做任何導向，顯示一個簡單的轉圈圈或空白
  if (loading) {
    return <div className="h-screen flex items-center justify-center">載入中...</div>;
  }

  // 判斷是否「有權限」進入 App (正式會員或訪客皆可)
  const hasAccess = session || isGuest;

  return (
    <BrowserRouter>
      <Routes>
        {/* 登入路徑不需要保護 */}
        <Route path="/login" element={<Login />} />

        {/* 
           🏠 保護路徑：
           如果 hasAccess 是 true，就顯示頁面；
           如果 false，就用 <Navigate /> 踢回登入頁。
        */}
        <Route path="/" element={hasAccess ? <Home /> : <Navigate to="/login" />} />
        <Route path="/aed" element={hasAccess ? <AEDMap /> : <Navigate to="/login" />} />
        <Route path="/practice" element={hasAccess ? <CPRPractice /> : <Navigate to="/login" />} />
        <Route path="/report" element={hasAccess ? <CPRReport /> : <Navigate to="/login" />} />
        <Route path="/quiz" element={hasAccess ? <CPRQuiz /> : <Navigate to="/login" />} />
        <Route path="/history" element={hasAccess ? <HistoryRecord /> : <Navigate to="/login" />} /> 
        <Route path="/emergency" element={hasAccess ? <EmergencyCPR /> : <Navigate to="/login" />} />
        <Route path="/emergency-camera" element={hasAccess ? <EmergencyCamera /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;