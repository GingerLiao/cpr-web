// src/utils/helpers.js
import L from 'leaflet';

export const TARGET_BPM = 110; 

export function calculateAngle(a, b, c, width, height) {
  const ax = a.x * width, ay = a.y * height;
  const bx = b.x * width, by = b.y * height;
  const cx = c.x * width, cy = c.y * height;

  const radians = Math.atan2(cy - by, cx - bx) - Math.atan2(ay - by, ax - bx);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

export function calculateCenterVerticalAngle(ls, rs, lw, rw, width, height) {
  const midShoulder = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const midWrist = { x: (lw.x + rw.x) / 2, y: (lw.y + rw.y) / 2 };

  const dx = (midWrist.x - midShoulder.x) * width;
  const dy = (midWrist.y - midShoulder.y) * height;
  const angle = Math.abs(Math.atan2(dy, dx) * 180.0 / Math.PI);
  
  return { angle, midShoulder, midWrist };
}

export function calculateDistancePx(a, b, width, height) {
  const dx = (a.x - b.x) * width;
  const dy = (a.y - b.y) * height;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const userIcon = L.divIcon({
  className: 'custom-user-icon',
  html: `<div style="background-color: #3b82f6; border-radius: 50%; width: 16px; height: 16px; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.8); animation: pulse 2s infinite;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

export const aedIcon = L.divIcon({
  className: 'custom-aed-icon',
  html: `
    <div style="filter: drop-shadow(0px 6px 8px rgba(0,0,0,0.15)); display: flex; justify-content: center;">
      <svg width="40" height="50" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- 外部水滴形 (淺粉紅) -->
        <path d="M18 0C8.05887 0 0 8.05887 0 18C0 31.5 18 46 18 46C18 46 36 31.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="#FCA5A5"/>
        <!-- 內部愛心 (白色) -->
        <path d="M18 29.5C18 29.5 8.5 22 8.5 14C8.5 10.5 11.5 7.5 15 7.5C17.1 7.5 18 8.5 18 8.5C18 8.5 18.9 7.5 21 7.5C24.5 7.5 27.5 10.5 27.5 14C27.5 22 18 29.5 18 29.5Z" fill="white"/>
        <!-- 閃電 (淺粉紅) -->
        <path d="M19 11L13 18.5H17.5L16.5 24.5L23 16.5H18.5L19 11Z" fill="#FCA5A5"/>
      </svg>
    </div>
  `,
  iconSize: [30, 40],       // 設定整個圖標的大小
  iconAnchor: [20, 50],     // 將定錨點設在底部尖端處 (40的一半, 高度50)
  popupAnchor: [0, -45]     // 讓點擊後的彈出視窗出現在水滴上方
});