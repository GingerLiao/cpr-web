// src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

// 引入所有獨立出去的頁面
import Login from './Login';
import Home from './pages/Home';
import AEDMap from './pages/AEDMap';
import CPRPractice from './pages/CPRPractice';
import CPRReport from './pages/CPRReport';
import CPRQuiz from './pages/CPRQuiz';
import HistoryRecord from './pages/HistoryRecord';
import EmergencyCPR from './pages/EmergencyCPR';
import EmergencyCamera from './pages/EmergencyCamera';

function App() {
  const [session, setSession] = useState(null);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('isGuest') === 'true');
  const [loading, setLoading] = useState(true); 
  
  useEffect(() => {
    // 檢查目前的正式登入狀態
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false); 
    });

    // 監聽登入/登出事件
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    // 檢查本地有沒有訪客標記
    const guestStatus = localStorage.getItem('isGuest') === 'true';
    setIsGuest(guestStatus);

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="h-screen flex items-center justify-center font-sans text-gray-500">系統載入中...</div>;
  }

  // 判斷是否有權限 (有 session 或 點擊了訪客)
  const hasAccess = session || isGuest;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* 保護路徑：有權限才顯示元件，否則踢回 Login */}
        <Route path="/" element={hasAccess ? <Home session={session} isGuest={isGuest} /> : <Navigate to="/login" />} />
        <Route path="/aed" element={hasAccess ? <AEDMap /> : <Navigate to="/login" />} />
        <Route path="/practice" element={hasAccess ? <CPRPractice /> : <Navigate to="/login" />} />
        <Route path="/report" element={hasAccess ? <CPRReport /> : <Navigate to="/login" />} />
        <Route path="/quiz" element={hasAccess ? <CPRQuiz /> : <Navigate to="/login" />} />
        <Route path="/history" element={hasAccess ? <HistoryRecord /> : <Navigate to="/login" />} /> 
        <Route path="/emergency" element={hasAccess ? <EmergencyCPR /> : <Navigate to="/login" />} />
        <Route path="/emergency-camera" element={hasAccess ? <EmergencyCamera /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;