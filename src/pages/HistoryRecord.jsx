import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation} from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function HistoryRecord() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'quiz');
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [cprHistory, setCprHistory] = useState([]);
  const [quizHistory, setQuizHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuizLoading, setIsQuizLoading] = useState(true);

  // 判斷是否為訪客
  const isGuest = localStorage.getItem('isGuest') === 'true';

  useEffect(() => {
    if (isGuest) {
      setIsLoading(false);
      setIsQuizLoading(false);
      return;
    }

    const fetchRecords = async () => {
      try {
        const { data: cprData, error: cprError } = await supabase
          .from('CprRecord')
          .select('*')
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
          .order('created_at', { ascending: false });
          
        if (!quizError && quizData) {
          setQuizHistory(quizData.map(item => ({
            id: item.id, date: item.date, time: item.time,
            score: item.score, correct: item.correct, total: item.total,
            details: item.details 
          })));
        }
      } catch (error) {
        console.error("獲取歷史紀錄失敗:", error);
      } finally {
        setIsLoading(false);
        setIsQuizLoading(false);
      }
    };
    fetchRecords();
  }, [isGuest]);

  // ==========================================
  // 🌟 核心修改：以「天」為單位分組，並抓取最近 7 次 (有練習的日子)
  // ==========================================
  
  // 1. 將所有紀錄依日期分組，並計算總分與次數
  const dailyDataMap = {};
  cprHistory.forEach(record => {
    if (!dailyDataMap[record.date]) {
      dailyDataMap[record.date] = { sum: 0, count: 0 };
    }
    dailyDataMap[record.date].sum += record.accuracy;
    dailyDataMap[record.date].count += 1;
  });

  // 2. 轉成陣列並計算每一天的平均準確率
  const dailyDataArray = Object.keys(dailyDataMap).map(date => ({
    date: date,
    accuracy: Math.round(dailyDataMap[date].sum / dailyDataMap[date].count)
  }));

  // 3. 依照時間先後順序排序 (舊 -> 新)
  dailyDataArray.sort((a, b) => new Date(a.date) - new Date(b.date));

  // 4. 只抓取「最近 7 次」有練習的日期
  const chartData = dailyDataArray.slice(-7);
  
  // 5. 計算圖表 X 軸繪製的間距與點位
  const xStep = chartData.length > 1 ? 100 / (chartData.length - 1) : 100;
  const pointsString = chartData.map((d, i) => `${i * xStep},${100 - d.accuracy}`).join(' ');
  
  // 確保漸層底部區域能平整地填滿
  let polyPoints = '';
  if (chartData.length > 0) {
    polyPoints = `0,100 ${pointsString} ${(chartData.length - 1) * xStep},100`;
  }
  // ==========================================

  if (selectedQuiz) {
    return (
      <div className="cpr-layout">
        <div className="cpr-container-scroll">
          <header className="cpr-header-center border-b border-slate-200/50 pb-4">
            <button onClick={() => setSelectedQuiz(null)} className="cpr-icon-btn shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <h1 className="cpr-title text-[#D4A373] mr-12">測驗詳情</h1>
          </header>
          <main className="flex-1 p-6 overflow-y-auto pb-10">
            <div className="flex justify-between items-center mb-6 pb-2">
              <div className="text-slate-700 font-bold text-lg">{selectedQuiz.date}</div>
              <div className="text-[#D4A373] font-bold text-lg bg-orange-50 px-3 py-1 rounded-full">答對: {selectedQuiz.correct}/{selectedQuiz.total}</div>
            </div>
            <div className="space-y-8">
              {selectedQuiz.details.map((item, idx) => (
                <div key={idx} className="cpr-card border-[#D4A373]/20 !p-5">
                  <span className="text-xs font-bold text-white bg-[#D4A373] px-2.5 py-1 rounded-full mb-3 inline-block">題目 {idx + 1}</span>
                  <p className="text-base font-bold text-slate-800 mb-4 leading-relaxed">{item.question}</p>
                  
                  <div className="space-y-2 mb-4">
                    {item.options.map(opt => {
                      let textColor = "text-slate-600";
                      if (opt.key === item.correctAns) textColor = "text-teal-600 font-bold";
                      else if (opt.key === item.userAns && opt.key !== item.correctAns) textColor = "text-rose-500 font-bold line-through";
                      return (
                        <div key={opt.key} className={`${textColor} text-sm flex gap-2`}>
                          <span>({opt.key})</span> <span>{opt.text}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mb-4 font-bold text-sm border-t border-slate-100 pt-4">
                    <div className="text-slate-600">您的選擇: <span className={item.userAns === item.correctAns ? "text-teal-600" : "text-rose-500"}>{item.userAns}</span></div>
                    <div className="text-slate-600">正確答案: <span className="text-teal-600">{item.correctAns}</span></div>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 shadow-sm">
                    <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                      <span className="font-bold text-amber-700">解析：</span><br/>{item.explanation}
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
      <div className="cpr-container-scroll">
        
        <header className="cpr-header-center pb-4">
          <button onClick={() => navigate('/')} className="cpr-icon-btn shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="cpr-title text-[#82A098] mr-12">歷史紀錄</h1>
        </header>

        {isGuest ? (
          <main className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center w-full max-w-sm">
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
                className="cpr-btn-primary w-full bg-[#82A098] hover:bg-[#6B908F] shadow-md border-none py-3.5"
              >
                前往登入
              </button>
            </div>
          </main>
        ) : (
          <>
            <div className="px-6 pb-2 bg-[#FAF8F5]">
              <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
                <button 
                  onClick={() => setActiveTab('quiz')} 
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'quiz' ? 'bg-[#D4A373] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  考照題庫
                </button>
                <button 
                  onClick={() => setActiveTab('cpr')} 
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'cpr' ? 'bg-[#E09E75] text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  CPR 練習
                </button>
              </div>
            </div>

            <main className="flex-1 overflow-y-auto p-6 pb-24">
              {activeTab === 'quiz' && (
                <div className="animate-fade-in">
                  {quizHistory.length > 0 && (
                    <div className="cpr-card border-[#D4A373]/20 !p-5 mb-6 flex items-center justify-between">
                      <div>
                        <h2 className="text-slate-500 font-bold text-xs mb-1">最近一次測驗</h2>
                        <div className="text-sm font-bold text-slate-800">答對題數 : {quizHistory[0].correct} / {quizHistory[0].total}</div>
                      </div>
                      <div className="w-14 h-14 rounded-full border-4 border-amber-200 bg-amber-50 flex items-center justify-center">
                        <span className="font-black text-[#D4A373] text-lg">{quizHistory[0].score}%</span>
                      </div>
                    </div>
                  )}
                  <h3 className="font-bold text-slate-600 mb-3 ml-1 text-sm">所有測驗紀錄</h3>
                  <div className="space-y-4">
                    {isQuizLoading ? (
                      <p className="text-center text-slate-400 text-sm py-4">載入中...</p>
                    ) : quizHistory.length > 0 ? (
                      quizHistory.map((record) => (
                        <div key={record.id} onClick={() => setSelectedQuiz(record)} className="cpr-card !p-4 !mb-0 border-slate-100 flex justify-between items-center active:scale-95 transition-transform cursor-pointer hover:border-[#D4A373]/50">
                          <div>
                            <div className="font-bold text-slate-700">{record.date}</div>
                            <div className="text-xs text-slate-400 font-medium">{record.time}</div>
                          </div>
                          <div className={`text-xl font-black ${record.score >= 80 ? 'text-[#6B908F]' : 'text-[#E09E75]'}`}>
                            {record.score} <span className="text-xs font-medium text-slate-400">分</span>
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
                  <div className="cpr-card border-[#E09E75]/20 !p-5 mb-6">
                    <h4 className="text-slate-700 font-bold mb-4 text-sm">練習趨勢圖 (每日平均)</h4>
                    {isLoading ? (
                      <div className="w-full h-32 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-8 h-8 border-4 border-[#E09E75] border-t-transparent rounded-full animate-spin mb-2"></div>
                      </div>
                    ) : chartData.length > 0 ? (
                      <>
                        <div className="w-full relative h-32 mt-4">
                          <svg viewBox="0 -10 100 120" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#E09E75" stopOpacity="0.3"/>
                                <stop offset="100%" stopColor="#E09E75" stopOpacity="0.0"/>
                              </linearGradient>
                            </defs>
                            <polygon points={polyPoints} fill="url(#chartGradient)" />
                            <polyline points={pointsString} fill="none" stroke="#E09E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            {chartData.map((d, i) => (
                              <g key={d.date} className="group cursor-pointer">
                                <circle cx={i * xStep} cy={100 - d.accuracy} r="3" fill="#fff" stroke="#E09E75" strokeWidth="2" />
                                <text x={i * xStep} y={100 - d.accuracy - 10} fontSize="6" fill="#64748b" textAnchor="middle" className="font-bold opacity-0 group-hover:opacity-100 transition-opacity">{d.accuracy}%</text>
                              </g>
                            ))}
                          </svg>
                        </div>
                        {/* X 軸標籤：顯示開始時間、中間點、最近一次練習 */}
                        <div className="flex justify-between mt-2 px-1">
                          <span className="text-[10px] text-slate-400 font-medium">{chartData[0]?.date.slice(5)}</span>
                          {chartData.length > 2 && <span className="text-[10px] text-slate-400 font-medium">{chartData[Math.floor(chartData.length/2)]?.date.slice(5)}</span>}
                          {chartData.length > 1 && <span className="text-[10px] text-slate-400 font-medium">{chartData[chartData.length - 1]?.date.slice(5)}</span>}
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center text-slate-400 font-medium text-sm">
                        尚無練習數據
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-600 mb-3 ml-1 text-sm">實作紀錄清單</h3>
                  <div className="space-y-4">
                    {isLoading ? (
                      <p className="text-center text-slate-400 text-sm">載入中...</p>
                    ) : cprHistory.length > 0 ? (
                      cprHistory.map((record) => (
                        <div 
                          key={record.id} 
                          onClick={() => navigate('/report', { state: { id: record.id, aiAdvice: record.aiAdvice, finalBpm: record.bpm, totalPresses: record.count, errors: record.errors, date: record.date, time: record.time, accuracy: record.accuracy } })}
                          className="cpr-card !mb-0 !p-5 border-slate-100 cursor-pointer hover:border-[#E09E75]/50 active:scale-95 transition-transform"
                        >
                          <div className="text-xs font-bold text-slate-400 border-b border-slate-100 pb-2 mb-3 flex justify-between">
                            <span>{record.date}</span><span>{record.time}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-center">
                              <div className="text-[10px] text-slate-400 font-bold mb-1">準確率</div>
                              <div className={`text-lg font-black ${record.accuracy >= 80 ? 'text-[#6B908F]' : 'text-rose-500'}`}>{record.accuracy}%</div>
                            </div>
                            <div className="w-px h-8 bg-slate-200"></div>
                            <div className="text-center">
                              <div className="text-[10px] text-slate-400 font-bold mb-1">按壓次數</div>
                              <div className="text-lg font-black text-slate-700">{record.count}</div>
                            </div>
                            <div className="w-px h-8 bg-slate-200"></div>
                            <div className="text-center">
                              <div className="text-[10px] text-slate-400 font-bold mb-1">平均頻率</div>
                              <div className="text-lg font-black text-[#E09E75]">{record.bpm}<span className="text-[10px] text-slate-500 ml-0.5">BPM</span></div>
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