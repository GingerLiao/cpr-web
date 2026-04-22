import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { supabase } from '../supabaseClient';
import { getDistance, userIcon, aedIcon } from '../utils/helpers';

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
              .filter(aed => aed.distance < 3)
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