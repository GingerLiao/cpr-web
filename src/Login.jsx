// src/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; // 確保路徑正確

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('註冊成功！請檢查信箱驗證');
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else navigate('/'); 
    setLoading(false);
  };

  const handleGuestLogin = () => {
    localStorage.setItem('isGuest', 'true');
    window.location.href = "/"; 
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-indigo-600">CPR 衛教系統</h2>
        <input type="email" placeholder="Email" className="w-full p-3 mb-3 border rounded-xl" onChange={(e)=>setEmail(e.target.value)} />
        <input type="password" placeholder="密碼" className="w-full p-3 mb-6 border rounded-xl" onChange={(e)=>setPassword(e.target.value)} />
        <div className="flex flex-col gap-3">
          <button onClick={handleLogin} disabled={loading} className="bg-indigo-600 text-white p-3 rounded-xl font-bold active:scale-95 transition-transform">登入</button>
          <button onClick={handleSignUp} disabled={loading} className="bg-gray-200 text-gray-700 p-3 rounded-xl font-bold active:scale-95 transition-transform">註冊</button>
          <button onClick={handleGuestLogin} className="text-indigo-500 text-sm font-bold mt-2 text-center">以訪客身份進入 (不儲存資料)</button>
        </div>
      </div>
    </div>
  );
}

export default Login; // 這一行最重要，這樣 App.jsx 才能 import 它