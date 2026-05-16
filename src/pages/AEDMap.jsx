import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { supabase } from '../supabaseClient';
import { getDistance, userIcon, aedIcon } from '../utils/helpers';

// 負責在使用者位置更新時移動地圖視角的元件
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 16);
  }, [center, map]);
  return null;
}

export default function AEDMap() {
  const navigate = useNavigate();
  const location = useLocation();
  const isFromEmergency = location.state?.fromEmergency;
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyAeds, setNearbyAeds] = useState([]);
  const [errorMsg, setErrorMsg] = useState("獲取 GPS 定位中...");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;
          setUserLocation({ lat: currentLat, lng: currentLng });
          
          setErrorMsg("搜尋附近 AED 中...");
          
          try {
            const { data, error } = await supabase
              .from('AedLocation')
              .select('*')
              .limit(15000); 
            if (error) throw error;
            
            // ============== 邏輯區完全保留 ==============
            const processedAeds = data
              .map(item => {
                const memo = item['開放使用時間備註'];
                const wdStart = item['周一至周五起'];
                const wdEnd = item['周一至周五迄'];
                let timeStr = "未提供時間";
                
                if (memo && memo !== 'EMPTY' && memo.trim() !== '') {
                  timeStr = memo; 
                } else if (wdStart && wdStart !== 'EMPTY') {
                  timeStr = `平日 ${wdStart.substring(0,5)}-${wdEnd.substring(0,5)}`;
                }
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
                  detail: detailInfo 
                };
              })
              .filter(item => !isNaN(item.lat) && !isNaN(item.lng))
              .map(aed => ({ ...aed, distance: getDistance(currentLat, currentLng, aed.lat, aed.lng) }))
              .filter(aed => aed.distance < 2)
              .sort((a, b) => a.distance - b.distance);
            // ==========================================
            
            setNearbyAeds(processedAeds);
            if (processedAeds.length === 0) setErrorMsg("半徑2公里內找不到 AED");
            else setErrorMsg(null);
          } catch (error) {
            console.error("Supabase 讀取錯誤:", error);
            setErrorMsg("無法連接資料庫");
          }
        },
        (error) => { setErrorMsg("請允許 GPS 定位權限"); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setErrorMsg("您的瀏覽器不支援定位");
    }
  }, []);

  const handleBack = () => {
    if (isFromEmergency) navigate('/emergency', { state: { step: 1 } });
    else navigate(-1);
  };

  return (
    // 套用共通背景與置中版面
    <div className="cpr-layout">
      {/* 套用手機容器版面 */}
      <div className="cpr-container">
        
        {/* 套用共通 Header */}
        <header className="cpr-header-center border-b-0 pb-4">
          <button onClick={handleBack} className="cpr-icon-btn">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="cpr-title text-[#6B908F] mr-12">尋找 AED</h1>
        </header>

        <main className="flex-1 relative flex flex-col pb-0">
          {/* 錯誤/讀取訊息 (配色改為琥珀色，比較柔和) */}
          {errorMsg && (
            <div className="bg-amber-100 text-amber-800 text-xs px-4 py-2 text-center font-bold absolute w-full z-[1000] shadow-md flex items-center justify-center gap-2">
              {errorMsg.includes("中") && <div className="w-3 h-3 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>}
              {errorMsg}
            </div>
          )}
          
          {/* 地圖區塊 (確保 flex-1 讓 Leaflet 抓得到高度) */}
          <div className="flex-1 w-full bg-slate-200 z-10 relative">
            {userLocation ? (
              <MapContainer center={[userLocation.lat, userLocation.lng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='使用 CARTO' />
                <MapUpdater center={[userLocation.lat, userLocation.lng]} />
                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}><Popup>您在這裡</Popup></Marker>
                
                {/* 附近 AED 的標記 */}
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
              <div className="w-full h-full flex items-center justify-center bg-[#FAF8F5]">
                <div className="w-10 h-10 border-4 border-[#E09E75] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          
          {/* 底部清單區塊 */}
          <div className="bg-white p-5 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-20 relative -mt-6">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4"></div>
            <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center justify-between">
              附近 AED
            </h2>
            
            <div className="space-y-3 mb-5 overflow-y-auto max-h-[30vh] pr-2">
              {nearbyAeds.length > 0 ? (
                nearbyAeds.map((aed, index) => (
                  <div key={aed.id} className="flex justify-between items-center border border-slate-100 p-3 rounded-2xl bg-white shadow-sm">
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                      <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center font-bold text-xs shrink-0">{index + 1}</div>
                      <div className="truncate">
                        <div className="font-bold text-slate-800 text-sm truncate">{aed.name}</div>
                        <div className="text-xs text-[#6B908F] font-bold mt-0.5 truncate">位置：{aed.detail}</div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">{aed.address}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {/* 距離顯示 (保留邏輯，改字體顏色) */}
                      <div className="font-black text-[#E09E75]">{aed.distance < 1 ? `${Math.round(aed.distance * 1000)}m` : `${aed.distance.toFixed(1)}km`}</div>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${aed.lat},${aed.lng}`} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-rose-50 text-slate-600 px-2 py-1 rounded mt-1 inline-block font-bold active:scale-95">Google 導航</a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 py-4 text-sm font-medium">{errorMsg ? "搜尋中..." : "找不到附近 AED"}</div>
              )}
            </div>
            
            {/* 緊急模式返回按鈕 */}
            {isFromEmergency && (
              <button onClick={handleBack} className="cpr-btn-danger animate-pulse w-full">
                取得 AED 後返回 CPR
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}