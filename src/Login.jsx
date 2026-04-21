// src/Login.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from './supabaseClient';

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    // 如果已經登入或是訪客，直接導向首頁
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const isGuest = localStorage.getItem('isGuest') === 'true';
      if (session || isGuest) {
        navigate('/');
      }
    };
    checkUser();

    // 監聽登入成功事件，成功就跳轉首頁
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        window.location.href = "/";
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGuestLogin = () => {
    const confirmGuest = window.confirm(
      "【訪客模式提醒】\n\n若使用訪客身份進入，所有的 CPR 練習紀錄與考照題庫成績將「不會」儲存到雲端。\n\n確定要以訪客身分繼續嗎？"
    );
    
    if (confirmGuest) {
      localStorage.setItem('isGuest', 'true');
      window.location.href = "/"; 
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white min-h-screen p-8 flex flex-col justify-center shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-800 tracking-wider mb-2">CPR 訓練系統</h1>
          <p className="text-gray-500 text-sm">登入以儲存您的練習紀錄與成績</p>
        </div>
        
        <div className="mb-8">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google']}
            localization={{
              variables: {
                sign_in: {
                  email_label: '電子郵件',
                  password_label: '密碼',
                  button_label: '登入',
                  loading_button_label: '登入中...',
                },
                sign_up: {
                  email_label: '電子郵件',
                  password_label: '密碼',
                  button_label: '註冊',
                  loading_button_label: '註冊中...',
                },
              },
            }}
          />
        </div>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">或</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <button
          onClick={handleGuestLogin}
          className="w-full bg-white hover:bg-gray-50 text-gray-700 py-3 rounded-md font-bold text-base transition-colors border-2 border-gray-300 active:scale-95"
        >
          以訪客身分繼續
        </button>
      </div>
    </div>
  );
}