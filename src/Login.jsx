import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (isRegistering) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        alert("註冊失敗：" + error.message);
      } else {
        alert("註冊成功！請檢查您的 Email 信箱驗證信");
        navigate('/');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert("登入失敗：" + error.message);
      } else {
        navigate('/'); 
      }
    }
    setLoading(false);
  };

  const handleGuestLogin = () => {
    localStorage.setItem('isGuest', 'true');
    window.location.href = '/'; 
  };

  return (
    // 🔥 調整：背景改為溫暖的米白色，字體設為 font-sans
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF8F5] p-6 font-sans">
      
      {/* 🔥 調整：卡片更圓潤 (rounded-3xl)，加入淡淡的莫蘭迪陰影與淺色邊框 */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-100/50 p-10 border border-slate-100 animate-fade-in-up relative overflow-hidden">
        
        {/* 背景隱約小插圖 - 增加整體親和力 */}
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#FAF6F0]/50 rounded-full blur-xl"></div>
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-[#FAF6F0]/50 rounded-full blur-xl"></div>

        {/* 🔥 調整：標題改為專業、柔和的深灰色 (slate-800)，字體縮小至 3xl */}
        <h2 className="text-3xl font-black mb-10 text-center text-slate-800 tracking-wider relative z-10">
          {isRegistering ? '建立新帳號' : 'CPR Web 系統登入'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div>
            <label className="block text-slate-700 mb-1.5 font-semibold text-sm pl-1">Email</label>
            <input
              type="email"
              // 🔥 調整：輸入框邊框色淡化 (border-slate-200)，Focus 換成溫暖藕色 (#E09E75)
              className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E09E75] focus:border-[#E09E75] transition-all duration-200 placeholder-slate-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="您的 Email 信箱"
              required
            />
          </div>
          <div>
            <label className="block text-slate-700 mb-1.5 font-semibold text-sm pl-1">密碼</label>
            <input
              type="password"
              className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E09E75] focus:border-[#E09E75] transition-all duration-200 placeholder-slate-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            // 🔥 調整：按鈕換成溫暖藕色 (#E09E75)，圓角增加 (rounded-xl)
            className="w-full bg-[#E09E75] text-white py-3.5 rounded-xl font-bold text-lg hover:bg-[#d89163] active:scale-95 transition-all duration-200 shadow-lg shadow-[#E09E75]/30 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? '處理中...' : (isRegistering ? '立即註冊' : '登入')}
          </button>
        </form>

        {!isRegistering && (
          // 🔥 調整：訪客按鈕換成莫蘭迪霧藍色 (#6B908F)
          <button
            onClick={handleGuestLogin}
            className="w-full mt-4 bg-[#6B908F] text-white py-3.5 rounded-xl font-bold text-lg hover:bg-[#5f8180] active:scale-95 transition-all duration-200 shadow-lg shadow-[#6B908F]/20"
          >
            以訪客身分試用
          </button>
        )}

        <div className="mt-8 text-center relative z-10 border-t border-slate-100 pt-6">
          <p className="text-sm text-slate-600 font-medium">
            {isRegistering ? '已經有帳號了？' : '還沒有帳號嗎？'}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              // 🔥 調整：連結換成霧藍色 (#6B908F)
              className="ml-2 text-[#6B908F] hover:text-[#5f8180] hover:underline font-semibold transition-colors duration-150"
            >
              {isRegistering ? '點此登入' : '立即註冊'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;