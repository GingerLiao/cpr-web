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
        console.error("抓取題庫失敗:", err.message);
        alert("無法載入題庫，請檢查網路連線");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-bold">題庫載入中...</p>
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
      const timeStr = `${now.getHours() > 12 ? '下午' : '上午'}${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')}`;

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
        console.log('題庫成績儲存成功！');
      } catch (error) {
        console.error('儲存題庫成績失敗:', error);
      }

      setIsFinished(true);
    }
  };

  if (isFinished) {
    const score = userRecord.filter(r => r.userAns === r.correctAns).length;
    return (
      <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
        <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden p-6">
          <header className="flex items-center pt-6 pb-4">
            <h1 className="flex-1 text-center text-xl font-bold text-gray-800">測驗結果</h1>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-5xl font-black text-green-600">{Math.round((score / quizQuestions.length) * 100)}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">測驗完成！</h2>
            <p className="text-gray-500 mb-8">你總共答對了 {score} / {quizQuestions.length} 題</p>
            <button onClick={() => navigate('/history')} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg active:scale-95 transition-transform">前往歷史紀錄查看</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center font-sans">
      <div className="w-full max-w-md bg-white h-screen relative flex flex-col shadow-2xl overflow-hidden">
        <header className="flex items-center p-6 pt-12 bg-white shadow-sm z-10">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 shadow-sm active:scale-90 transition-transform">
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h1 className="flex-1 text-center text-xl font-bold text-gray-800 mr-10">考照題庫</h1>
        </header>

        <main className="flex-1 p-6 overflow-y-auto pb-24">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">答題進度: {currentIndex + 1} / {quizQuestions.length}</span>
          </div>
          <div className="mb-6"><h2 className="text-lg font-bold text-gray-800 leading-relaxed tracking-wide">{currentQ.question}</h2></div>
          
          <div className="space-y-3 mb-6">
            {currentQ.options.map((opt) => {
              let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex gap-3 bg-white ";
              if (!showExplanation) { btnClass += "border-gray-300"; } 
              else {
                if (opt.key === currentQ.answer) btnClass += "border-gray-300";
                else if (opt.key === selectedOption) btnClass += "border-gray-300";
                else btnClass += "border-gray-300 opacity-50";
              }
              return (
                <button key={opt.key} onClick={() => handleOptionClick(opt.key)} className={btnClass}>
                  <span className={`font-bold ${showExplanation && opt.key === currentQ.answer ? 'text-green-600' : showExplanation && opt.key === selectedOption ? 'text-red-600' : 'text-gray-800'}`}>({opt.key})</span>
                  <span className={`font-medium ${showExplanation && opt.key === currentQ.answer ? 'text-green-600' : showExplanation && opt.key === selectedOption ? 'text-red-600' : 'text-gray-800'}`}>{opt.text}</span>
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <>
              <div className="flex justify-around mb-4 font-bold text-lg">
                <div className="text-gray-800">你的答案: <span className={selectedOption === currentQ.answer ? "text-green-600" : "text-red-600"}>{selectedOption}</span></div>
                <div className="text-gray-800">正確答案: <span className="text-green-600">{currentQ.answer}</span></div>
              </div>
              <div className="p-5 rounded-xl bg-[#fdf8d5] border border-yellow-200 animate-fade-in-up">
                <p className="text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-line">
                  <span className="font-bold">詳解：</span><br/>
                  {currentQ.explanation}
                </p>
              </div>
            </>
          )}
        </main>
        {showExplanation && (
          <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white to-transparent">
            <button onClick={handleNextQuestion} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg active:scale-95 transition-transform">
              {currentIndex < quizQuestions.length - 1 ? '下一題' : '查看成績'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}