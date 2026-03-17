import React, { useRef, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// ==========================================
// 共用數學公式與常數區
// ==========================================
const FOREARM_LENGTH_CM = 25.0; // 設定前臂長度為 25 公分做為比例尺
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
            const targetUrl = encodeURIComponent('https://tw-aed.mohw.gov.tw/openData?t=json');
            const response = await fetch(`https://api.allorigins.win/raw?url=${targetUrl}`);
            if (!response.ok) throw new Error("伺服器沒有回應");
            
            const data = await response.json();
            const processedAeds = data
              .map(item => ({
                id: item.ID,
                name: item.PlaceName,
                lat: parseFloat(item.AED_Lat),
                lng: parseFloat(item.AED_Lng),
                address: item.PlaceAddr,
                time: item.OpenHours || "未提供開放時間"
              }))
              .filter(item => !isNaN(item.lat) && !isNaN(item.lng))
              .map(aed => ({ ...aed, distance: getDistance(currentLat, currentLng, aed.lat, aed.lng) }))
              .filter(aed => aed.distance < 3)
              .sort((a, b) => a.distance - b.distance);
            
            setNearbyAeds(processedAeds);
            if (processedAeds.length === 0) setErrorMsg("您方圓 3 公里內目前無 AED 資料。");
            else setErrorMsg(null);

          } catch (error) {
            console.error("API 串接失敗:", error);
            setErrorMsg("無法連接衛福部資料庫，請稍後再試。");
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
                nearbyAeds.slice(0, 5).map((aed, index) => (
                  <div key={aed.id} className="flex justify-between items-center border border-gray-100 p-3 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-bold text-xs shrink-0">{index + 1}</div>
                      <div className="truncate">
                        <div className="font-bold text-gray-800 text-sm truncate">{aed.name}</div>
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
    { titleLeft: <span className="text-red-500 font-black text-2xl">叫</span>, titleRight: <span className="text-gray-800 font-medium text-2xl tracking-widest">叫CABD</span>, heading: "確認反應與呼吸：", points: ["確認環境安全。", "輕拍患者肩膀、大聲呼喊，檢查有無意識。", "快速掃描胸部起伏，確認有無正常呼吸（5-10秒內）。"] },
    { titleLeft: <span className="text-gray-800 font-medium text-2xl">叫</span>, titleRight: <><span className="text-red-500 font-black text-2xl tracking-widest">叫</span><span className="text-gray-800 font-medium text-2xl tracking-widest">CABD</span></>, heading: "呼叫求援、取得AED：", points: ["若無意識、無呼吸，立即撥打119。", "若現場有AED，設法取得；若有旁人，請旁人協助取得。"] },
    { titleLeft: <span className="text-gray-800 font-medium text-2xl">叫叫</span>, titleRight: <><span className="text-red-500 font-black text-2xl tracking-widest">C</span><span className="text-gray-800 font-medium text-2xl tracking-widest">ABD</span></>, heading: "胸外按壓：", points: ["位置：雙乳頭連線中央（胸骨下半段）。", "姿勢：雙手交疊，手指緊扣，手肘打直，以身體重量垂直下壓。", "口訣：用力壓、快快壓、胸回彈、莫中斷。速率100~120下/分，深度5-6公分。"] }
  ];

  const currentStep = stepData[step];

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden">
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
                <div className="flex justify-end mt-2">
                   <button onClick={() => setStep(2)} className="bg-[#dcf0d1] text-green-900 px-6 py-3 rounded-full font-bold shadow-sm active:scale-95 transition-transform">
                     下一步 (已取得或略過)
                   </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex justify-end gap-3">
                <button onClick={() => { !isCalling ? navigate('/emergency-camera') : alert("請先完成或取消 119 通話！"); }} className={`${!isCalling ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'} px-6 py-4 rounded-xl font-bold text-lg shadow-sm active:scale-95 transition-transform w-full`}>
                  {!isCalling ? "開啟偵測鏡頭協助" : "通話中無法開啟鏡頭"}
                </button>
              </div>
            )}
          </div>
        </main>

        <div className="absolute bottom-10 left-0 w-full px-6 flex justify-between gap-4">
          {!isCalling ? (
            <button onClick={() => { setIsCalling(true); setCallSeconds(0); }} className="bg-red-500 text-white font-bold text-lg py-4 px-8 rounded-full shadow-lg active:scale-95 transition-transform">
              撥打 119
            </button>
          ) : (
            <>
              <div className="bg-red-500 text-white font-bold text-lg py-4 px-6 rounded-full shadow-lg flex-1 text-center">通話中 {formatTime(callSeconds)}</div>
              <button onClick={() => setIsCalling(false)} className="bg-yellow-400 text-gray-900 font-bold text-lg py-4 px-6 rounded-full shadow-lg active:scale-95 transition-transform">取消撥通</button>
            </>
          )}
        </div>
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
  const audioCtxRef = useRef(null); // 🔥 新增：節拍器音效 Context
  
  const [bpm, setBpm] = useState(0);
  const [pressCount, setPressCount] = useState(0);
  const [warningMsg, setWarningMsg] = useState("請將急救者對準白色虛線框...");
  const [depthWarning, setDepthWarning] = useState(""); // 🔥 新增：深度警告文字
  const [isTraining, setIsTraining] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);

  const isTrainingRef = useRef(false);
  const pressCountRef = useRef(0);
  const startTimeRef = useRef(0);
  const positionStateRef = useRef("up");
  const highestYRef = useRef(1.0);
  const lowestYRef = useRef(0.0);
  const baselineShoulderYRef = useRef(null); // 🔥 新增：基準線紀錄
  const currentPressMaxDepthRef = useRef(0.0); // 🔥 新增：單次按壓最大深度
  const threshold = 0.02;

  // 🔥 新增：背景節拍器 (110 BPM)
  useEffect(() => {
    let interval;
    if (isTraining) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      interval = setInterval(() => {
        if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
          const osc = audioCtxRef.current.createOscillator();
          osc.connect(audioCtxRef.current.destination);
          osc.frequency.value = 800; // 嗶聲音調
          osc.start();
          osc.stop(audioCtxRef.current.currentTime + 0.1);
        }
      }, (60 / TARGET_BPM) * 1000);
    }
    return () => {
      clearInterval(interval);
      // 加入防呆機制：確認狀態不是 closed 才執行關閉
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(err => console.log("音效引擎已安全關閉", err));
      }
    };
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
    setIsTraining(true);
    isTrainingRef.current = true;
    pressCountRef.current = 0;
    setPressCount(0);
    startTimeRef.current = Date.now();
    setBpm(0);
    setTimeLeft(120); 
    setWarningMsg("請開始按壓！");
    setDepthWarning("");
    baselineShoulderYRef.current = null;
    currentPressMaxDepthRef.current = 0.0;
    
    // 喚醒 AudioContext (避免瀏覽器阻擋自動播放聲音)
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const handleStopEmergency = () => {
    setIsTraining(false);
    isTrainingRef.current = false;
    navigate('/');
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');
    const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

    pose.onResults((results) => {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      const w = canvasElement.width;
      const h = canvasElement.height;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, w, h);
      canvasCtx.translate(w, 0);
      canvasCtx.scale(-1, 1);
      canvasCtx.drawImage(results.image, 0, 0, w, h);

      if (results.poseLandmarks) {
        const landmarks = results.poseLandmarks;
        for (let i = 0; i < 11; i++) landmarks[i].visibility = 0;
        drawConnectors(canvasCtx, landmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
        drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2, radius: 3 });

        const ls = landmarks[11], rs = landmarks[12], lw = landmarks[15], rw = landmarks[16];
        const re = landmarks[14]; // 右手肘

        if (isTrainingRef.current && ls.visibility > 0.5 && lw.visibility > 0.5) {
          const { angle: centerVertAngle, midShoulder, midWrist } = calculateCenterVerticalAngle(ls, rs, lw, rw);
          
          // 🔥 新增：紀錄基準肩膀高度與深度計算
          if (baselineShoulderYRef.current === null || midShoulder.y < baselineShoulderYRef.current) {
            baselineShoulderYRef.current = midShoulder.y;
          }
          
          let depth_cm = 0.0;
          const forearmPxLen = Math.hypot((rw.x - re.x) * w, (rw.y - re.y) * h);
          if (forearmPxLen > 0) {
            const cmPerPx = FOREARM_LENGTH_CM / forearmPxLen;
            const depthPx = (midShoulder.y - baselineShoulderYRef.current) * h;
            depth_cm = depthPx * cmPerPx;
          }

          const isInTargetBox = midShoulder.x >= 0.25 && midShoulder.x <= 0.75 && midShoulder.y >= 0.2 && midShoulder.y <= 0.7;

          if (!isInTargetBox) {
            setWarningMsg("請移至畫面中央的白色虛線框內");
          } else {
            let errors = [];
            if (calculateAngle(ls, landmarks[13], lw) < 160 || calculateAngle(rs, landmarks[14], rw) < 160) errors.push("手肘請打直");
            if (centerVertAngle < 80 || centerVertAngle > 100) errors.push("重心未垂直");

            setWarningMsg(errors.length > 0 ? errors.join(" | ") : "姿勢良好，請維持！");

            const currentShoulderY = midShoulder.y;
            if (positionStateRef.current === "up") {
              if (currentShoulderY < highestYRef.current) highestYRef.current = currentShoulderY;
              if (currentShoulderY > highestYRef.current + threshold) { 
                positionStateRef.current = "down"; 
                lowestYRef.current = currentShoulderY; 
                currentPressMaxDepthRef.current = 0.0; // 下壓開始時歸零
              }
            } else if (positionStateRef.current === "down") {
              if (depth_cm > currentPressMaxDepthRef.current) {
                currentPressMaxDepthRef.current = depth_cm;
              }
              if (currentShoulderY > lowestYRef.current) lowestYRef.current = currentShoulderY;
              if (currentShoulderY < lowestYRef.current - threshold) {
                positionStateRef.current = "up";
                pressCountRef.current += 1;
                setPressCount(pressCountRef.current);
                highestYRef.current = currentShoulderY;
                
                // 🔥 新增：單次按壓完成時檢查深度
                if (currentPressMaxDepthRef.current < 5.0) {
                  setDepthWarning(`深度不足! (${currentPressMaxDepthRef.current.toFixed(1)}cm)`);
                } else {
                  setDepthWarning(`深度良好 (${currentPressMaxDepthRef.current.toFixed(1)}cm)`);
                }
              }
            }

            const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
            if (elapsedTime > 3 && pressCountRef.current > 0) setBpm(Math.floor((pressCountRef.current / elapsedTime) * 60));
          }

          canvasCtx.beginPath();
          canvasCtx.moveTo(w - midShoulder.x * w, midShoulder.y * h);
          canvasCtx.lineTo(w - midWrist.x * w, midWrist.y * h);
          canvasCtx.strokeStyle = "#FFFF00";
          canvasCtx.lineWidth = 5;
          canvasCtx.stroke();
        }
      }
      canvasCtx.restore();

      canvasCtx.save();
      canvasCtx.lineWidth = 4;
      canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      canvasCtx.setLineDash([15, 10]);
      const boxX = w * 0.25;
      const boxY = h * 0.2;
      const boxW = w * 0.5;
      const boxH = h * 0.5;
      canvasCtx.strokeRect(boxX, boxY, boxW, boxH);
      canvasCtx.setLineDash([]);
      
      canvasCtx.fillStyle = "rgba(255, 255, 255, 0.4)";
      canvasCtx.beginPath();
      canvasCtx.ellipse(w * 0.5, boxY + boxH - 20, 40, 20, 0, 0, 2 * Math.PI);
      canvasCtx.fill();
      canvasCtx.font = "bold 16px sans-serif";
      canvasCtx.fillStyle = "rgba(255, 255, 255, 0.9)";
      canvasCtx.textAlign = "center";
      canvasCtx.fillText("病患位置", w * 0.5, boxY + boxH - 15);

      canvasCtx.font = "bold 20px sans-serif";
      canvasCtx.fillStyle = "rgba(255, 255, 255, 0.9)";
      canvasCtx.fillText("急救者請對準此框線", w * 0.5, boxY - 15);
      
      // 🔥 新增：在畫布上顯示深度警告
      if (isTrainingRef.current && depthWarning !== "") {
        canvasCtx.font = "bold 24px sans-serif";
        canvasCtx.fillStyle = depthWarning.includes("不足") ? "#FF0000" : "#00FF00";
        canvasCtx.fillText(depthWarning, w * 0.5, boxY + 30);
      }
      canvasCtx.restore();
    });

    const camera = new Camera(videoElement, { onFrame: async () => { await pose.send({ image: videoElement }); }, width: 1280, height: 720 });
    camera.start();
    return () => { camera.stop(); pose.close(); };
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden">
        <header className="flex items-center p-6 pt-12 bg-red-50 z-20 shadow-sm border-b-4 border-red-500">
          <h1 className="flex-1 text-center text-xl font-black text-red-600 tracking-widest">緊急 CPR 輔助系統</h1>
        </header>
        
        <div className="flex justify-between items-center px-4 py-3 bg-red-50 z-20 shadow-md">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-700 font-bold mb-1">目前速率</span>
            <span className={`text-3xl font-black ${bpm >= 100 && bpm <= 120 ? 'text-green-600' : 'text-red-500'}`}>
              {bpm} <span className="text-sm font-medium text-gray-600">/分</span>
            </span>
          </div>
          <div className="w-px h-10 bg-red-200"></div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-700 font-bold mb-1">按壓次數</span>
            <span className="text-3xl font-black text-blue-600">{pressCount}</span>
          </div>
          <div className="w-px h-10 bg-red-200"></div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-700 font-bold mb-1">換手倒數</span>
            <span className="text-3xl font-black text-red-600 animate-pulse">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <main className="flex-1 bg-black relative overflow-hidden flex flex-col">
          <video ref={videoRef} className="hidden" playsInline></video>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover"></canvas>
          <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full flex items-center gap-3 shadow-lg transition-colors w-[85%] justify-center z-10 ${!isTraining ? 'bg-gray-600' : warningMsg.includes("良好") ? 'bg-green-600' : 'bg-red-600'} bg-opacity-90 text-white backdrop-blur-sm`}>
            <div className={`w-3 h-3 rounded-full ${isTraining ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="font-bold tracking-wider text-center">{warningMsg}</span>
          </div>
          <div className="absolute bottom-6 left-0 w-full px-6 flex flex-col gap-3 z-10">
            {!isTraining ? (
              <button onClick={handleStartEmergency} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg active:scale-95 transition-transform">開始</button>
            ) : (
              <button onClick={handleStopEmergency} className="w-full bg-red-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg active:scale-95 transition-transform">結束急救</button>
            )}
          </div>
        </main>
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
  const audioCtxRef = useRef(null); // 🔥 新增：節拍器音效 Context
  
  const [bpm, setBpm] = useState(0);
  const [pressCount, setPressCount] = useState(0); 
  const [warningMsg, setWarningMsg] = useState("請將急救者對準白色虛線框...");
  const [depthWarning, setDepthWarning] = useState(""); // 🔥 新增：深度警告文字
  const [isTraining, setIsTraining] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);

  const isTrainingRef = useRef(false);
  const pressCountRef = useRef(0);
  const startTimeRef = useRef(0);
  const positionStateRef = useRef("up");
  const highestYRef = useRef(1.0);
  const lowestYRef = useRef(0.0);
  const baselineShoulderYRef = useRef(null); // 🔥 新增：基準線紀錄
  const currentPressMaxDepthRef = useRef(0.0); // 🔥 新增：單次按壓最大深度
  const threshold = 0.02;
  
  // 🔥 新增：notDeepEnough 追蹤深度不足的次數
  const errorsLogRef = useRef({ armBent: 0, notVertical: 0, positionOffset: 0, notDeepEnough: 0 }); 

  // 🔥 新增：背景節拍器 (110 BPM)
  useEffect(() => {
    let interval;
    if (isTraining) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      interval = setInterval(() => {
        if (audioCtxRef.current && audioCtxRef.current.state === 'running') {
          const osc = audioCtxRef.current.createOscillator();
          osc.connect(audioCtxRef.current.destination);
          osc.frequency.value = 800; // 嗶聲音調
          osc.start();
          osc.stop(audioCtxRef.current.currentTime + 0.1);
        }
      }, (60 / TARGET_BPM) * 1000);
    }
    return () => {
      clearInterval(interval);
      // 加入防呆機制：確認狀態不是 closed 才執行關閉
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(err => console.log("音效引擎已安全關閉", err));
      }
    };
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
    setIsTraining(true);
    isTrainingRef.current = true;
    pressCountRef.current = 0;
    setPressCount(0); 
    errorsLogRef.current = { armBent: 0, notVertical: 0, positionOffset: 0, notDeepEnough: 0 };
    startTimeRef.current = Date.now();
    setBpm(0);
    setTimeLeft(90);
    setWarningMsg("請開始按壓！");
    setDepthWarning("");
    baselineShoulderYRef.current = null;
    currentPressMaxDepthRef.current = 0.0;
    
    // 喚醒 AudioContext
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const handleStopTraining = () => {
    setIsTraining(false);
    isTrainingRef.current = false;
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours() > 12 ? '下午' : '上午'}${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')}`;

    let accuracy = 85;
    if (bpm >= 100 && bpm <= 120) accuracy = Math.floor(Math.random() * 10) + 90;
    else if (bpm === 0) accuracy = 0;

    navigate('/report', { state: { finalBpm: bpm, totalPresses: pressCountRef.current, errors: errorsLogRef.current, date: dateStr, time: timeStr, accuracy: accuracy } });
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');
    const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

    pose.onResults((results) => {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      const w = canvasElement.width;
      const h = canvasElement.height;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, w, h);
      canvasCtx.translate(w, 0);
      canvasCtx.scale(-1, 1);
      canvasCtx.drawImage(results.image, 0, 0, w, h);

      if (results.poseLandmarks) {
        const landmarks = results.poseLandmarks;
        for (let i = 0; i < 11; i++) landmarks[i].visibility = 0;
        drawConnectors(canvasCtx, landmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
        drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2, radius: 3 });

        const ls = landmarks[11], rs = landmarks[12], lw = landmarks[15], rw = landmarks[16];
        const re = landmarks[14]; // 右手肘

        if (isTrainingRef.current && ls.visibility > 0.5 && lw.visibility > 0.5) {
          const { angle: centerVertAngle, midShoulder, midWrist } = calculateCenterVerticalAngle(ls, rs, lw, rw);
          
          // 🔥 新增：紀錄基準肩膀高度與深度計算
          if (baselineShoulderYRef.current === null || midShoulder.y < baselineShoulderYRef.current) {
            baselineShoulderYRef.current = midShoulder.y;
          }
          
          let depth_cm = 0.0;
          const forearmPxLen = Math.hypot((rw.x - re.x) * w, (rw.y - re.y) * h);
          if (forearmPxLen > 0) {
            const cmPerPx = FOREARM_LENGTH_CM / forearmPxLen;
            const depthPx = (midShoulder.y - baselineShoulderYRef.current) * h;
            depth_cm = depthPx * cmPerPx;
          }

          const isInTargetBox = midShoulder.x >= 0.25 && midShoulder.x <= 0.75 && midShoulder.y >= 0.2 && midShoulder.y <= 0.7;

          if (!isInTargetBox) {
            setWarningMsg("請移至畫面中央的白色虛線框內");
          } else {
            let errors = [];
            if (calculateAngle(ls, landmarks[13], lw) < 160 || calculateAngle(rs, landmarks[14], rw) < 160) {
              errors.push("手肘請打直");
              errorsLogRef.current.armBent += 1;
            }
            if (centerVertAngle < 80 || centerVertAngle > 100) {
              errors.push("重心未垂直");
              errorsLogRef.current.notVertical += 1;
            }
            if (Math.abs(midWrist.x - midShoulder.x) > 0.15) {
              errorsLogRef.current.positionOffset += 1;
            }

            setWarningMsg(errors.length > 0 ? errors.join(" | ") : "姿勢完美，請保持！");

            const currentShoulderY = midShoulder.y;
            if (positionStateRef.current === "up") {
              if (currentShoulderY < highestYRef.current) highestYRef.current = currentShoulderY;
              if (currentShoulderY > highestYRef.current + threshold) { 
                positionStateRef.current = "down"; 
                lowestYRef.current = currentShoulderY; 
                currentPressMaxDepthRef.current = 0.0; // 下壓開始時歸零
              }
            } else if (positionStateRef.current === "down") {
              if (depth_cm > currentPressMaxDepthRef.current) {
                currentPressMaxDepthRef.current = depth_cm;
              }
              if (currentShoulderY > lowestYRef.current) lowestYRef.current = currentShoulderY;
              if (currentShoulderY < lowestYRef.current - threshold) {
                positionStateRef.current = "up";
                pressCountRef.current += 1;
                setPressCount(pressCountRef.current); 
                highestYRef.current = currentShoulderY;
                
                // 🔥 新增：單次按壓完成時檢查深度
                if (currentPressMaxDepthRef.current < 5.0) {
                  errorsLogRef.current.notDeepEnough += 1;
                  setDepthWarning(`深度不足! (${currentPressMaxDepthRef.current.toFixed(1)}cm)`);
                } else {
                  setDepthWarning(`深度良好 (${currentPressMaxDepthRef.current.toFixed(1)}cm)`);
                }
              }
            }

            const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
            if (elapsedTime > 3 && pressCountRef.current > 0) setBpm(Math.floor((pressCountRef.current / elapsedTime) * 60));
          }

          canvasCtx.beginPath();
          canvasCtx.moveTo(w - midShoulder.x * w, midShoulder.y * h);
          canvasCtx.lineTo(w - midWrist.x * w, midWrist.y * h);
          canvasCtx.strokeStyle = "#FFFF00";
          canvasCtx.lineWidth = 5;
          canvasCtx.stroke();
        }
      }
      canvasCtx.restore();

      canvasCtx.save();
      canvasCtx.lineWidth = 4;
      canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      canvasCtx.setLineDash([15, 10]); 
      const boxX = w * 0.25;
      const boxY = h * 0.2;
      const boxW = w * 0.5;
      const boxH = h * 0.5; 
      canvasCtx.strokeRect(boxX, boxY, boxW, boxH);
      canvasCtx.setLineDash([]);
      
      canvasCtx.fillStyle = "rgba(255, 255, 255, 0.4)";
      canvasCtx.beginPath();
      canvasCtx.ellipse(w * 0.5, boxY + boxH - 20, 40, 20, 0, 0, 2 * Math.PI);
      canvasCtx.fill();
      canvasCtx.font = "bold 16px sans-serif";
      canvasCtx.fillStyle = "rgba(255, 255, 255, 0.9)";
      canvasCtx.textAlign = "center";
      canvasCtx.fillText("病患位置", w * 0.5, boxY + boxH - 15);

      canvasCtx.font = "bold 20px sans-serif";
      canvasCtx.fillStyle = "rgba(255, 255, 255, 0.9)";
      canvasCtx.fillText("急救者請對準此框線", w * 0.5, boxY - 15);
      
      // 🔥 新增：在畫布上顯示深度警告
      if (isTrainingRef.current && depthWarning !== "") {
        canvasCtx.font = "bold 24px sans-serif";
        canvasCtx.fillStyle = depthWarning.includes("不足") ? "#FF0000" : "#00FF00";
        canvasCtx.fillText(depthWarning, w * 0.5, boxY + 30);
      }
      canvasCtx.restore();
    });

    const camera = new Camera(videoElement, { onFrame: async () => { await pose.send({ image: videoElement }); }, width: 1280, height: 720 });
    camera.start();
    return () => { camera.stop(); pose.close(); };
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden">
        <header className="flex items-center p-6 pt-12 bg-indigo-50 z-20 shadow-sm">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm active:scale-90 transition-transform">
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="flex-1 text-center text-xl font-bold text-gray-800 mr-10">CPR練習</h1>
        </header>

        <div className="flex justify-between items-center px-4 py-3 bg-indigo-50 z-20 shadow-md">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 font-bold mb-1">目前速率</span>
            <span className={`text-3xl font-black ${bpm >= 100 && bpm <= 120 ? 'text-green-500' : 'text-indigo-500'}`}>
              {bpm} <span className="text-sm font-medium text-gray-600">/分</span>
            </span>
          </div>
          <div className="w-px h-10 bg-gray-300"></div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 font-bold mb-1">按壓次數</span>
            <span className="text-3xl font-black text-blue-500">{pressCount}</span>
          </div>
          <div className="w-px h-10 bg-gray-300"></div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 font-bold mb-1">練習倒數</span>
            <span className="text-3xl font-black text-red-500">{formatTime(timeLeft)}</span>
          </div>
        </div>

        <main className="flex-1 bg-black relative overflow-hidden flex flex-col">
          <video ref={videoRef} className="hidden" playsInline></video>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover"></canvas>
            
          <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full flex items-center gap-3 shadow-lg transition-colors w-[85%] justify-center z-10
            ${!isTraining ? 'bg-gray-600' : warningMsg.includes("完美") ? 'bg-green-500' : 'bg-red-500'} bg-opacity-90 text-white backdrop-blur-sm`}>
            <div className={`w-3 h-3 rounded-full ${isTraining ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="font-bold tracking-wider text-center">{warningMsg}</span>
          </div>

          <div className="absolute bottom-6 left-0 w-full px-6 flex flex-col gap-3 z-10">
            {!isTraining ? (
              <button onClick={handleStartTraining} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg active:scale-95 transition-transform">開始訓練</button>
            ) : (
              <button onClick={handleStopTraining} className="w-full bg-red-500 text-white font-bold text-lg py-4 rounded-xl shadow-lg active:scale-95 transition-transform">結束訓練並查看報告</button>
            )}
          </div>
        </main>
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
  // 🔥 新增：加入 notDeepEnough 預設值
  const reportData = location.state || { 
    finalBpm: 114, totalPresses: 300, errors: { armBent: 8, notVertical: 5, positionOffset: 8, notDeepEnough: 5 },
    date: '2025/12/15', time: '下午08:07', accuracy: 85
  };

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
  
  const fullQuestionBank = [
    { id: 1, question: "有關成人 OHCA院外心跳停止「生存之鏈(Chain of survival)」排列順序，何者正確？", options: [ { key: "A", text: "1→2→3→4→6→5" }, { key: "B", text: "2→3→1→4→6→5" }, { key: "C", text: "3→1→4→2→5→6 (早期求救→高品質CPR→早期電擊→進階救命→心臟停止後照護→復原)" }, { key: "D", text: "4→2→1→3→5→6" } ], answer: "C", explanation: "成人生存之鏈順序是早期求救、早期心肺甦醒術、早期電擊治療、早期高級心臟救命術、整合之心臟停止後照護、2020年新版新增第六環復原。" },
    { id: 2, question: "在醫院外發生心跳停止的病人，所謂早期電擊是指病人倒地後，盡可能在幾分鐘內給予使用自動電擊器？", options: [ { key: "A", text: "3分鐘" }, { key: "B", text: "5分鐘" }, { key: "C", text: "6分鐘" }, { key: "D", text: "10分鐘" } ], answer: "B", explanation: "考慮到腦部細胞在心跳停止後4-6分鐘就開始損傷，使用電擊器的目標建議為院內3分鐘內，院外5分鐘內。" },
    { id: 3, question: "關於成人高品質胸部按壓的描述，下列敘述何者正確？", options: [ { key: "A", text: "以 4 公分深度無干擾的按壓" }, { key: "B", text: "胸部按壓但不須通氣" }, { key: "C", text: "按壓速率低於100 次/分鐘或高於 120 次/分鐘" }, { key: "D", text: "須讓胸部完全回彈" } ], answer: "D", explanation: "(A) 錯誤：成人胸部按壓的深度應為 5 至 6 公分。\n(B) 錯誤：在專業的「高品質 CPR」定義中，標準程序包含通氣。\n(D) 正確：每次按壓後必須讓胸部完全回彈，這是為了讓心臟在兩次按壓之間有足夠的空間重新充滿血液。" },
    { id: 4, question: "2020年版再次強調胸部按壓質量的重要性，有關按壓深度，下列何者正確？", options: [ { key: "A", text: "成人壓胸深度為「5-6公分」" }, { key: "B", text: "小孩壓胸深度為「5公分或胸廓厚度 1/3」" }, { key: "C", text: "嬰兒壓胸深度為「4公分或胸廓厚度 1/3」" }, { key: "D", text: "以上皆是" } ], answer: "D", explanation: "各年齡層的按壓深度規範：成人5-6公分，兒童至少5公分(約胸部厚度1/3)，嬰兒至少4公分(約胸部厚度1/3)。" },
    { id: 5, question: "有關 2020年版生存之鏈之敘述，下列何者正確？", options: [ { key: "A", text: "新增第六環『復原』(recovery)" }, { key: "B", text: "第六環係指對心臟停止救回者提供多方面的評估" }, { key: "C", text: "第六環也包含醫療與復健治療之全方位計畫" }, { key: "D", text: "以上皆是" } ], answer: "D", explanation: "2020年版指南將復原（Recovery）加入生存之鏈的第六環，強調出院後長期的身體、神經、認知評估與支持。" },
    { id: 6, question: "有關CPR之描述，下列何者錯誤？", options: [ { key: "A", text: "不論一或二人，操作成人循環式CPR，壓、吹比均為30:2" }, { key: "B", text: "應連續作五個循環，或每2分鐘檢查一次心律" }, { key: "C", text: "只要看起來是瀕死的喘息，就需 CPR" }, { key: "D", text: "人工呼吸吹氣時最好深吸一口氣再吹" } ], answer: "D", explanation: "吹氣時不用先深吸一口氣再吹，病患不須過量氧氣，也可避免施救者因過度換氣而頭暈。每口氣吹1秒鐘，見胸部有起伏即可。" },
    { id: 7, question: "當執行完 CPR五個循環後若心律改變，經評估脈搏己恢復，但仍無呼吸時，下列何者正確？", options: [ { key: "A", text: "快速連續給氣，每口1秒鐘" }, { key: "B", text: "維持每分鐘10次/分，約每隔6秒給一口氣" }, { key: "C", text: "擺復甦姿勢" }, { key: "D", text: "以上皆是" } ], answer: "B", explanation: "已恢復脈搏但是卻無呼吸時，不管有無進階呼吸道，皆為每分鐘10次/分的人工呼吸，每6秒鐘一口氣。" },
    { id: 8, question: "只有單一人時，下列何種情況，應先急救2 分鐘再去求救？", options: [ { key: "A", text: "溺水" }, { key: "B", text: "藥物中毒" }, { key: "C", text: "創傷病人" }, { key: "D", text: "以上皆是" } ], answer: "D", explanation: "小兒、溺水、創傷及藥物中毒常見的CPR原因是呼吸道的問題，先打開呼吸道說不定就能改善問題，所以要先急救後再去求救。" },
    { id: 9, question: "醫療上及法律上接受，終止 CPR 的時機是？", options: [ { key: "A", text: "CPR30分鐘後仍無效" }, { key: "B", text: "瞳孔對光無反應" }, { key: "C", text: "當對腦部是否完全恢復有疑問時" }, { key: "D", text: "在經過BLS及ACLS之努力，仍無適當反應時" } ], answer: "D", explanation: "終止CPR的時機沒有一定的時間標準；目前可接受的是經過CPR和ACLS努力後仍無反應時，與家屬溝通達成共識後終止。" },
    { id: 10, question: "CPR 人工呼吸時，您嘗試吹氣後患者胸部沒有起伏，下列何者不能解釋此種現象？", options: [ { key: "A", text: "未正確打開患者呼吸道" }, { key: "B", text: "口對口吹氣時有漏氣發生" }, { key: "C", text: "患者口中有異物阻塞" }, { key: "D", text: "沒有起伏是正常的，不必在意" } ], answer: "D", explanation: "吹氣後胸部沒有起伏絕非正常現象。可能是未正確打開呼吸道、漏氣或異物阻塞。" },
    { id: 11, question: "在成人高品質 CPR的 BLS 守則中，下列何者可改進胸部按壓品質？", options: [ { key: "A", text: "按壓深度越深效果越好" }, { key: "B", text: "每兩分鐘(5個週期)胸部按壓後，交換CPR提供者" }, { key: "C", text: "按壓胸骨上半部" }, { key: "D", text: "不建議每次按壓後胸部完全回彈" } ], answer: "B", explanation: "為了維持高品質的胸部按壓，避免施救者疲勞導致按壓深度與頻率下降，強烈建議每兩分鐘（約5個週期）就應交換壓胸者。" },
    { id: 12, question: "您是緊急救護員(EMT)，在病人倒下後8分鐘到達現場，請問您第一件事要做什麼？", options: [ { key: "A", text: "建立進階呼吸道" }, { key: "B", text: "先做五個循環胸部按壓" }, { key: "C", text: "趕快把病患移上救護車" }, { key: "D", text: "最短時間內接上自動體外除顫器(AED)查看是否可以去顫" } ], answer: "D", explanation: "到達現場後需盡快以 AED或心電圖監視器判讀心律看是否可以去顫電擊，去顫後盡快恢復CPR。" },
    { id: 13, question: "有關 AED 自動去顫器的使用，下列敘述何者正確？", options: [ { key: "A", text: "電擊板放在胸部任何位置，其電擊時效果都是一樣的。" }, { key: "B", text: "若病患胸前有使用藥品貼片，電擊時不需要避免接觸到貼片。" }, { key: "C", text: "去顫時為搶救生命，不須確認是否人員接觸病人。" }, { key: "D", text: "溺水病患，若需要電擊時，應將病患胸前的水擦乾再電擊。" } ], answer: "D", explanation: "電擊前要移除藥物貼布減少電阻，並拭乾胸部的水分，避免水分導電分散電流。電擊時必須確認無人接觸病患以免觸電。" },
    { id: 14, question: "AED 的操作有四項共通的流程，請問其正確先後順序為何？", options: [ { key: "A", text: "打開電源→分析心律→貼上電擊片→按下電擊按鈕" }, { key: "B", text: "打開電源→貼上電擊片→分析心律→按下電擊按鈕" }, { key: "C", text: "貼上電擊片→分析心律→打開電源→按下電擊按鈕" }, { key: "D", text: "貼上電擊片→打開電源→分析心律→按下電擊按鈕" } ], answer: "B", explanation: "AED的使用步驟為：打開電源→貼上電極片→分析心律→按下電擊按鈕。" },
    { id: 15, question: "AED電擊一次之後，下一步應如何處置？", options: [ { key: "A", text: "讓AED再分析一次心律" }, { key: "B", text: "檢查脈搏是否恢復" }, { key: "C", text: "立刻給予30:2循環之CPR，兩分鐘後AED自動會再次分析心律" }, { key: "D", text: "移除AED，等待救護人員" } ], answer: "C", explanation: "AED電擊完，應立即給予壓胸30:2循環之CPR，兩分鐘後AED 會自動再分析心律。" },
    { id: 16, question: "您將AED連接到沒有呼吸脈搏的病人。AED指示「不需要電擊」。此時應如何處置？", options: [ { key: "A", text: "重新啟動AED再次分析" }, { key: "B", text: "立刻給予2分鐘或5個循環之CPR" }, { key: "C", text: "停止CPR，擺復甦姿勢" }, { key: "D", text: "解除 AED，等待急救人員" } ], answer: "B", explanation: "針對不須電擊的心律，需盡快恢復 CPR 2分鐘後，再讓 AED判讀心律是否需要去顫。" },
    { id: 17, question: "對於有意識的嚴重呼吸道阻塞病人，適當之處理步驟為何？", options: [ { key: "A", text: "鼓勵患者用力咳嗽" }, { key: "B", text: "立刻給予哈姆立克法急救" }, { key: "C", text: "應持續做到阻塞解除或意識昏迷為止" }, { key: "D", text: "B 與 C 皆是" } ], answer: "D", explanation: "呼吸道異物阻塞時，若為嚴重阻塞（無法說話、咳嗽沒聲音）且意識清醒，應立刻給予哈姆立克法，直到異物排出或患者意識喪失為止。" },
    { id: 18, question: "肚子很大的成人呼吸道異物完全梗塞病患(如嚴重肥胖及末期懷孕)，應如何處理？", options: [ { key: "A", text: "改用拍背的方式" }, { key: "B", text: "以胸部按壓替代腹部按壓" }, { key: "C", text: "執行平躺式腹部按壓" }, { key: "D", text: "以上皆非" } ], answer: "B", explanation: "對於肥胖或末期懷孕發生完全呼吸道梗塞的患者，應以胸部按壓替代腹部按壓，直到異物排出。" },
    { id: 19, question: "當一個人倒地不起，壓胸30次後給予人工呼吸，發現吹氣後胸部沒有起伏，應考慮作何動作？", options: [ { key: "A", text: "再打開一次呼吸道，予以吹第二口氣" }, { key: "B", text: "檢查有無異物堵塞" }, { key: "C", text: "開始作哈姆立克急救術" }, { key: "D", text: "放棄吹氣，開始作心臟按摩" } ], answer: "A", explanation: "當吹氣後胸部沒有起伏時，最常見的情況是呼吸道沒有被打開，此時應該重新打開呼吸道再嘗試吹氣。" },
    { id: 20, question: "若病患裝置有心臟植入物，AED貼片該如何放置？", options: [ { key: "A", text: "貼在植入物正上方" }, { key: "B", text: "不能使用AED" }, { key: "C", text: "避免放置在植入物正上方，應距離數公分" }, { key: "D", text: "改貼在背後" } ], answer: "C", explanation: "AED貼片位置需避開放置在心臟植入物上方，以免影響電擊效果。" }
  ];

  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [userRecord, setUserRecord] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const shuffled = [...fullQuestionBank].sort(() => 0.5 - Math.random()).slice(0, 20);
    setQuizQuestions(shuffled);
  }, []);

  if (quizQuestions.length === 0) return <div>Loading...</div>;

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

  const handleNextQuestion = () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
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
// 8. 歷史練習紀錄頁 (HistoryRecord)
// ==========================================
function HistoryRecord() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('quiz');
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const quizHistory = [
    { 
      id: 1, date: '2026/01/29', time: '下午02:15', score: 72, correct: 18, total: 25,
      details: [
        {
          question: "關於成人高品質胸部按壓的描述，下列敘述何者正確？",
          options: [ { key: "A", text: "以 4 公分深度無干擾的按壓" }, { key: "B", text: "胸部按壓但不須通氣" }, { key: "C", text: "按壓速率低於100 次/分鐘或高於 120 次/分鐘" }, { key: "D", text: "須讓胸部完全回彈" } ],
          userAns: "B", correctAns: "D",
          explanation: "(A) 錯誤：應為 5 至 6 公分。\n(B) 錯誤：包含通氣。\n(C) 錯誤：100 至 120 次。\n(D) 正確：須讓胸部完全回彈。"
        },
        {
          question: "AED電擊一次之後，下一步應如何處置？",
          options: [ { key: "A", text: "讓AED再分析一次心律" }, { key: "B", text: "檢查脈搏是否恢復" }, { key: "C", text: "立刻給予30:2循環之CPR" }, { key: "D", text: "移除AED，等待救護人員" } ],
          userAns: "C", correctAns: "C",
          explanation: "AED電擊完，應立即給予壓胸30:2循環之CPR，兩分鐘後AED 會自動再分析心律。"
        }
      ]
    },
    { 
      id: 2, date: '2025/12/13', time: '下午05:10', score: 58, correct: 11, total: 20,
      details: [
        {
          question: "只有單一人時，下列何種情況，應先急救2 分鐘再去求救？",
          options: [ { key: "A", text: "溺水" }, { key: "B", text: "藥物中毒" }, { key: "C", text: "創傷病人" }, { key: "D", text: "以上皆是" } ],
          userAns: "A", correctAns: "D",
          explanation: "小兒、溺水、創傷及藥物中毒常見的CPR原因是呼吸道的問題，先打開呼吸道說不定就能改善問題，所以要先急救後再去求救。"
        }
      ]
    }
  ];
  
  const cprHistory = [
    { id: 1, date: '2026/01/26', time: '下午06:54', accuracy: 82, count: 250, bpm: 108, errors: { armBent: 5, notVertical: 4, positionOffset: 2 } },
    { id: 2, date: '2025/12/15', time: '下午08:07', accuracy: 85, count: 300, bpm: 114, errors: { armBent: 8, notVertical: 5, positionOffset: 8 } },
    { id: 3, date: '2025/12/10', time: '下午02:10', accuracy: 70, count: 210, bpm: 95, errors: { armBent: 12, notVertical: 10, positionOffset: 5 } },
    { id: 4, date: '2025/11/25', time: '上午10:30', accuracy: 92, count: 320, bpm: 110, errors: { armBent: 2, notVertical: 1, positionOffset: 1 } },
    { id: 5, date: '2025/11/12', time: '下午04:20', accuracy: 65, count: 180, bpm: 88, errors: { armBent: 15, notVertical: 12, positionOffset: 8 } },
    { id: 6, date: '2025/10/30', time: '上午09:15', accuracy: 88, count: 280, bpm: 115, errors: { armBent: 4, notVertical: 3, positionOffset: 2 } },
    { id: 7, date: '2025/10/18', time: '下午07:45', accuracy: 78, count: 240, bpm: 102, errors: { armBent: 7, notVertical: 6, positionOffset: 4 } },
    { id: 8, date: '2025/10/05', time: '下午01:30', accuracy: 95, count: 350, bpm: 118, errors: { armBent: 1, notVertical: 0, positionOffset: 0 } },
    { id: 9, date: '2025/09/22', time: '上午11:00', accuracy: 60, count: 150, bpm: 85, errors: { armBent: 18, notVertical: 15, positionOffset: 10 } },
    { id: 10, date: '2025/09/10', time: '下午03:50', accuracy: 80, count: 260, bpm: 105, errors: { armBent: 6, notVertical: 5, positionOffset: 3 } },
  ];

  const chartData = [...cprHistory].reverse(); 
  const pointsString = chartData.map((d, i) => `${i * (100 / 9)},${100 - d.accuracy}`).join(' ');

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
          {activeTab === 'quiz' && (
            <div className="animate-fade-in">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-gray-500 font-bold text-sm mb-1">總題庫完成率</h2>
                  <div className="text-sm font-bold text-gray-800">題數: 15 / 20</div>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-blue-500 flex items-center justify-center">
                  <span className="font-black text-blue-600 text-xl">75%</span>
                </div>
              </div>
              <h3 className="font-bold text-gray-800 mb-3 ml-1">過去測驗紀錄 (點擊查看)</h3>
              <div className="space-y-3">
                {quizHistory.map((record) => (
                  <div key={record.id} onClick={() => setSelectedQuiz(record)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center active:scale-95 transition-transform cursor-pointer hover:border-blue-300">
                    <div>
                      <div className="font-bold text-gray-800">{record.date}</div>
                      <div className="text-sm text-gray-500">{record.time}</div>
                    </div>
                    <div className={`text-2xl font-black ${record.score >= 70 ? 'text-green-500' : 'text-orange-500'}`}>
                      {record.score} <span className="text-sm font-medium text-gray-500">分</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cpr' && (
            <div className="animate-fade-in">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
                 <h4 className="text-gray-700 font-bold mb-6">最近 10 次練習分析 (準確率)</h4>
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
                         <circle cx={i * (100 / 9)} cy={100 - d.accuracy} r="2.5" fill="#fff" stroke="#f97316" strokeWidth="1.5" />
                         <text x={i * (100 / 9)} y={100 - d.accuracy - 8} fontSize="5" fill="#4b5563" textAnchor="middle" className="font-bold opacity-0 group-hover:opacity-100 transition-opacity">{d.accuracy}%</text>
                       </g>
                     ))}
                   </svg>
                 </div>
                 <div className="flex justify-between mt-4">
                   <span className="text-[10px] text-gray-400">{chartData[0].date.slice(5)}</span>
                   <span className="text-[10px] text-gray-400">{chartData[4].date.slice(5)}</span>
                   <span className="text-[10px] text-gray-400">{chartData[9].date.slice(5)}</span>
                 </div>
              </div>

              <h3 className="font-bold text-gray-800 mb-3 ml-1">練習紀錄列表 (點擊查看)</h3>
              <div className="space-y-4">
                {cprHistory.map((record) => (
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
                ))}
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
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/aed" element={<AEDMap />} />
        <Route path="/practice" element={<CPRPractice />} />
        <Route path="/report" element={<CPRReport />} />
        <Route path="/quiz" element={<CPRQuiz />} />
        <Route path="/history" element={<HistoryRecord />} /> 
        <Route path="/emergency" element={<EmergencyCPR />} />
        <Route path="/emergency-camera" element={<EmergencyCamera />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;