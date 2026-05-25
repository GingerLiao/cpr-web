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
  html: `<div style="background-color: #ef4444; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.3);">AED</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});