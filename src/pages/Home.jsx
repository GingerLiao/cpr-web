import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Home({ session, isGuest }) {
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false); 

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('isGuest');
    window.location.href = "/login";
  };

  const userEmail = session?.user?.email || "";
  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : "U";

  return (
    // 背景改為 slate-50
    <div className="bg-white min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-[#F5FAFA] h-screen relative flex flex-col shadow-xl shadow-slate-200/50 overflow-hidden">
        
        {/* 頂部導航列 */}
        <header className="flex justify-between items-center p-6 pt-12 relative z-20">
          {/* 左側選單漢堡按鈕 (改為 slate-700) */}
          <button className="w-12 h-12 border border-slate-200 rounded-full flex flex-col justify-center items-center gap-1.5 active:scale-90 transition-transform bg-white shadow-sm">
            <div className="w-5 h-0.5 bg-slate-700 rounded-full"></div>
            <div className="w-5 h-0.5 bg-slate-700 rounded-full"></div>
            <div className="w-5 h-0.5 bg-slate-700 rounded-full"></div>
          </button>
          
          {/* 右側個人檔案按鈕 */}
          <button 
            onClick={() => setShowProfileModal(true)} 
            className="w-12 h-12 flex justify-center items-center active:scale-90 transition-transform bg-white border border-slate-200 rounded-full shadow-sm"
          >
            <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          </button>
        </header>

        {/* 主要功能區塊 */}
        <main className="flex-1 p-6 relative flex flex-col justify-center pb-24 z-10">
          <div className="grid grid-cols-2 gap-4 relative">
            
            <button onClick={() => navigate('/aed')} className="bg-[#BCE1E1] border border-[#BCE1E1] h-56 rounded-3xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm hover:shadow-md">
              <span className="text-xl font-bold text-black tracking-wider">尋找AED</span>
            </button>
            
            <button onClick={() => navigate('/practice')} className="bg-[#BBECCD] border border-[#BBECCD] h-56 rounded-3xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm hover:shadow-md">
              <span className="text-xl font-bold text-black tracking-wider">CPR練習</span>
            </button>
            
            <button onClick={() => navigate('/quiz')} className="bg-[#BBECCD] border border-[#BBECCD] h-56 rounded-3xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm hover:shadow-md">
              <span className="text-xl font-bold text-black tracking-wider">考照題庫</span>
            </button>
            
            <button onClick={() => navigate('/history')} className="bg-[#BCE1E1] border border-[#BCE1E1] h-56 rounded-3xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-sm hover:shadow-md">
              <span className="text-xl font-bold text-black tracking-wider">歷史紀錄</span>
            </button>

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <button onClick={() => navigate('/emergency')} className="bg-[#E22C2C] w-48 h-48 rounded-full border-[6px] border-white shadow-xl shadow-red-500/40 flex flex-col items-center justify-center active:scale-95 transition-transform">
                <span className="text-white text-3xl font-bold tracking-widest mb-2 drop-shadow-sm">緊急CPR</span>
                <span className="text-white/95 text-xs text-center leading-tight px-4 font-medium">點擊撥打119並啟動<br/>CPR指導</span>
              </button>
            </div>

          </div>  
        </main>

        {/* 個人檔案 Modal */}
        {showProfileModal && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[999] flex items-center justify-center px-6">
            <div className="bg-white rounded-3xl w-full p-6 shadow-2xl animate-fade-in-up border border-slate-100">
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-xl font-bold text-slate-800">帳號狀態</h3>
                <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors">✕</button>
              </div>
              
              {isGuest ? (
                <div className="text-center py-2">
                  <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-sm mb-6 border border-amber-200/50">
                    您目前以 <strong className="font-bold">訪客身分</strong> 瀏覽。<br/>
                    <span className="text-xs mt-1 block text-amber-600">⚠️ 練習紀錄與題庫成績將不會儲存至雲端</span>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('isGuest');
                      window.location.href = "/login";
                    }}
                    className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-teal-700 active:scale-95 transition-all shadow-md shadow-teal-600/20"
                  >
                    前往登入 / 註冊
                  </button>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="bg-teal-50 text-teal-800 p-4 rounded-xl mb-6 border border-teal-100 flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-teal-200/50 rounded-full flex items-center justify-center text-teal-700 font-bold text-2xl shadow-sm">
                      {userInitial}
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-sm font-bold truncate w-full mb-1">
                        {userEmail || "載入中..."}
                      </div>
                      <span className="text-[11px] text-teal-600 font-bold bg-teal-200/40 px-2.5 py-1 rounded-full border border-teal-200/50">
                        已登入正式會員
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full bg-rose-50 text-rose-600 hover:bg-rose-100 py-3.5 rounded-xl font-bold text-lg active:scale-95 transition-all border border-rose-100 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    登出系統
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}