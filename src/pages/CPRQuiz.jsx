import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

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
          <div className="w-10 h-10 border-4 border-[#E09E75] border-t-transparent rounded-full animate-spin mb-4"></div>
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
    
    setUserRecord(prev => [
      ...prev, 
      {
        question: currentQ.question,
        options: currentQ.options,
        userAns: key,
        correctAns: currentQ.answer,
        explanation: currentQ.explanation
      }
    ]);
  };

  const handleNextQuestion = async () => {
    if (currentIndex < quizQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      const correctCount = userRecord.filter(r => r.userAns === r.correctAns).length;
      const finalScore = Math.round((correctCount / quizQuestions.length) * 100);
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date();
      const dateStr = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
      const timeStr = `${now.getHours() >= 12 ? '下午' : '上午'} ${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')}`;
      const recordData = {
        user_id: user?.id,
        date: dateStr,
        time: timeStr,
        score: finalScore,
        correct: correctCount,
        total: quizQuestions.length,
        details: userRecord 
      };
      try {
        await supabase.from('QuizRecord').insert([recordData]);
        console.log('成績已儲存');
      } catch (error) {
        console.error('儲存成績失敗:', error);
      }
      setIsFinished(true);
    }
  };

  if (isFinished) {
    const score = userRecord.filter(r => r.userAns === r.correctAns).length;
    const finalScore = Math.round((score / quizQuestions.length) * 100);
    const isPass = finalScore >= 80;
    return (
      <div className="cpr-layout">
        <div className="cpr-container p-6">
          <header className="flex items-center pt-6 pb-4">
            <h1 className="flex-1 text-center text-xl font-bold text-slate-800 tracking-wider">測驗結果</h1>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 border-4 ${isPass ? 'bg-teal-50 border-teal-200' : 'bg-rose-50 border-rose-200'}`}>
              <span className={`text-5xl font-black ${isPass ? 'text-[#6B908F]' : 'text-[#E09E75]'}`}>{finalScore}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">測驗結束</h2>
            <p className="text-slate-500 mb-8">答對 {score} / {quizQuestions.length} 題</p>
            <button onClick={() => navigate('/history')} className="cpr-btn-secondary w-full bg-[#82A098]">查看歷史紀錄</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cpr-layout">
      <div className="cpr-container-scroll">
        <header className="cpr-header-center border-b border-slate-200/50 pb-4">
          <button onClick={() => navigate(-1)} className="cpr-icon-btn">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="cpr-title text-[#D4A373] mr-12">考照題庫</h1>
        </header>
        
        <div className="w-full h-1.5 bg-slate-200">
          <div className="h-full bg-[#D4A373] transition-all duration-300 ease-out" style={{ width: `${(currentIndex / quizQuestions.length) * 100}%` }}></div>
        </div>

        <main className="flex-1 px-6 py-8 overflow-y-auto pb-32">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-bold text-[#D4A373] bg-orange-50 px-3 py-1 rounded-full border border-orange-100">問題: {currentIndex + 1} / {quizQuestions.length}</span>
          </div>
          
          <div className="cpr-card border-[#D4A373]/20 mb-8 min-h-[100px] flex items-center">
            <h2 className="text-lg font-bold text-slate-800 leading-relaxed tracking-wide">{currentQ.question}</h2>
          </div>
          
          <div className="space-y-3 mb-6">
            {currentQ.options.map((opt) => {
              let btnClass = "w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex gap-3 shadow-sm bg-white ";
              if (!showExplanation) { 
                btnClass += "border-slate-200 hover:border-[#D4A373] hover:bg-orange-50 active:scale-[0.98]"; 
              } else {
                if (opt.key === currentQ.answer) btnClass += "border-teal-400 bg-teal-50";
                else if (opt.key === selectedOption) btnClass += "border-rose-400 bg-rose-50";
                else btnClass += "border-slate-200 opacity-50";
              }
              return (
                <button key={opt.key} onClick={() => handleOptionClick(opt.key)} className={btnClass}>
                  <span className={`font-bold ${showExplanation && opt.key === currentQ.answer ? 'text-teal-600' : showExplanation && opt.key === selectedOption ? 'text-rose-600' : 'text-slate-500'}`}>({opt.key})</span>
                  <span className={`font-medium ${showExplanation && opt.key === currentQ.answer ? 'text-teal-700' : showExplanation && opt.key === selectedOption ? 'text-rose-700' : 'text-slate-700'}`}>{opt.text}</span>
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className="animate-fade-in-up mt-8">
              <div className="flex justify-around mb-4 font-bold text-lg">
                <div className="text-slate-600">您的答案: <span className={selectedOption === currentQ.answer ? "text-teal-600" : "text-rose-600"}>{selectedOption}</span></div>
                <div className="text-slate-600">正確答案: <span className="text-teal-600">{currentQ.answer}</span></div>
              </div>
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 shadow-sm">
                <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                  <span className="font-bold text-amber-700">解析：</span><br/>
                  {currentQ.explanation}
                </p>
              </div>
            </div>
          )}
        </main>
        
        {showExplanation && (
          <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5] to-transparent pt-12">
            <button onClick={handleNextQuestion} className="cpr-btn-primary w-full shadow-lg">
              {currentIndex < quizQuestions.length - 1 ? '下一題' : '查看成績'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}