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
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert("註冊失敗: " + error.message);
      } else {
        alert("註冊成功！請檢查您的 Email 信箱進行驗證。");
        navigate('/');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert("登入失敗: " + error.message);
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
    <div className="cpr-layout items-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-100/50 p-10 border border-slate-100 animate-fade-in-up relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#FAF6F0]/50 rounded-full blur-xl"></div>
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-[#FAF6F0]/50 rounded-full blur-xl"></div>
        
        <h2 className="text-3xl font-black mb-10 text-center text-slate-800 tracking-wider relative z-10">
          {isRegistering ? '建立新帳號' : 'CPR Web 登入'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div>
            <label className="block text-slate-700 mb-1.5 font-semibold text-sm pl-1">Email</label>
            <input
              type="email"
              className="w-full px-5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E09E75] focus:border-[#E09E75] transition-all duration-200 placeholder-slate-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="輸入您的 Email"
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
              placeholder="輸入密碼"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="cpr-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? '處理中...' : (isRegistering ? '註冊' : '登入')}
          </button>
        </form>
        
        {!isRegistering && (
          <button onClick={handleGuestLogin} className="cpr-btn-secondary w-full mt-4">
            訪客登入
          </button>
        )}
        
        <div className="mt-8 text-center relative z-10 border-t border-slate-100 pt-6">
          <p className="text-sm text-slate-600 font-medium">
            {isRegistering ? '已經有帳號了？' : '還沒有帳號？'}
            <button onClick={() => setIsRegistering(!isRegistering)} className="ml-2 text-[#6B908F] hover:text-[#5f8180] hover:underline font-semibold transition-colors duration-150">
              {isRegistering ? '前往登入' : '立即註冊'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;