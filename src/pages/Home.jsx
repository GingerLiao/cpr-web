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
    <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden">
        
        <header className="flex justify-between items-center p-6 pt-12 relative z-20">
          <button className="w-12 h-12 border-2 border-gray-800 rounded-full flex flex-col justify-center items-center gap-1.5 active:scale-90 transition-transform">
            <div className="w-6 h-0.5 bg-gray-800"></div>
            <div className="w-6 h-0.5 bg-gray-800"></div>
            <div className="w-6 h-0.5 bg-gray-800"></div>
          </button>
          
          <button 
            onClick={() => setShowProfileModal(true)} 
            className="w-12 h-12 flex justify-center items-center active:scale-90 transition-transform"
          >
            <svg className="w-10 h-10 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          </button>
        </header>

        <main className="flex-1 p-6 relative flex flex-col justify-center pb-24 z-10">
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

        {showProfileModal && (
          <div className="absolute inset-0 bg-black/60 z-[999] flex items-center justify-center px-6">
            <div className="bg-white rounded-3xl w-full p-6 shadow-2xl animate-fade-in-up">
              <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="text-xl font-bold text-gray-800">帳號狀態</h3>
                <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">✕</button>
              </div>
              
              {isGuest ? (
                <div className="text-center py-2">
                  <div className="bg-yellow-50 text-yellow-700 p-4 rounded-xl text-sm mb-6 border border-yellow-200">
                    您目前以 <strong>訪客身分</strong> 瀏覽。<br/>
                    <span className="text-xs mt-1 block text-yellow-600">⚠️ 練習紀錄與題庫成績將不會儲存至雲端</span>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('isGuest');
                      window.location.href = "/login";
                    }}
                    className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-lg active:scale-95 transition-transform shadow-md"
                  >
                    前往登入 / 註冊
                  </button>
                </div>
              ) : (
                <div className="text-center py-2">
                  <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl mb-6 border border-indigo-100 flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl">
                      {userInitial}
                    </div>
                    <div className="text-sm font-bold truncate w-full">
                      {userEmail || "載入中..."}
                    </div>
                    <span className="text-xs text-indigo-500 font-bold bg-indigo-200/50 px-2 py-1 rounded-full">已登入正式會員</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-50 text-red-600 py-3.5 rounded-xl font-bold text-lg active:scale-95 transition-transform border border-red-100 flex items-center justify-center gap-2"
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