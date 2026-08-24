import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Mascot from '../components/Mascot';

export default function Home({ session, isGuest }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = async () => {
    const ok = window.confirm('確定要登出嗎？');
    if (!ok) return;
    await supabase.auth.signOut();
    localStorage.removeItem('isGuest');
    window.location.href = "/login";
  };

  useEffect(() => {
    if (location.state?.openProfile) {
      setShowProfileModal(true);
    }
  }, [location.state]);

  const userEmail = session?.user?.email || "";

  return (
    // 1. 最外層：滿版、灰色背景、並且 flex 置中
    <div className="min-h-[100dvh] w-full bg-slate-50 flex justify-center">
      
      {/* 2. APP 容器：限制最大寬度 max-w-[430px]，在電腦版會有陰影與邊框 */}
      <div className="cpr-layout bg-white relative w-full max-w-[430px] min-h-[100dvh] flex flex-col overflow-hidden sm:shadow-2xl sm:border-x sm:border-slate-200">
        
        {/* 背景波浪 */}
        <WaveBg />

        {/* 頂部 Header：內層寬度與下方選單格線一致（max-w-[340px] 置中），
            讓 logo 對齊左欄、設定按鈕對齊右欄（CPR 練習／歷史紀錄） */}
        <header className="relative z-10 px-6 pt-10 pb-12">
          <div className="w-full max-w-[340px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10">
                <HeaderLogo />
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-black text-slate-800 leading-tight">CPR Smart Assist</span>
                <span className="text-[11px] font-medium text-slate-400">智慧化 CPR 輔助系統</span>
              </div>
            </div>
            <div className="relative flex items-center">
              <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 bg-white shadow-sm border border-slate-100 rounded-full pl-1.5 pr-3 py-1.5 active:scale-95 transition-transform">
                <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-[#FCE3EC]">
                  <UserAvatar />
                </div>
                <span className="text-[12px] font-bold text-slate-600">設定<span className="ml-1 text-slate-400">▼</span></span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 relative flex flex-col z-10 justify-center items-center pb-12">
          
          <div className="relative w-full max-w-[340px] h-[440px]">
            
            {/* 愛心角色與心跳波動渲染背景 */}
            <div className="absolute -top-20 -right-6 w-44 h-44 z-30 flex items-center justify-center pointer-events-none select-none">
              {/* 底層漸層渲染光暈 */}
              <div className="absolute inset-4 bg-gradient-to-tr from-rose-200 to-pink-50 rounded-full blur-2xl opacity-80 animate-pulse" style={{ animationDuration: '3s' }}></div>
              {/* 心跳波動環 1 */}
              <div className="absolute inset-8 rounded-full border-[3px] border-pink-300/40 animate-ping" style={{ animationDuration: '2s' }}></div>
              {/* 心跳波動環 2 (時間差) */}
              <div className="absolute inset-10 rounded-full border-2 border-rose-200/30 animate-ping" style={{ animationDuration: '2.5s' }}></div>
              
              <Mascot variant="phone119" className="relative w-36 h-36 object-contain drop-shadow-2xl" />
            </div>

            {/* 四格選單 */}
            <div className="grid grid-cols-2 gap-4 h-full relative z-20 mt-[35px]">
              
              {/* 尋找 AED */}
              <button 
                onClick={() => navigate('/aed')} 
                className="group cpr-menu-btn border-[#3F74D6]/15 hover:border-[#3F74D6]/40 flex flex-col items-center justify-center gap-4 bg-white/95 backdrop-blur-sm rounded-[2rem] shadow-[0_4px_20px_rgba(63,116,214,0.06)] hover:shadow-[0_8px_25px_rgba(63,116,214,0.12)] transition-all duration-300 relative overflow-hidden"
              >
                {/* 頂部高光導角 */}
                <div className="absolute top-0 inset-x-6 h-[2px] bg-gradient-to-r from-transparent via-[#3F74D6]/30 to-transparent opacity-80" />

                <span className="text-[#3F74D6] text-[16px] font-bold tracking-wider z-10 mt-3 font-maru">
                  尋找 AED
                </span>
                <div className="z-10 mb-1 transform group-hover:-translate-y-0.5 transition-transform duration-300">
                  <AedIcon />
                </div>
              </button>

              {/* CPR 練習 */}
              <button 
                onClick={() => navigate('/practice')} 
                className="group cpr-menu-btn border-[#EC6A9C]/15 hover:border-[#EC6A9C]/40 flex flex-col items-center justify-center gap-4 bg-white/95 backdrop-blur-sm rounded-[2rem] shadow-[0_4px_20px_rgba(236,106,156,0.06)] hover:shadow-[0_8px_25px_rgba(236,106,156,0.12)] transition-all duration-300 relative overflow-hidden"
              >
                {/* 頂部高光導角 */}
                <div className="absolute top-0 inset-x-6 h-[2px] bg-gradient-to-r from-transparent via-[#EC6A9C]/30 to-transparent opacity-80" />
                
                <span className="text-[#EC6A9C] font-bold text-base tracking-wider z-10 mt-3 font-maru">
                  CPR 練習
                </span>
                <div className="z-10 mb-1 transform group-hover:-translate-y-0.5 transition-transform duration-300">
                  <CprIcon />
                </div>
              </button>

              {/* 考照題庫 */}
              <button 
                onClick={() => navigate('/quiz')} 
                className="group cpr-menu-btn border-[#8B7EE0]/15 hover:border-[#8B7EE0]/40 flex flex-col items-center justify-center gap-4 bg-white/95 backdrop-blur-sm rounded-[2rem] shadow-[0_4px_20px_rgba(139,126,224,0.06)] hover:shadow-[0_8px_25px_rgba(139,126,224,0.12)] transition-all duration-300 relative overflow-hidden"
              >
                {/* 頂部高光導角 */}
                <div className="absolute top-0 inset-x-6 h-[2px] bg-gradient-to-r from-transparent via-[#8B7EE0]/30 to-transparent opacity-80" />
            
                <div className="z-10 mt-3 transform group-hover:-translate-y-0.5 transition-transform duration-300">
                  <QuizIcon />
                </div>
                <span className="text-[#8B7EE0] font-bold text-base tracking-wider z-10 mb-1 font-maru">
                  考照題庫
                </span>
              </button>

              {/* 歷史紀錄 */}
              <button 
                onClick={() => navigate('/history')} 
                className="group cpr-menu-btn border-[#6366F1]/15 hover:border-[#6366F1]/40 flex flex-col items-center justify-center gap-4 bg-white/95 backdrop-blur-sm rounded-[2rem] shadow-[0_4px_20px_rgba(99,102,241,0.06)] hover:shadow-[0_8px_25px_rgba(99,102,241,0.12)] transition-all duration-300 relative overflow-hidden"
              >
                {/* 頂部高光導角 */}
                <div className="absolute top-0 inset-x-6 h-[2px] bg-gradient-to-r from-transparent via-[#6366F1]/30 to-transparent opacity-80" />
              
                
                <div className="z-10 mt-3 transform group-hover:-translate-y-0.5 transition-transform duration-300">
                  <HistoryIcon />
                </div>
                <span className="text-[#5257e0] font-bold text-base tracking-wider z-10 mb-1 font-maru">
                  歷史紀錄
                </span>
              </button>


              {/* 中央緊急 CPR 按鈕 */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
                <button 
                  onClick={() => navigate('/emergency')}
                  className="w-28 h-28 rounded-full border-[3px] border-white flex flex-col items-center justify-center active:scale-95 transition-all duration-150 relative group select-none"
                  style={{ 
                    background: 'linear-gradient(145deg, #FF6B78 0%, #E34A55 60%, #C93B46 100%)',
                    boxShadow: 'inset 0 -6px 8px rgba(150, 20, 30, 0.6), inset 0 4px 6px rgba(255, 255, 255, 0.5), 0 8px 25px rgba(227, 74, 85, 0.45), 0 4px 10px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {/* 文字與高光投影 */}
                  <span className="text-white text-[17px] font-black tracking-widest drop-shadow-[0_2px_3px_rgba(150,20,30,0.8)] relative z-10">
                    緊急CPR
                  </span>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Modal 區塊 */}
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
                  <button onClick={() => { localStorage.removeItem('isGuest'); window.location.href = "/login"; }} className="cpr-btn-secondary w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold">
                    前往登入 / 註冊
                  </button>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="bg-[#F7F8FC] text-slate-700 p-4 rounded-xl mb-6 border border-slate-100 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-[#8B7EE0]/10 rounded-full flex items-center justify-center text-[#8B7EE0] font-bold text-3xl shadow-sm border border-[#8B7EE0]/20">
                      <UserAvatar />
                    </div>
                    <div className="flex flex-col items-center mt-2">
                      <div className="text-sm font-bold truncate w-full mb-1">{userEmail || "載入中..."}</div>
                      <span className="text-[11px] text-[#5B8DEF] font-bold bg-[#5B8DEF]/10 px-2.5 py-1 rounded-full">已登入正式會員</span>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="cpr-btn-danger w-full py-3 bg-rose-50 text-rose-600 rounded-2xl font-bold">登出系統</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 🎨 SVG 圖示與背景
// ==========================================

function HeaderLogo() {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 85C50 85 15 60 15 35C15 20 28 10 40 10C46 10 50 15 50 15C50 15 54 10 60 10C72 10 85 20 85 35C85 60 50 85 50 85Z" fill="#E3727B"/>
      <path d="M25 45L35 45L42 25L52 65L60 45L75 45" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function UserAvatar() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="50" fill="#EAD2AC"/>
      <circle cx="50" cy="52" r="44" fill="#EBD5B6"/>
      <path d="M50 10C27.9 10 10 27.9 10 50C10 61.1 14.5 71 21.8 78.2V55C21.8 40.6 33.5 28.9 47.9 28.9H52.1C66.5 28.9 78.2 40.6 78.2 55V78.2C85.5 71 90 61.1 90 50C90 27.9 72.1 10 50 10Z" fill="#7D6256"/>
      <circle cx="38" cy="55" r="4" fill="#2E2825"/>
      <circle cx="62" cy="55" r="4" fill="#2E2825"/>
      <path d="M42 66Q50 72 58 66" stroke="#2E2825" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M21.8 78.2V90C21.8 95.5 26.3 100 31.8 100H68.2C73.7 100 78.2 95.5 78.2 90V78.2H21.8Z" fill="#8B7EE0"/>
      <path d="M50 78.2V100" stroke="#F7F8FC" strokeWidth="2"/>
    </svg>
  );
}

function AedIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 100 100" fill="none">
      <rect x="26" y="18" width="48" height="64" rx="14" fill="#E8EFFD"/>
      <path d="M54 30 L40 55 h11 l-5 17 18-26 h-11 z" fill="#3F74D6"/>
    </svg>
  );
}

function CprIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 100 100" fill="none">
      <path d="M50 80C50 80 20 62 20 40C20 29 28 23 36 23C43 23 48 28 50 33C52 28 57 23 64 23C72 23 80 29 80 40C80 62 50 80 50 80Z" fill="#FCE3EC"/>
      <path d="M28 52h12l5-13 8 24 5-11h14" stroke="#EC6A9C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function QuizIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 100 100" fill="none">
      <rect x="22" y="24" width="56" height="52" rx="12" fill="#EFEBFB"/>
      <path d="M50 30v40" stroke="#8B7EE0" strokeWidth="4"/>
      <path d="M32 42h12M32 54h12M58 42h10M58 54h10" stroke="#B8AEEC" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="72" height="72" viewBox="0 0 100 100" fill="none">
      <rect x="22" y="52" width="13" height="24" rx="4" fill="#DFE0FE"/>
      <rect x="44" y="38" width="13" height="38" rx="4" fill="#A9AEF7"/>
      <rect x="68" y="26" width="13" height="50" rx="4" fill="#6366F1"/>
    </svg>
  );
}

// 橫跨在「尋找 AED」與「CPR 練習」上方：極致羽化零邊界、柔光雲霧過渡、波度高且潤
function WaveBg() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* 右上角淡紫色波浪 */}
      <svg 
        className="absolute top-[5px] right-0 w-full h-[240px]" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="gradientWave" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#f5f1fd" stopOpacity="0" />
            <stop offset="25%" stopColor="#e9deff" stopOpacity="0.75" />
            <stop offset="55%" stopColor="#f3e8ff" stopOpacity="0.45" />
            <stop offset="80%" stopColor="#F5EDFF" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="horizontalFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000000" />
            <stop offset="10%" stopColor="#FFFFFF" />
            <stop offset="85%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
          <mask id="edgeFadeMask">
            <rect x="0" y="0" width="100" height="100" fill="url(#horizontalFade)" />
          </mask>

          <filter id="ultraSoftBlur" x="-40%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        <path 
          mask="url(#edgeFadeMask)"
          filter="url(#ultraSoftBlur)"
          d="M 20,100 C 8,82 15,78 24,82 C 33,86 40,50 50,56 C 60,62 68,22 78,30 C 88,38 92,4 100,6 L 100,100 Z" 
          fill="url(#gradientWave)" 
        />
      </svg>

      {/* 左下角淡青綠色波浪 */}
      <svg 
        className="absolute bottom-0 left-0 w-[115%] h-[240px] transform -translate-x-[5%]" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveBottom" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#ebf1fb" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M 0,100 L 0,65 C 35,73 65,48 100,75 L 100,100 Z" fill="url(#waveBottom)" />
      </svg>
    </div>
  );
}