import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function HistoryRecord() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'quiz');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [chartTab, setChartTab] = useState(0);
  const touchStartX = useRef(null);
  const [cprHistory, setCprHistory] = useState([]);
  const [quizHistory, setQuizHistory] = useState([]);
  const [totalBankCount, setTotalBankCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuizLoading, setIsQuizLoading] = useState(true);

  // 🌟 AI 分析功能新增：狀態管理 (改為自由輸入與類型)
  const [analysisType, setAnalysisType] = useState('times'); // 'times' (次) 或 'days' (天)
  const [analysisValue, setAnalysisValue] = useState(5); // 預設數值為 5
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');

  // 判斷是否為訪客
  const isGuest = localStorage.getItem('isGuest')=== 'true';

  useEffect(() => {
    if (isGuest) {
      setIsLoading(false);
      setIsQuizLoading(false);
      return;
    }

    const fetchRecords = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: cprData, error: cprError } = await supabase
          .from('CprRecord')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (!cprError && cprData) {
          setCprHistory(cprData.map(item => ({
            id: item.id, 
            date: item.date, 
            time: item.time,
            accuracy: item.accuracy, 
            count: item.count, 
            bpm: item.bpm,
            aiAdvice: item.ai_advice,
            errors: { 
              armBent: item.armBent, 
              notVertical: item.notVertical, 
              positionOffset: item.positionOffset,
              depthTooShallow: item.depthTooShallow,
              depthTooDeep: item.depthTooDeep
            }
          })));
        }

        const { data: quizData, error: quizError } = await supabase
          .from('QuizRecord')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (!quizError && quizData) {
          setQuizHistory(quizData.map(item => ({
            id: item.id, date: item.date, time: item.time,
            score: item.score, correct: item.correct, total: item.total,
            details: item.details
          })));
        }

        const { count: bankCount } = await supabase
          .from('QuestionBank')
          .select('*', { count: 'exact', head: true });
        setTotalBankCount(bankCount || 0);
      } catch (error) {
        console.error("獲取歷史紀錄失敗:", error);
      } finally {
        setIsLoading(false);
        setIsQuizLoading(false);
      }
    };
    fetchRecords();
  }, [isGuest]);

  const getFilteredData = (data, type, value) => {
    if (!data || data.length === 0) return [];
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) return [];
    
    if (type === 'times') {
      return data.slice(0, num);
    } else if (type === 'days') {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - num);

      return data.filter(item => {
        const itemDate = new Date(item.date.replace(/-/g, '/')); 
        return itemDate >= targetDate;
      });
    }
    return [];
  };

  const handleAnalyze = async () => {
    if (!analysisValue || parseInt(analysisValue, 10) <= 0) {
      setAiFeedback('請輸入大於 0 的有效數值喔！');
      return;
    }

    setIsAnalyzing(true);
    setAiFeedback('');
    
    try {
      const sourceData = activeTab === 'cpr' ? cprHistory : quizHistory;
      const filteredData = getFilteredData(sourceData, analysisType, analysisValue);
      
      if (filteredData.length === 0) {
        setAiFeedback(`選定的範圍內（近 ${analysisValue} ${analysisType === 'times' ? '次' : '天'}）目前沒有紀錄可以分析喔！`);
        setIsAnalyzing(false);
        return;
      }

      let prompt = `你是一位專業的 CPR 與急救指導教練。請根據以下學員在近 ${analysisValue} ${analysisType === 'times' ? '次' : '天'} 內的練習紀錄，給予100字以內的綜合評價與1到2點具體的改進建議。\n\n`;
      
      if (activeTab === 'cpr') {
        prompt += `【CPR 練習數據】\n`;
        filteredData.forEach((r, i) => {
          prompt += `${i+1}. [${r.date} ${r.time}] 準確率:${r.accuracy}%, 次數:${r.count}, 頻率:${r.bpm}BPM | 扣分動作(手臂彎曲:${r.errors.armBent}, 深度太淺:${r.errors.depthTooShallow}, 深度太深:${r.errors.depthTooDeep}, 偏移:${r.errors.positionOffset})\n`;
        });
      } else {
        prompt += `【考照題庫數據】\n`;
        filteredData.forEach((r, i) => {
          prompt += `${i+1}. [${r.date} ${r.time}] 分數:${r.score}分, 答對題數:${r.correct}/${r.total}\n`;
        });
      }

      const { data, error } = await supabase.functions.invoke('generate-cpr-advice', {
        body: { prompt: prompt, type: activeTab }
      });

      if (error) throw error;

      if (data && data.ai_reply) {
        setAiFeedback(data.ai_reply);
      } else if (data && data.advice) {
        setAiFeedback(data.advice); 
      } else {
        setAiFeedback('無法取得分析結果，請稍後再試。');
      }

    } catch (error) {
      console.error("AI 分析失敗", error);
      setAiFeedback('分析過程中發生錯誤，請檢查網路連線或稍後再試。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 渲染截圖風格的 AI 區塊
  const renderAiAnalysisSection = () => (
    <div className="bg-white rounded-[2rem] p-5 mb-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-50">
      <h3 className="font-bold text-[#E35E68] mb-4 flex items-center gap-2 text-[15px]">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        AI 學習狀態分析 <span className="text-rose-300 text-lg">✦</span>
      </h3>
      
      <div className="flex gap-2 items-center w-full">
        <span className="text-[13px] text-slate-600 font-bold whitespace-nowrap">分析近</span>
        
        {/* 自由輸入框 (修改為類似選擇框的圓角樣式) */}
        <div className="relative">
          <input 
            type="number" 
            min="1"
            value={analysisValue}
            onChange={(e) => setAnalysisValue(e.target.value)}
            className="w-14 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-sm text-slate-600 font-bold focus:outline-none focus:border-rose-300 text-center pr-4"
          />
          <svg className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
        </div>
        
        {/* 切換 次/天 下拉選單 */}
        <select 
          value={analysisType} 
          onChange={(e) => setAnalysisType(e.target.value)}
          className="flex-1 bg-white border border-slate-200 rounded-full px-3 py-1.5 text-sm text-slate-600 font-bold focus:outline-none focus:border-rose-300 appearance-none bg-no-repeat"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '0.75rem' }}
        >
          <option value="times">次紀錄</option>
          <option value="days">天內紀錄</option>
        </select>
        
        <button 
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-[#E35E68] to-[#EF858C] text-white px-4 py-2 rounded-full text-sm font-bold transition-transform shadow-md active:scale-95 disabled:opacity-50 whitespace-nowrap flex items-center gap-1 shrink-0"
        >
          <span className="text-white/80">✦</span> {isAnalyzing ? '分析中...' : '開始分析'}
        </button>
      </div>
      
      {aiFeedback && (
        <div className="mt-4 bg-[#FFF0F2] p-4 rounded-2xl border border-rose-100/50 shadow-sm animate-fade-in">
          <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
            {aiFeedback}
          </p>
        </div>
      )}
    </div>
  );

  const masteredSet = new Set();
  quizHistory.forEach(record => {
    (record.details || []).forEach(item => {
      if (item.userAns === item.correctAns) masteredSet.add(item.question);
    });
  });
  const masteredCount = masteredSet.size;
  const masteryRate = totalBankCount > 0 ? Math.round((masteredCount / totalBankCount) * 100) : 0;

  const dailyDataMap = {};
  cprHistory.forEach(record => {
    if (!dailyDataMap[record.date]) {
      dailyDataMap[record.date] = { sum: 0, count: 0 };
    }
    dailyDataMap[record.date].sum += record.accuracy;
    dailyDataMap[record.date].count += 1;
  });

  const dailyDataArray = Object.keys(dailyDataMap).map(date => ({
    date: date,
    accuracy: Math.round(dailyDataMap[date].sum / dailyDataMap[date].count)
  }));

  dailyDataArray.sort((a, b) => new Date(a.date.replace(/-/g, '/')) - new Date(b.date.replace(/-/g, '/')));
  const chartData = dailyDataArray.slice(-7);
  
  const PAD = { l: 28, r: 12, t: 22, b: 26 };
  const SVG_W = 300, SVG_H = 160;
  const cw = SVG_W - PAD.l - PAD.r;
  const ch = SVG_H - PAD.t - PAD.b;
  const cx = (i) => PAD.l + (chartData.length > 1 ? (i / (chartData.length - 1)) * cw : cw / 2);
  const cy = (acc) => PAD.t + ch * (1 - acc / 100);

  const smoothPath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i-1][0] + pts[i][0]) / 2;
      d += ` C ${cpx} ${pts[i-1][1]}, ${cpx} ${pts[i][1]}, ${pts[i][0]} ${pts[i][1]}`;
    }
    return d;
  };
  const chartPts = chartData.map((d, i) => [cx(i), cy(d.accuracy)]);
  const linePath = smoothPath(chartPts);
  const areaPath = chartPts.length > 0
    ? `${linePath} L ${chartPts[chartPts.length-1][0]} ${PAD.t + ch} L ${chartPts[0][0]} ${PAD.t + ch} Z`
    : '';

  const todayStr = (() => {
    const n = new Date();
    return `${n.getFullYear()}/${(n.getMonth()+1).toString().padStart(2,'0')}/${n.getDate().toString().padStart(2,'0')}`;
  })();
  const todayRecords = [...cprHistory].filter(r => r.date === todayStr).reverse().slice(-7);
  const todayCx = (i) => PAD.l + (todayRecords.length > 1 ? (i / (todayRecords.length - 1)) * cw : cw / 2);
  const todayPts = todayRecords.map((d, i) => [todayCx(i), cy(d.accuracy)]);
  const todayLinePath = smoothPath(todayPts);
  const todayAreaPath = todayPts.length > 0
    ? `${todayLinePath} L ${todayPts[todayPts.length-1][0]} ${PAD.t + ch} L ${todayPts[0][0]} ${PAD.t + ch} Z`
    : '';

  const to24h = (timeStr) => {
    const [period, time] = timeStr.split(' ');
    if (!time) return timeStr;
    const [h, m] = time.split(':');
    let hour = parseInt(h);
    if (period === '上午' && hour === 12) hour = 0;
    if (period === '下午' && hour !== 12) hour += 12;
    return `${hour.toString().padStart(2, '0')}:${m}`;
  };

  const handleChartTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleChartTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50 && chartTab === 0) setChartTab(1);
    if (diff < -50 && chartTab === 1) setChartTab(0);
    touchStartX.current = null;
  };

  if (selectedQuiz) {
    return (
      <div className="cpr-layout">
        <div className="cpr-container-scroll bg-[#F7F8FC]">
          <header className="flex items-center justify-between px-6 pt-10 pb-4 relative z-20">
            <button onClick={() => setSelectedQuiz(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-500 active:scale-95 transition-transform shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h1 className="text-xl font-black text-[#37324f] tracking-widest absolute left-1/2 transform -translate-x-1/2">測驗詳情</h1>
          </header>
          <main className="flex-1 p-6 overflow-y-auto pb-10">
            <div className="flex justify-between items-center mb-6 pb-2">
              <div className="text-slate-700 font-bold text-lg">{selectedQuiz.date}</div>
              <div className="text-[#8B7EE0] font-bold text-[15px] bg-white border border-slate-100 shadow-sm px-4 py-1.5 rounded-full">答對: {selectedQuiz.correct}/{selectedQuiz.total}</div>
            </div>
            <div className="space-y-6">
              {selectedQuiz.details.map((item, idx) => (
                <div key={idx} className="bg-white rounded-[1.5rem] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-50">
                  <span className="text-xs font-bold text-white bg-[#8B7EE0] px-3 py-1 rounded-full mb-3 inline-block">題目 {idx + 1}</span>
                  <p className="text-[15px] font-bold text-slate-800 mb-4 leading-relaxed">{item.question}</p>
                  
                  <div className="space-y-3 mb-5">
                    {item.options.map(opt => {
                      let textColor = "text-slate-600";
                      let bgClass = "bg-slate-50 border-transparent";
                      if (opt.key === item.correctAns) {
                        textColor = "text-teal-700 font-bold";
                        bgClass = "bg-teal-50 border-teal-200";
                      } else if (opt.key === item.userAns && opt.key !== item.correctAns) {
                        textColor = "text-rose-600 font-bold line-through";
                        bgClass = "bg-rose-50 border-rose-200";
                      }
                      return (
                        <div key={opt.key} className={`${textColor} ${bgClass} border rounded-xl px-4 py-2.5 text-sm flex gap-2`}>
                          <span className="shrink-0">({opt.key})</span> <span>{opt.text}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mb-4 font-bold text-[13px] border-t border-slate-100 pt-4">
                    <div className="text-slate-500">您的選擇: <span className={item.userAns === item.correctAns ? "text-teal-600 text-sm" : "text-rose-500 text-sm"}>{item.userAns}</span></div>
                    <div className="text-slate-500">正確答案: <span className="text-teal-600 text-sm">{item.correctAns}</span></div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F4F7FF] border border-[#5B8DEF]/20 shadow-sm">
                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                      <span className="font-bold text-[#5B8DEF]">💡 解析：</span><br/>{item.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="cpr-layout">
      <div className="cpr-container-scroll bg-[#F7F8FC]">
        
        {/* 頂部標題與愛心角色 */}
        <header className="flex items-center justify-between px-6 pt-10 pb-4 relative z-20">
          <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all shrink-0 z-40">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="text-xl font-black text-[#2F2659] tracking-widest absolute left-1/2 transform -translate-x-1/2 z-40">歷史紀錄</h1>
          
          {/* 右上角愛心角色 */}
          <div className="absolute right-0 top-0 w-25 h-32 pointer-events-none z-50">
            <img src="/mascot/hello.png" alt="Mascot" className="w-full h-full object-contain drop-shadow-md" />
            <span className="absolute top-8 right-3 text-purple-300 text-xl font-black opacity-80">✦</span>
          </div>
        </header>

        {isGuest ? (
          <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24 relative z-40">
            <div className="bg-white p-8 rounded-3xl shadow-[0_2px_15px_rgba(0,0,0,0.05)] border border-slate-50 flex flex-col items-center text-center w-full max-w-sm">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-4 shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">訪客模式</h2>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                您目前以訪客身分瀏覽。<br/>如需儲存並查看歷史測驗與練習紀錄，請先登入帳號。
              </p>
              <button 
                onClick={() => {
                  localStorage.removeItem('isGuest');
                  window.location.href = '/login';
                }} 
                className="w-full bg-gradient-to-r from-[#8B7EE0] to-[#6F61C9] text-white font-bold py-3.5 rounded-full shadow-md active:scale-95 transition-transform"
              >
                前往登入
              </button>
            </div>
          </main>
        ) : (
          <>
            {/* 雙頁籤按鈕 */}
            <div className="px-6 pb-2 relative z-40">
              <div className="flex bg-white p-[6px] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-100">
                <button 
                  onClick={() => { setActiveTab('quiz'); setAiFeedback(''); }} 
                  className={`flex-1 py-3 text-[15px] font-bold rounded-full transition-all duration-300 ${
                    activeTab === 'quiz' 
                      ? 'bg-gradient-to-b from-[#8B7EE0] to-[#6F61C9] text-white shadow-[inset_0px_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(113,99,204,0.4)]' 
                      : 'text-slate-400 hover:text-slate-600 bg-transparent'
                  }`}
                >
                  考照題庫
                </button>
                <button 
                  onClick={() => { setActiveTab('cpr'); setAiFeedback(''); }} 
                  className={`flex-1 py-3 text-[15px] font-bold rounded-full transition-all duration-300 ${
                    activeTab === 'cpr' 
                      ? 'bg-gradient-to-b from-[#8B7EE0] to-[#6F61C9] text-white shadow-[inset_0px_2px_4px_rgba(255,255,255,0.4),0_4px_8px_rgba(113,99,204,0.4)]' 
                      : 'text-slate-400 hover:text-slate-600 bg-transparent'
                  }`}
                >
                  CPR 練習
                </button>
              </div>
            </div>

            <main className="flex-1 overflow-y-auto p-6 pt-2 pb-24 relative z-10">
              {activeTab === 'quiz' && (
                <div className="animate-fade-in">
                  
                  {/* AI 分析區塊 */}
                  {renderAiAnalysisSection()}

                  {/* 題庫掌握度 */}
                  {totalBankCount > 0 && (
                    <div className="relative overflow-hidden rounded-[1.5rem] p-5 mb-4 shadow-sm border border-slate-50/50 flex items-center justify-between bg-gradient-to-r from-[#FFF0F4] via-[#F3EBF5] to-[#FAF8FC]">
                      
                      {/* 右側純白底色區塊 (帶左側半圓弧度，完美切分背景) */}
                      <div className="absolute right-0 top-0 h-full w-[110px] bg-white rounded-l-[60px] z-0 shadow-[-2px_0_10px_rgba(0,0,0,0.02)]"></div>

                      {/* 左側文字與進度條 */}
                      <div className="flex-1 pr-6 z-10">
                        <h2 className="text-[#37324f] font-bold text-[13px] mb-1">題庫掌握度</h2>
                        <div className="text-[15px] font-bold text-[#37324f] mb-3 tracking-wide">
                          已答對 <span className="text-[#D56574] mx-0.5">{masteredCount}</span> / {totalBankCount} 題
                        </div>
                        
                        {/* 底部線性進度條 */}
                        <div className="w-full bg-[#F5DDE1]/60 h-[7px] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#D56574] rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${masteryRate}%` }}
                          />
                        </div>
                      </div>

                      {/* 右側 SVG 圓環進度指示器 */}
                      <div className="relative z-10 w-[72px] h-[72px] flex items-center justify-center shrink-0 pr-1">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          {/* 底部淺色外環 */}
                          <path
                            className="text-[#F5DDE1]"
                            strokeWidth="2"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          {/* 數值填滿環 (利用 strokeDasharray 控制進度) */}
                          <path
                            className="text-[#D56574]"
                            strokeWidth="2.5"
                            strokeDasharray={`${masteryRate}, 100`}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        {/* 中央文字 */}
                        <div className="absolute inset-0 flex items-center justify-center pr-1">
                          <span className="text-[#D56574] text-[22px] font-black">
                            {masteryRate}<span className="text-[13px] ml-[1px]">%</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 圖表區塊 (每日平均趨勢 - Quiz頁也共用顯示) */}
                  <div className="bg-white rounded-[2rem] p-6 mb-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-slate-700 font-bold text-[15px] flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#8B7EE0]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>
                        每日平均趨勢
                      </h4>
                      <div className="flex bg-white border border-slate-100 rounded-full p-1 shadow-sm">
                        {['趨勢', '今日'].map((label, idx) => (
                          <button
                            key={idx}
                            onClick={() => setChartTab(idx)}
                            className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${chartTab === idx ? 'bg-[#8B7EE0] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-hidden" onTouchStart={handleChartTouchStart} onTouchEnd={handleChartTouchEnd}>
                      <div className="flex transition-transform duration-300" style={{ transform: `translateX(-${chartTab * 100}%)` }}>
                        <div className="shrink-0 w-full">
                          {isLoading ? (
                            <div className="w-full h-40 flex items-center justify-center">
                              <div className="w-8 h-8 border-4 border-[#8B7EE0] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : chartData.length > 0 ? (
                            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                              <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#8B7EE0" stopOpacity="0.25"/>
                                  <stop offset="100%" stopColor="#8B7EE0" stopOpacity="0"/>
                                </linearGradient>
                              </defs>
                              {[0, 25, 50, 75, 100].map(v => (
                                <g key={v}>
                                  <line x1={PAD.l} y1={cy(v)} x2={PAD.l + cw} y2={cy(v)} stroke="#f1f5f9" strokeWidth="1" />
                                  <text x={PAD.l - 6} y={cy(v) + 3.5} fontSize="9" fill="#94a3b8" textAnchor="end" fontWeight="600">{v}</text>
                                </g>
                              ))}
                              <path d={areaPath} fill="url(#chartGradient)" />
                              <path d={linePath} fill="none" stroke="#8B7EE0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              {chartData.map((d, i) => (
                                <g key={d.date}>
                                  <circle cx={cx(i)} cy={cy(d.accuracy)} r="4" fill="#fff" stroke="#8B7EE0" strokeWidth="2.5" />
                                  <text x={cx(i)} y={cy(d.accuracy) - 8} fontSize="9" fill="#8B7EE0" textAnchor="middle" fontWeight="bold">{d.accuracy}%</text>
                                  <text x={cx(i)} y={SVG_H - 4} fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="600">{d.date.slice(5)}</text>
                                </g>
                              ))}
                            </svg>
                          ) : (
                            <div className="w-full h-40 flex items-center justify-center text-slate-400 font-medium text-sm">尚無練習數據</div>
                          )}
                        </div>
                        <div className="shrink-0 w-full">
                          {isLoading ? (
                            <div className="w-full h-40 flex items-center justify-center">
                              <div className="w-8 h-8 border-4 border-[#8B7EE0] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : todayRecords.length > 0 ? (
                            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                              <defs>
                                <linearGradient id="todayGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#5B8DEF" stopOpacity="0.25"/>
                                  <stop offset="100%" stopColor="#5B8DEF" stopOpacity="0"/>
                                </linearGradient>
                              </defs>
                              {[0, 25, 50, 75, 100].map(v => (
                                <g key={v}>
                                  <line x1={PAD.l} y1={cy(v)} x2={PAD.l + cw} y2={cy(v)} stroke="#f1f5f9" strokeWidth="1" />
                                  <text x={PAD.l - 6} y={cy(v) + 3.5} fontSize="9" fill="#94a3b8" textAnchor="end" fontWeight="600">{v}</text>
                                </g>
                              ))}
                              <path d={todayAreaPath} fill="url(#todayGradient)" />
                              <path d={todayLinePath} fill="none" stroke="#5B8DEF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              {todayRecords.map((d, i) => (
                                <g key={i}>
                                  <circle cx={todayCx(i)} cy={cy(d.accuracy)} r="4" fill="#fff" stroke="#5B8DEF" strokeWidth="2.5" />
                                  <text x={todayCx(i)} y={cy(d.accuracy) - 8} fontSize="9" fill="#5B8DEF" textAnchor="middle" fontWeight="bold">{d.accuracy}%</text>
                                  <text x={todayCx(i)} y={SVG_H - 4} fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="600">{to24h(d.time)}</text>
                                </g>
                              ))}
                            </svg>
                          ) : (
                            <div className="w-full h-40 flex items-center justify-center text-slate-400 font-medium text-sm">今日尚無練習紀錄</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center gap-2 mt-4">
                      {[0, 1].map(idx => (
                        <button key={idx} onClick={() => setChartTab(idx)}
                          className={`rounded-full transition-all ${chartTab === idx ? 'w-5 h-2 bg-[#8B7EE0]' : 'w-2 h-2 bg-slate-200'}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 測驗紀錄清單 */}
                  <h3 className="font-bold text-slate-500 mb-4 flex items-center gap-2 text-sm ml-1">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    所有測驗紀錄
                  </h3>
                  <div className="space-y-3">
                    {isQuizLoading ? (
                      <p className="text-center text-slate-400 text-sm py-4">載入中...</p>
                    ) : quizHistory.length > 0 ? (
                      quizHistory.map((record) => (
                        <div 
                          key={record.id} 
                          onClick={() => setSelectedQuiz(record)} 
                          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-50 flex justify-between items-center active:scale-95 transition-transform cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#F4F5FF] text-[#8B7EE0] rounded-full flex items-center justify-center shrink-0">
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"></path></svg>
                            </div>
                            <div>
                              <div className="font-bold text-slate-700 text-[15px]">{record.date}</div>
                              <div className="text-xs text-slate-400 font-medium mt-1">{record.time}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`text-[22px] font-black ${record.score >= 80 ? 'text-[#8B7EE0]' : 'text-[#D56574]'}`}>
                              {record.score} <span className="text-[13px] font-bold">分</span>
                            </div>
                            <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-slate-400 py-8 text-sm font-medium">尚無測驗紀錄</div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'cpr' && (
                <div className="animate-fade-in">
                  
                  {/* AI 分析區塊 */}
                  {renderAiAnalysisSection()}

                  {/*  圖表區塊 (與 Quiz 共用的設計) */}
                  <div className="bg-white rounded-[2rem] p-6 mb-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-50">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-slate-700 font-bold text-[15px] flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#8B7EE0]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>
                        每日平均趨勢
                      </h4>
                      <div className="flex bg-white border border-slate-100 rounded-full p-1 shadow-sm">
                        {['趨勢', '今日'].map((label, idx) => (
                          <button
                            key={idx}
                            onClick={() => setChartTab(idx)}
                            className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${chartTab === idx ? 'bg-[#8B7EE0] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-hidden" onTouchStart={handleChartTouchStart} onTouchEnd={handleChartTouchEnd}>
                      <div className="flex transition-transform duration-300" style={{ transform: `translateX(-${chartTab * 100}%)` }}>
                        <div className="shrink-0 w-full">
                          {isLoading ? (
                            <div className="w-full h-40 flex items-center justify-center">
                              <div className="w-8 h-8 border-4 border-[#8B7EE0] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : chartData.length > 0 ? (
                            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                              <defs>
                                <linearGradient id="chartGradient2" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#8B7EE0" stopOpacity="0.25"/>
                                  <stop offset="100%" stopColor="#8B7EE0" stopOpacity="0"/>
                                </linearGradient>
                              </defs>
                              {[0, 25, 50, 75, 100].map(v => (
                                <g key={v}>
                                  <line x1={PAD.l} y1={cy(v)} x2={PAD.l + cw} y2={cy(v)} stroke="#f1f5f9" strokeWidth="1" />
                                  <text x={PAD.l - 6} y={cy(v) + 3.5} fontSize="9" fill="#94a3b8" textAnchor="end" fontWeight="600">{v}</text>
                                </g>
                              ))}
                              <path d={areaPath} fill="url(#chartGradient2)" />
                              <path d={linePath} fill="none" stroke="#8B7EE0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              {chartData.map((d, i) => (
                                <g key={d.date}>
                                  <circle cx={cx(i)} cy={cy(d.accuracy)} r="4" fill="#fff" stroke="#8B7EE0" strokeWidth="2.5" />
                                  <text x={cx(i)} y={cy(d.accuracy) - 8} fontSize="9" fill="#8B7EE0" textAnchor="middle" fontWeight="bold">{d.accuracy}%</text>
                                  <text x={cx(i)} y={SVG_H - 4} fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="600">{d.date.slice(5)}</text>
                                </g>
                              ))}
                            </svg>
                          ) : (
                            <div className="w-full h-40 flex items-center justify-center text-slate-400 font-medium text-sm">尚無練習數據</div>
                          )}
                        </div>
                        <div className="shrink-0 w-full">
                          {isLoading ? (
                            <div className="w-full h-40 flex items-center justify-center">
                              <div className="w-8 h-8 border-4 border-[#8B7EE0] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : todayRecords.length > 0 ? (
                            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                              <defs>
                                <linearGradient id="todayGradient2" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#5B8DEF" stopOpacity="0.25"/>
                                  <stop offset="100%" stopColor="#5B8DEF" stopOpacity="0"/>
                                </linearGradient>
                              </defs>
                              {[0, 25, 50, 75, 100].map(v => (
                                <g key={v}>
                                  <line x1={PAD.l} y1={cy(v)} x2={PAD.l + cw} y2={cy(v)} stroke="#f1f5f9" strokeWidth="1" />
                                  <text x={PAD.l - 6} y={cy(v) + 3.5} fontSize="9" fill="#94a3b8" textAnchor="end" fontWeight="600">{v}</text>
                                </g>
                              ))}
                              <path d={todayAreaPath} fill="url(#todayGradient2)" />
                              <path d={todayLinePath} fill="none" stroke="#5B8DEF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              {todayRecords.map((d, i) => (
                                <g key={i}>
                                  <circle cx={todayCx(i)} cy={cy(d.accuracy)} r="4" fill="#fff" stroke="#5B8DEF" strokeWidth="2.5" />
                                  <text x={todayCx(i)} y={cy(d.accuracy) - 8} fontSize="9" fill="#5B8DEF" textAnchor="middle" fontWeight="bold">{d.accuracy}%</text>
                                  <text x={todayCx(i)} y={SVG_H - 4} fontSize="9" fill="#94a3b8" textAnchor="middle" fontWeight="600">{to24h(d.time)}</text>
                                </g>
                              ))}
                            </svg>
                          ) : (
                            <div className="w-full h-40 flex items-center justify-center text-slate-400 font-medium text-sm">今日尚無練習紀錄</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center gap-2 mt-4">
                      {[0, 1].map(idx => (
                        <button key={idx} onClick={() => setChartTab(idx)}
                          className={`rounded-full transition-all ${chartTab === idx ? 'w-5 h-2 bg-[#8B7EE0]' : 'w-2 h-2 bg-slate-200'}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 實作紀錄清單  */}
                  <h3 className="font-bold text-slate-500 mb-4 flex items-center gap-2 text-sm ml-1">
                    <svg className="w-5 h-5 text-[#8B7EE0]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                    實作紀錄清單
                  </h3>
                  <div className="space-y-2">
                    {isLoading ? (
                      <p className="text-center text-slate-400 text-sm py-4">載入中...</p>
                    ) : cprHistory.length > 0 ? (
                      cprHistory.map((record) => (
                        <div 
                          key={record.id} 
                          onClick={() => navigate('/report', { state: { id: record.id, aiAdvice: record.aiAdvice, finalBpm: record.bpm, totalPresses: record.count, errors: record.errors, date: record.date, time: record.time, accuracy: record.accuracy } })}
                          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-50 cursor-pointer hover:border-[#8B7EE0]/30 active:scale-95 transition-transform"
                        >
                          {/* 卡片頂部時間列 */}
                          <div className="text-xs font-bold text-slate-500 border-b border-slate-100 pb-2 mb-3 flex justify-between items-center">
                            <span className="tracking-wide">{record.date}</span>
                            <span>{record.time}</span>
                          </div>
                          
                          {/* 卡片數據區 */}
                          <div className="flex justify-between items-center">
                            <div className="text-center flex-1">
                              <div className="text-[12px] text-slate-400 font-bold mb-1">準確率</div>
                              <div className="text-lg font-black text-[#E35E68]">
                                {record.accuracy}<span className="text-[10px] ml-[1px]">%</span>
                              </div>
                            </div>
                            
                            <div className="w-px h-8 bg-slate-100"></div>
                            
                            <div className="text-center flex-1">
                              <div className="text-[12px] text-slate-400 font-bold mb-1">按壓次數</div>
                              <div className="text-lg font-black text-slate-700">{record.count}</div>
                            </div>
                            
                            <div className="w-px h-8 bg-slate-100"></div>
                            
                            <div className="text-center flex-1">
                              <div className="text-[12px] text-slate-400 font-bold mb-1">平均頻率</div>
                              <div className="text-lg font-black text-[#8B7EE0]">
                                {record.bpm} <span className="text-[10px] font-bold text-slate-400">BPM</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-slate-400 py-8 text-sm font-medium">尚無實作紀錄</div>
                    )}
                  </div>
                </div>
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}