import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Mascot from '../components/Mascot';

export default function CPRQuiz() {
  const navigate = useNavigate();
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [userRecord, setUserRecord] = useState([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('QuestionBank')
          .select('*');
        if (error) throw error;
        if (data) {
          const shuffled = [...data].sort(() => 0.5 - Math.random()).slice(0, 20);
          setQuizQuestions(shuffled);
        }
      } catch (err) {
        console.error("讀取題目失敗:", err.message);
        alert("讀取題目失敗，請稍後再試。");
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  if (isLoading) {
    return (
      <div className="cpr-layout items-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-[#8B7EE0] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-bold">載入題庫中...</p>
        </div>
      </div>
    );
  }

  if (quizQuestions.length === 0) return <div className="p-10 text-center">暫無題目資料</div>;

  const currentQ = quizQuestions[currentIndex];

  const handleOptionClick = (key) => {
    if (showExplanation) return;
    setSelectedOption(key);
    setShowExplanation(true);
    
    setUserRecord(prev => {
      const newRecord = [...prev];
      newRecord[currentIndex] = {
        question: currentQ.question,
        options: currentQ.options,
        userAns: key,
        correctAns: currentQ.answer,
        explanation: currentQ.explanation
      };
      return newRecord;
    });
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      
      const existingRecord = userRecord[prevIndex];
      if (existingRecord) {
        setSelectedOption(existingRecord.userAns);
        setShowExplanation(true);
      } else {
        setSelectedOption(null);
        setShowExplanation(false);
      }
    }
  };

  const handleNextQuestion = async () => {
    if (currentIndex < quizQuestions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      
      const existingRecord = userRecord[nextIndex];
      if (existingRecord) {
        setSelectedOption(existingRecord.userAns);
        setShowExplanation(true);
      } else {
        setSelectedOption(null);
        setShowExplanation(false);
      }
    } else {
      const correctCount = userRecord.filter(r => r && r.userAns === r.correctAns).length;
      const finalScore = Math.round((correctCount / quizQuestions.length) * 100);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const now = new Date();
        const dateStr = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
        const timeStr = `${now.getHours() >= 12 ? '下午' : '上午'} ${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')}`;
        const recordData = {
          user_id: user.id,
          date: dateStr,
          time: timeStr,
          score: finalScore,
          correct: correctCount,
          total: quizQuestions.length,
          details: userRecord
        };
        try {
          await supabase.from('QuizRecord').insert([recordData]);
        } catch (error) {
          console.error('儲存成績失敗:', error);
        }
      }
      setIsFinished(true);
    }
  };

  if (isFinished) {
    const score = userRecord.filter(r => r && r.userAns === r.correctAns).length;
    const finalScore = Math.round((score / quizQuestions.length) * 100);
    const isPass = finalScore >= 80;
    
    return (
      <div className="cpr-layout bg-slate-50 min-h-[100dvh] flex flex-col items-center">
        <div className="w-full max-w-[430px] flex-1 flex flex-col bg-[#f7f8fc] relative overflow-hidden sm:shadow-2xl sm:border-x sm:border-slate-200">
          
          <header className="pt-10 pb-4 px-6 flex justify-center items-center">
            <h1 className="text-xl font-bold text-slate-800 tracking-widest">測驗結果</h1>
          </header>

          <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
            
            {/* 已移除 book.png */}
            
            {/* 成績大圓圈 */}
            <div className={`w-36 h-36 rounded-full flex items-center justify-center mb-6 border-[6px] shadow-sm ${isPass ? 'bg-white border-[#5B8DEF]/20' : 'bg-white border-rose-100'}`}>
              <span className={`text-6xl font-black ${isPass ? 'text-[#8B7EE0]' : 'text-rose-400'}`}>{finalScore}</span>
            </div>
            
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-widest">測驗結束</h2>
              <p className="text-slate-500 font-medium">答對 {score} / {quizQuestions.length} 題</p>
            </div>
            
            <button onClick={() => navigate('/history')} className="w-full py-4 rounded-full font-bold text-lg tracking-wider transition-transform active:scale-95 shadow-lg bg-[#5B8DEF] hover:bg-[#4A7DDF] text-white">
              查看歷史紀錄
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="cpr-layout bg-white relative min-h-[100dvh] flex flex-col overflow-hidden sm:shadow-2xl sm:border-x sm:border-slate-200 max-w-[430px] mx-auto">
      <div className="cpr-container-scroll flex-1 flex flex-col relative z-10">
        
        {/* 頂部標題與返回鍵 */}
        <header className="flex items-center justify-between px-6 pt-10 pb-4 relative z-20">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all shrink-0 z-40">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="text-xl font-black text-[#2F2659] tracking-widest absolute left-1/2 transform -translate-x-1/2 z-40">考照題庫</h1>
        </header>
        
        <div className="w-full h-1.5 bg-slate-100">
          <div className="h-full bg-[#8B7EE0] transition-all duration-300 ease-out" style={{ width: `${(currentIndex / quizQuestions.length) * 100}%` }}></div>
        </div>

        {/* pb-40 確保畫面捲動時最下方不會被吉祥物擋住 */}
        <main className="flex-1 px-6 py-8 overflow-y-auto pb-40">
          
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-bold text-[#8B7EE0] bg-[#8B7EE0]/10 px-3.5 py-1.5 rounded-full border border-[#8B7EE0]/20">
              問題: {currentIndex + 1} / {quizQuestions.length}
            </span>
          </div>
          
          <div className="cpr-card mb-8 min-h-[100px] flex items-center border-none shadow-sm bg-[#F7F8FC]">
            <h2 className="text-lg font-bold text-slate-800 leading-relaxed tracking-wide">{currentQ.question}</h2>
          </div>
          
          <div className="space-y-3 mb-6">
            {currentQ.options.map((opt) => {
              let btnClass = "w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex gap-3 shadow-sm bg-white ";
              if (!showExplanation) { 
                btnClass += "border-slate-100 hover:border-[#8B7EE0]/50 hover:bg-[#8B7EE0]/5 active:scale-[0.98]"; 
              } else {
                if (opt.key === currentQ.answer) btnClass += "border-teal-400 bg-teal-50";
                else if (opt.key === selectedOption) btnClass += "border-rose-400 bg-rose-50";
                else btnClass += "border-slate-100 opacity-50";
              }
              return (
                <button key={opt.key} onClick={() => handleOptionClick(opt.key)} className={btnClass}>
                  <span className={`font-bold ${showExplanation && opt.key === currentQ.answer ? 'text-teal-600' : showExplanation && opt.key === selectedOption ? 'text-rose-600' : 'text-slate-400'}`}>({opt.key})</span>
                  <span className={`font-medium ${showExplanation && opt.key === currentQ.answer ? 'text-teal-700' : showExplanation && opt.key === selectedOption ? 'text-rose-700' : 'text-slate-700'}`}>{opt.text}</span>
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className="animate-fade-in-up mt-8">
              <div className="flex justify-around mb-4 font-bold text-[15px]">
                <div className="text-slate-500">您的答案: <span className={selectedOption === currentQ.answer ? "text-teal-600 font-black" : "text-rose-600 font-black"}>{selectedOption}</span></div>
                <div className="text-slate-500">正確答案: <span className="text-teal-600 font-black">{currentQ.answer}</span></div>
              </div>
              
              <div className="p-5 rounded-2xl bg-[#F4F7FF] border border-[#5B8DEF]/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#5B8DEF]/60"></div>
                <div className="pl-2">
                  {/* 使用 flex 讓圖片與文字水平對齊 */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <Mascot variant="book" className="w-10 h-10 object-contain shrink-0" />
                    <span className="font-bold text-[#5B8DEF]">題目解析</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                    {currentQ.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
        
        {/* 底部按鈕區：兩顆按鈕並排填滿 */}
        {showExplanation && (
          <div className="absolute bottom-0 left-0 w-full p-6 pt-16 bg-gradient-to-t from-white via-white to-transparent z-20 flex justify-center">
            
            <div className="flex gap-3 w-full">
              <button 
                onClick={handlePrevQuestion}
                disabled={currentIndex === 0}
                className={`flex-1 py-3 rounded-full font-bold tracking-wider transition-transform shadow-sm border-2 ${
                  currentIndex === 0 
                    ? 'border-slate-200 text-slate-300 bg-slate-50 opacity-50 cursor-not-allowed' 
                    : 'border-[#8B7EE0]/30 text-[#8B7EE0] bg-white hover:bg-[#8B7EE0]/5 active:scale-95'
                }`}
              >
                上一題
              </button>
              
              <button 
                onClick={handleNextQuestion} 
                className="flex-1 py-3 rounded-full font-bold tracking-wider transition-transform active:scale-95 shadow-sm bg-[#8B7EE0] text-white"
              >
                {currentIndex < quizQuestions.length - 1 ? '下一題' : '查看成績'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}