import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function HistoryRecord() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('quiz');
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  const [cprHistory, setCprHistory] = useState([]);
  const [quizHistory, setQuizHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuizLoading, setIsQuizLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const { data: cprData, error: cprError } = await supabase
          .from('CprRecord')
          .select('*')
          .order('created_at', { ascending: false });

        if (!cprError && cprData) {
          setCprHistory(cprData.map(item => ({
            id: item.id, date: item.date, time: item.time,
            accuracy: item.accuracy, count: item.count, bpm: item.bpm,
            errors: { armBent: item.armBent, notVertical: item.notVertical, positionOffset: item.positionOffset, notDeepEnough: item.notDeepEnough, tooDeep: item.tooDeep}
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
  }, []);

  const chartData = [...cprHistory].slice(0, 10).reverse(); 
  const xStep = chartData.length > 1 ? 100 / (chartData.length - 1) : 100;
  const pointsString = chartData.map((d, i) => `${i * xStep},${100 - d.accuracy}`).join(' ');

  if (selectedQuiz) {
    return (
      <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
        <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden">
          <header className="flex items-center p-6 pt-12 bg-white z-10">
            <button onClick={() => setSelectedQuiz(null)} className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-gray-800 active:scale-90 transition-transform">
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <h1 className="flex-1 text-center text-2xl font-medium text-orange-400 mr-12 tracking-wide">題目練習紀錄</h1>
          </header>

          <main className="flex-1 p-6 overflow-y-auto pb-10">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div className="text-gray-700 font-bold text-lg flex items-center gap-2">📅 {selectedQuiz.date}</div>
              <div className="text-gray-700 font-bold text-lg">答對:{selectedQuiz.correct}/{selectedQuiz.total}</div>
            </div>

            <div className="space-y-10">
              {selectedQuiz.details.map((item, idx) => (
                <div key={idx} className="border-2 border-gray-300 rounded-2xl p-5 bg-white shadow-sm">
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full mb-3 inline-block">第 {idx + 1} 題</span>
                  <p className="text-lg font-bold text-gray-800 mb-4 leading-relaxed">{item.question}</p>
                  
                  <div className="space-y-2 mb-4">
                    {item.options.map(opt => {
                      let textColor = "text-gray-800";
                      if (opt.key === item.correctAns) textColor = "text-green-600 font-bold";
                      else if (opt.key === item.userAns && opt.key !== item.correctAns) textColor = "text-red-500 font-bold line-through";
                      return (
                        <div key={opt.key} className={`${textColor} text-base`}>
                          ({opt.key}) {opt.text}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex justify-around mb-6 font-bold text-xl border-t pt-4">
                    <div className="text-gray-800">你的答案: <span className={item.userAns === item.correctAns ? "text-green-600" : "text-red-500"}>{item.userAns}</span></div>
                    <div className="text-gray-800">正確答案: <span className="text-green-600">{item.correctAns}</span></div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#fdf8d5] border border-yellow-100 shadow-sm">
                    <p className="text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-line">
                      <span className="font-bold">詳解：</span><br/>{item.explanation}
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
    <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden">
        <header className="flex items-center p-6 pt-12 bg-white z-10">
          <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 shadow-sm active:scale-90 transition-transform">
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="flex-1 text-center text-xl font-bold text-gray-800 mr-10">歷史練習紀錄</h1>
        </header>

        <div className="flex border-b border-gray-200 bg-white">
          <button onClick={() => setActiveTab('quiz')} className={`flex-1 py-4 text-center font-bold transition-colors ${activeTab === 'quiz' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>題庫練習</button>
          <button onClick={() => setActiveTab('cpr')} className={`flex-1 py-4 text-center font-bold transition-colors ${activeTab === 'cpr' ? 'text-blue-600 border-b-4 border-blue-600' : 'text-gray-400'}`}>CPR練習</button>
        </div>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {activeTab === 'quiz' && (
            <div className="animate-fade-in">
              {quizHistory.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-gray-500 font-bold text-sm mb-1">最近一次完成狀況</h2>
                    <div className="text-sm font-bold text-gray-800">題數: {quizHistory[0].correct} / {quizHistory[0].total}</div>
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-blue-500 flex items-center justify-center">
                    <span className="font-black text-blue-600 text-xl">{quizHistory[0].score}%</span>
                  </div>
                </div>
              )}

              <h3 className="font-bold text-gray-800 mb-3 ml-1">過去測驗紀錄 (點擊查看詳細)</h3>
              <div className="space-y-3">
                {isQuizLoading ? (
                  <p className="text-center text-gray-400 text-sm py-4">資料載入中...</p>
                ) : quizHistory.length > 0 ? (
                  quizHistory.map((record) => (
                    <div key={record.id} onClick={() => setSelectedQuiz(record)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center active:scale-95 transition-transform cursor-pointer hover:border-blue-300">
                      <div>
                        <div className="font-bold text-gray-800">{record.date}</div>
                        <div className="text-sm text-gray-500">{record.time}</div>
                      </div>
                      <div className={`text-2xl font-black ${record.score >= 70 ? 'text-green-500' : 'text-orange-500'}`}>
                        {record.score} <span className="text-sm font-medium text-gray-500">分</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">目前沒有測驗紀錄，快去考一張吧！</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'cpr' && (
            <div className="animate-fade-in">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
                 <h4 className="text-gray-700 font-bold mb-6">最近練習分析 (準確率)</h4>
                 
                 {isLoading ? (
                   <div className="w-full h-32 flex flex-col items-center justify-center text-gray-400">
                     <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                     資料載入中...
                   </div>
                 ) : chartData.length > 0 ? (
                   <>
                     <div className="w-full relative h-32">
                       <svg viewBox="0 -10 100 120" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                         <defs>
                           <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor="#f97316" stopOpacity="0.3"/>
                             <stop offset="100%" stopColor="#f97316" stopOpacity="0.0"/>
                           </linearGradient>
                         </defs>
                         <polygon points={`0,100 ${pointsString} 100,100`} fill="url(#chartGradient)" />
                         <polyline points={pointsString} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                         {chartData.map((d, i) => (
                           <g key={d.id} className="group cursor-pointer">
                             <circle cx={i * xStep} cy={100 - d.accuracy} r="2.5" fill="#fff" stroke="#f97316" strokeWidth="1.5" />
                             <text x={i * xStep} y={100 - d.accuracy - 8} fontSize="5" fill="#4b5563" textAnchor="middle" className="font-bold opacity-0 group-hover:opacity-100 transition-opacity">{d.accuracy}%</text>
                           </g>
                         ))}
                       </svg>
                     </div>
                     <div className="flex justify-between mt-4">
                       <span className="text-[10px] text-gray-400">{chartData[0]?.date.slice(5)}</span>
                       {chartData.length > 2 && <span className="text-[10px] text-gray-400">{chartData[Math.floor(chartData.length/2)]?.date.slice(5)}</span>}
                       {chartData.length > 1 && <span className="text-[10px] text-gray-400">{chartData[chartData.length - 1]?.date.slice(5)}</span>}
                     </div>
                   </>
                 ) : (
                   <div className="w-full h-32 flex items-center justify-center text-gray-400 font-bold">
                     尚無雲端練習紀錄
                   </div>
                 )}
              </div>

              <h3 className="font-bold text-gray-800 mb-3 ml-1">練習紀錄列表 (點擊查看)</h3>
              <div className="space-y-4">
                {isLoading ? (
                  <p className="text-center text-gray-400 text-sm">請稍候...</p>
                ) : cprHistory.length > 0 ? (
                  cprHistory.map((record) => (
                    <div 
                      key={record.id} 
                      onClick={() => navigate('/report', { state: { finalBpm: record.bpm, totalPresses: record.count, errors: record.errors, date: record.date, time: record.time, accuracy: record.accuracy } })}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 active:scale-95 transition-transform"
                    >
                      <div className="text-sm font-bold text-gray-500 border-b pb-2 mb-3">{record.date} {record.time}</div>
                      <div className="flex justify-between items-center">
                        <div className="text-center">
                          <div className="text-xs text-gray-400 font-bold mb-1">準確率</div>
                          <div className="text-xl font-black text-indigo-600">{record.accuracy}%</div>
                        </div>
                        <div className="w-px h-8 bg-gray-200"></div>
                        <div className="text-center">
                          <div className="text-xs text-gray-400 font-bold mb-1">按壓次數</div>
                          <div className="text-xl font-black text-gray-800">{record.count}</div>
                        </div>
                        <div className="w-px h-8 bg-gray-200"></div>
                        <div className="text-center">
                          <div className="text-xs text-gray-400 font-bold mb-1">頻率</div>
                          <div className="text-xl font-black text-green-500">{record.bpm}<span className="text-xs text-gray-500">BPM</span></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">目前還沒有任何紀錄，快去練習一次吧！</div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}