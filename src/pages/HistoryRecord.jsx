import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation} from 'react-router-dom';
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

  // 題目掌握度計算
  const masteredSet = new Set();
  quizHistory.forEach(record => {
    (record.details || []).forEach(item => {
      if (item.userAns === item.correctAns) masteredSet.add(item.question);
    });
  });
  const masteredCount = masteredSet.size;
  const masteryRate = totalBankCount > 0 ? Math.round((masteredCount / totalBankCount) * 100) : 0;

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
  
  // 5. 圖表座標計算
  const PAD = { l: 28, r: 12, t: 22, b: 26 };
  const SVG_W = 300, SVG_H = 160;
  const cw = SVG_W - PAD.l - PAD.r;
  const ch = SVG_H - PAD.t - PAD.b;
  const cx = (i) => PAD.l + (chartData.length > 1 ? (i / (chartData.length - 1)) * cw : cw / 2);
  const cy = (acc) => PAD.t + ch * (1 - acc / 100);

  // 平滑曲線路徑
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

  // 今日紀錄圖表
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
                  {totalBankCount > 0 && (
                    <div className="cpr-card border-[#D4A373]/20 !p-5 mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h2 className="text-slate-500 font-bold text-xs mb-1">題庫掌握度</h2>
                          <div className="text-sm font-bold text-slate-800">
                            已答對 <span className="text-[#D4A373]">{masteredCount}</span> / {totalBankCount} 題
                          </div>
                        </div>
                        <div className="w-14 h-14 rounded-full border-4 border-amber-200 bg-amber-50 flex items-center justify-center">
                          <span className="font-black text-[#D4A373] text-lg">{masteryRate}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-amber-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#D4A373] rounded-full transition-all duration-500"
                          style={{ width: `${masteryRate}%` }}
                        />
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
                    {/* 標題列 + 頁籤 */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-slate-700 font-bold text-sm">
                        {chartTab === 0 ? '每日平均趨勢' : '今日練習紀錄'}
                      </h4>
                      <div className="flex gap-1.5">
                        {['趨勢', '今日'].map((label, idx) => (
                          <button
                            key={idx}
                            onClick={() => setChartTab(idx)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${chartTab === idx ? 'bg-[#E09E75] text-white' : 'bg-slate-100 text-slate-400'}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 滑動容器 */}
                    <div
                      className="overflow-hidden"
                      onTouchStart={handleChartTouchStart}
                      onTouchEnd={handleChartTouchEnd}
                    >
                      <div
                        className="flex transition-transform duration-300"
                        style={{ transform: `translateX(-${chartTab * 100}%)` }}
                      >
                        {/* 圖一：每日平均趨勢 */}
                        <div className="shrink-0 w-full">
                          {isLoading ? (
                            <div className="w-full h-40 flex items-center justify-center">
                              <div className="w-8 h-8 border-4 border-[#E09E75] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : chartData.length > 0 ? (
                            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                              <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#E09E75" stopOpacity="0.25"/>
                                  <stop offset="100%" stopColor="#E09E75" stopOpacity="0"/>
                                </linearGradient>
                              </defs>
                              {[0, 25, 50, 75, 100].map(v => (
                                <g key={v}>
                                  <line x1={PAD.l} y1={cy(v)} x2={PAD.l + cw} y2={cy(v)} stroke="#e2e8f0" strokeWidth="0.8" />
                                  <text x={PAD.l - 4} y={cy(v) + 3.5} fontSize="8" fill="#94a3b8" textAnchor="end">{v}</text>
                                </g>
                              ))}
                              <path d={areaPath} fill="url(#chartGradient)" />
                              <path d={linePath} fill="none" stroke="#E09E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              {chartData.map((d, i) => (
                                <g key={d.date}>
                                  <circle cx={cx(i)} cy={cy(d.accuracy)} r="3.5" fill="#fff" stroke="#E09E75" strokeWidth="2" />
                                  <text x={cx(i)} y={cy(d.accuracy) - 7} fontSize="8" fill="#E09E75" textAnchor="middle" fontWeight="bold">{d.accuracy}%</text>
                                  <text x={cx(i)} y={SVG_H - 6} fontSize="8" fill="#94a3b8" textAnchor="middle">{d.date.slice(5)}</text>
                                </g>
                              ))}
                            </svg>
                          ) : (
                            <div className="w-full h-40 flex items-center justify-center text-slate-400 font-medium text-sm">尚無練習數據</div>
                          )}
                        </div>

                        {/* 圖二：今日每筆紀錄 */}
                        <div className="shrink-0 w-full">
                          {isLoading ? (
                            <div className="w-full h-40 flex items-center justify-center">
                              <div className="w-8 h-8 border-4 border-[#E09E75] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : todayRecords.length > 0 ? (
                            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
                              <defs>
                                <linearGradient id="todayGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#6B908F" stopOpacity="0.25"/>
                                  <stop offset="100%" stopColor="#6B908F" stopOpacity="0"/>
                                </linearGradient>
                              </defs>
                              {[0, 25, 50, 75, 100].map(v => (
                                <g key={v}>
                                  <line x1={PAD.l} y1={cy(v)} x2={PAD.l + cw} y2={cy(v)} stroke="#e2e8f0" strokeWidth="0.8" />
                                  <text x={PAD.l - 4} y={cy(v) + 3.5} fontSize="8" fill="#94a3b8" textAnchor="end">{v}</text>
                                </g>
                              ))}
                              <path d={todayAreaPath} fill="url(#todayGradient)" />
                              <path d={todayLinePath} fill="none" stroke="#6B908F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              {todayRecords.map((d, i) => (
                                <g key={i}>
                                  <circle cx={todayCx(i)} cy={cy(d.accuracy)} r="3.5" fill="#fff" stroke="#6B908F" strokeWidth="2" />
                                  <text x={todayCx(i)} y={cy(d.accuracy) - 7} fontSize="8" fill="#6B908F" textAnchor="middle" fontWeight="bold">{d.accuracy}%</text>
                                  <text x={todayCx(i)} y={SVG_H - 6} fontSize="8" fill="#94a3b8" textAnchor="middle">{to24h(d.time)}</text>
                                </g>
                              ))}
                            </svg>
                          ) : (
                            <div className="w-full h-40 flex items-center justify-center text-slate-400 font-medium text-sm">今日尚無練習紀錄</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 分頁指示點 */}
                    <div className="flex justify-center gap-2 mt-3">
                      {[0, 1].map(idx => (
                        <button key={idx} onClick={() => setChartTab(idx)}
                          className={`rounded-full transition-all ${chartTab === idx ? 'w-4 h-2 bg-[#E09E75]' : 'w-2 h-2 bg-slate-300'}`}
                        />
                      ))}
                    </div>
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