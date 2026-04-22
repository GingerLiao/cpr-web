import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 引入導航 Hook
import { supabase } from './supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const navigate = useNavigate(); // 初始化導航功能

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (isRegistering) {
      // 執行註冊邏輯
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        alert("註冊失敗：" + error.message);
      } else {
        alert("註冊成功！請檢查您的 Email 信箱驗證信");
        navigate('/'); // 註冊成功後跳轉首頁
      }
    } else {
      // 執行登入邏輯
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        alert("登入失敗：" + error.message);
      } else {
        // 登入成功後跳轉首頁
        // App.jsx 會自動偵測到 session 改變並更新 hasAccess 狀態
        navigate('/'); 
      }
    }
    setLoading(false);
  };

  // 配合 App.jsx 的訪客模式邏輯
  const handleGuestLogin = () => {
    localStorage.setItem('isGuest', 'true');
    // 重新載入或跳轉以觸發 App.jsx 的狀態更新
    window.location.href = '/'; 
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">
          {isRegistering ? '建立新帳號' : 'CPR Web 系統登入'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">密碼</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
          >
            {loading ? '處理中...' : (isRegistering ? '立即註冊' : '登入')}
          </button>
        </form>

        {/* 訪客登入按鈕 - 配合您的 App.jsx isGuest 邏輯 */}
        {!isRegistering && (
          <button
            onClick={handleGuestLogin}
            className="w-full mt-3 bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600 transition duration-200"
          >
            以訪客身分試用
          </button>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isRegistering ? '已經有帳號了？' : '還沒有帳號嗎？'}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="ml-2 text-blue-600 hover:underline font-medium"
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