import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Home({ session, isGuest }) {
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false); 
  const [shoulderWidth, setShoulderWidth] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [isSavingForearm, setIsSavingForearm] = useState(false);

  const handleLogout = async () => {
    const ok = window.confirm('確定要登出嗎？');
    if (!ok) return;
    await supabase.auth.signOut();
    localStorage.removeItem('isGuest');
    window.location.href = "/login";
  };

  useEffect(() => {
    async function loadShoulderWidth() {
      if (isGuest) {
        const saved = localStorage.getItem('guest_shoulder_width_cm');
        if (saved) setShoulderWidth(saved);
        return;
      }
      if (!session?.user) return;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user?.user_metadata?.shoulder_width_cm) {
          setShoulderWidth(data.user.user_metadata.shoulder_width_cm);
        }
      } catch (err) {
        console.error('載入肩膀寬度失敗:', err);
      }
    }
    loadShoulderWidth();
  }, [session, isGuest]);

  const handleSaveForearmLength = async (e) => {
    e.preventDefault();
    const value = parseFloat(shoulderWidth);
    if (Number.isNaN(value) || value <= 0) {
      setSaveStatus('請輸入有效的肩膀寬度（公分）');
      return;
    }

    setIsSavingForearm(true);
    try {
      if (isGuest) {
        localStorage.setItem('guest_shoulder_width_cm', value.toString());
      } else {
        const { data, error } = await supabase.auth.updateUser({
          data: { shoulder_width_cm: value }
        });
        if (error) throw error;
      }
      setSaveStatus(isGuest ? '肩膀寬度已暫存於本機瀏覽器' : '肩膀寬度已儲存');
      setShoulderWidth(value);
    } catch (err) {
      console.error('儲存肩膀寬度失敗:', err);
      setSaveStatus('儲存失敗，請稍後再試。');
    } finally {
      setIsSavingForearm(false);
    }
  };

  const userEmail = session?.user?.email || "";

  return (
    <div className="cpr-layout">
      <div className="cpr-container">
        
        <header className="cpr-header">
          <button onClick={handleLogout} className="cpr-icon-btn-lg hover:text-rose-500 hover:bg-rose-50">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
          <button onClick={() => setShowProfileModal(true)} className="w-14 h-14 flex justify-center items-center active:scale-90 transition-transform rounded-full">
            <UserAvatar />
          </button>
        </header>

        <main className="flex-1 px-6 pt-2 relative flex flex-col justify-center z-10 pb-16">
          <div className="grid grid-cols-2 gap-x-5 gap-y-7 relative h-[530px]">
            <button onClick={() => navigate('/aed')} className="cpr-menu-btn border-[#6B908F]/20">
              <span className="text-[#6B908F] font-bold text-xl tracking-wider z-10">尋找 AED</span>
              <div className="z-10"><AedIcon /></div>
            </button>
            <button onClick={() => navigate('/practice')} className="cpr-menu-btn border-[#E09E75]/20">
              <span className="text-[#E09E75] font-bold text-xl tracking-wider z-10">CPR 練習</span>
              <div className="z-10"><CprIcon /></div>
            </button>
            <button onClick={() => navigate('/quiz')} className="cpr-menu-btn border-[#D4A373]/20">
              <div className="z-10"><QuizIcon /></div>
              <span className="text-[#D4A373] font-bold text-xl tracking-wider z-10">考照題庫</span>
            </button>
            <button onClick={() => navigate('/history')} className="cpr-menu-btn border-[#82A098]/20">
              <div className="z-10"><HistoryIcon /></div>
              <span className="text-[#82A098] font-bold text-xl tracking-wider z-10">歷史紀錄</span>
            </button>
            
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
              <button onClick={() => navigate('/emergency')} className="bg-[#A83232] w-36 h-36 rounded-full border-[8px] border-[#FAF8F5] shadow-2xl flex flex-col items-center justify-center active:scale-95 transition-transform">
                <span className="text-white text-2xl font-black tracking-widest mb-1 drop-shadow-sm">緊急CPR</span>
              </button>
            </div>
          </div>  
        </main>

        {showProfileModal && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center px-6">
            <div className="bg-white rounded-3xl w-full p-6 shadow-2xl animate-fade-in-up border border-slate-100">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-xl font-bold text-slate-800">帳號</h3>
                <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">✕</button>
              </div>
              {isGuest ? (
                <div className="text-center py-2">
                  <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-sm mb-6 border border-amber-200/50">
                    您目前以 <strong className="font-bold">訪客身分</strong> 瀏覽。<br />
                    <span className="text-xs mt-1 block text-amber-600">⚠️ 練習紀錄與題庫成績將不會儲存至雲端</span>
                  </div>
                  <form onSubmit={handleSaveForearmLength} className="space-y-3 mb-4 text-left">
                    <label className="block text-sm font-bold text-slate-700">
                      肩膀寬度 (公分)
                      <input
                        type="number"
                        min="20"
                        max="60"
                        step="0.1"
                        value={shoulderWidth}
                        onChange={(e) => setShoulderWidth(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#6B908F]/50"
                        placeholder="例如 40"
                      />
                    </label>
                    <p className="text-xs text-slate-500">訪客輸入僅暫存於本機瀏覽器，不會儲存至雲端。</p>
                    {saveStatus && <div className="text-sm text-slate-600">{saveStatus}</div>}
                    <button type="submit" disabled={isSavingForearm} className="cpr-btn-primary w-full">
                      {isSavingForearm ? '儲存中...' : '暫存肩膀寬度'}
                    </button>
                  </form>
                  <button onClick={() => { localStorage.removeItem('isGuest'); window.location.href = "/login"; }} className="cpr-btn-secondary w-full">
                    前往登入 / 註冊
                  </button>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="bg-[#FAF8F5] text-slate-700 p-4 rounded-xl mb-6 border border-slate-100 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-[#E09E75]/10 rounded-full flex items-center justify-center text-[#E09E75] font-bold text-3xl shadow-sm border border-[#E09E75]/20">
                      <UserAvatar />
                    </div>
                    <div className="flex flex-col items-center mt-2">
                      <div className="text-sm font-bold truncate w-full mb-1">{userEmail || "載入中..."}</div>
                      <span className="text-[11px] text-[#6B908F] font-bold bg-[#6B908F]/10 px-2.5 py-1 rounded-full">已登入正式會員</span>
                    </div>
                  </div>
                  <form onSubmit={handleSaveForearmLength} className="space-y-3 mb-4 text-left">
                    <label className="block text-sm font-bold text-slate-700">
                      肩膀寬度 (公分)
                      <input
                        type="number"
                        min="20"
                        max="60"
                        step="0.1"
                        value={shoulderWidth}
                        onChange={(e) => setShoulderWidth(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#6B908F]/50"
                        placeholder="例如 40"
                      />
                    </label>
                    <p className="text-xs text-slate-500">此數值將用於 CPR 深度偵測校正。</p>
                    {saveStatus && <div className="text-sm text-slate-600">{saveStatus}</div>}
                    <button type="submit" disabled={isSavingForearm} className="cpr-btn-primary w-full">
                      {isSavingForearm ? '儲存中...' : '儲存肩膀寬度'}
                    </button>
                  </form>
                  <button onClick={handleLogout} className="cpr-btn-danger w-full">登出系統</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserAvatar() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="50" fill="#EAD2AC"/>
      <circle cx="50" cy="52" r="44" fill="#EBD5B6"/>
      <path d="M50 10C27.9 10 10 27.9 10 50C10 61.1 14.5 71 21.8 78.2V55C21.8 40.6 33.5 28.9 47.9 28.9H52.1C66.5 28.9 78.2 40.6 78.2 55V78.2C85.5 71 90 61.1 90 50C90 27.9 72.1 10 50 10Z" fill="#7D6256"/>
      <circle cx="38" cy="55" r="4" fill="#2E2825"/>
      <circle cx="62" cy="55" r="4" fill="#2E2825"/>
      <path d="M42 66Q50 72 58 66" stroke="#2E2825" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="34" cy="63" r="5" fill="#E2A7A2" opacity="0.6"/>
      <circle cx="66" cy="63" r="5" fill="#E2A7A2" opacity="0.6"/>
      <path d="M21.8 78.2V90C21.8 95.5 26.3 100 31.8 100H68.2C73.7 100 78.2 95.5 78.2 90V78.2H21.8Z" fill="#E09E75"/>
      <path d="M50 78.2V100" stroke="#FAF8F5" strokeWidth="2"/>
    </svg>
  );
}

// ==========================================
// 🎨 以下為純程式碼手繪的可愛插畫元件
// ==========================================

function AedIcon() {
  return (
    <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 整個圖案向右平移約 5px 讓視覺置中 */}
      <g transform="translate(4, 0)">
        <rect x="15" y="25" width="35" height="70" rx="3" fill="#E8F1F2"/>
        <rect x="22" y="38" width="10" height="12" rx="1.5" fill="#BCE1E1"/>
        <rect x="38" y="38" width="10" height="12" rx="1.5" fill="#BCE1E1"/>
        <rect x="22" y="58" width="10" height="12" rx="1.5" fill="#BCE1E1"/>
        <rect x="38" y="58" width="10" height="12" rx="1.5" fill="#BCE1E1"/>
        <rect x="22" y="78" width="10" height="12" rx="1.5" fill="#BCE1E1"/>
        <rect x="58" y="45" width="37" height="45" rx="4" fill="#EBD6CB"/>
        <rect x="66" y="55" width="21" height="25" rx="3" fill="white"/>
        <path d="M71 67.5h11M76.5 62v11" stroke="#E09E75" strokeWidth="3" strokeLinecap="round"/>
        <path d="M72.5 35a9.5 9.5 0 1 0 0-19 9.5 9.5 0 0 0 0 19z" fill="#E09E75"/>
        <path d="M69.5 28.5l2 3 4-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}

function CprIcon() {
  return (
    <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 整個圖案向右平移 5px，向下平移 5px，解決原本偏左偏上的問題 */}
      <g transform="translate(5, 5)">
        <path d="M15 75C15 63 25 58 45 58C65 58 75 63 75 75V85H15V75Z" fill="#EAD2AC"/>
        <circle cx="15" cy="58" r="14" fill="#EAD2AC"/>
        <path d="M38 61 Q45 68 52 61" stroke="#D4A373" strokeWidth="2" fill="none"/>
        <path d="M35 15L45 55H55L65 15" fill="#82A098" opacity="0.8"/>
        <path d="M43 48C43 48 39 60 50 60C61 60 57 48 57 48H43Z" fill="#E09E75"/>
        <path d="M45 48v12M55 48v12" stroke="#D4A373" strokeWidth="1.2"/>
        <path d="M50 42v-18" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="7 5"/>
      </g>
    </svg>
  );
}

function QuizIcon() {
  return (
    <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 整個圖案向右平移 4px 讓書本與紅圈的整體視覺置中 */}
      <g transform="translate(4, 0)">
        <path d="M50 85C35 85 20 80 15 75V25C20 30 35 35 50 35C65 35 80 30 85 25V75C80 80 65 85 50 85Z" fill="#FAF6F0"/>
        <path d="M50 35V85" stroke="#D4A373" strokeWidth="3"/>
        <line x1="28" y1="48" x2="42" y2="48" stroke="#D4A373" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
        <line x1="28" y1="58" x2="42" y2="58" stroke="#D4A373" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
        <line x1="28" y1="68" x2="38" y2="68" stroke="#D4A373" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
        <line x1="62" y1="48" x2="76" y2="48" stroke="#D4A373" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
        <line x1="62" y1="58" x2="76" y2="58" stroke="#D4A373" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
        <circle cx="78" cy="22" r="14" fill="#E22C2C"/>
        <path d="M73 22h10M78 17v10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
        <path d="M28 88L18 98L13 93L23 83L28 88Z" fill="#6B908F"/>
        <path d="M23 83L38 68L43 73L28 88L23 83Z" fill="#FAF6F0" opacity="0.7"/>
      </g>
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="90" height="90" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 這個圖案原本就相對置中，稍微向下微調讓視覺重量平衡 */}
      <g transform="translate(0, 3)">
        <line x1="10" y1="70" x2="90" y2="70" stroke="white" strokeWidth="4" strokeDasharray="8 6"/>
        <circle cx="20" cy="70" r="7" fill="#6B908F"/>
        <circle cx="50" cy="70" r="7" fill="white"/>
        <circle cx="80" cy="70" r="7" fill="#EBD6CB"/>
        <rect x="35" y="80" width="30" height="20" rx="2" fill="#EAD2AC"/>
        <path d="M45 80V74H55V80" stroke="#EAD2AC" strokeWidth="2.5"/>
        <path d="M46 90h8M50 86v8" stroke="#A83232" strokeWidth="2" strokeLinecap="round"/>
        <rect x="62" y="28" width="28" height="28" rx="2.5" fill="#EBD6CB"/>
        <path d="M62 38H90" stroke="#E09E75" strokeWidth="5"/>
        <rect x="66" y="43" width="5" height="5" fill="#82A098"/>
        <rect x="73" y="43" width="5" height="5" fill="#82A098"/>
        <rect x="80" y="43" width="5" height="5" fill="#82A098"/>
        <rect x="66" y="50" width="5" height="5" fill="#82A098"/>
        <circle cx="30" cy="30" r="16" fill="#EBD6CB"/>
        <path d="M30 22V30L36 33" stroke="#82A098" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    </svg>
  );
}