import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { supabase } from '../supabaseClient';
import { calculateAngle, calculateCenterVerticalAngle, TARGET_BPM } from '../utils/helpers';

export default function CPRPractice() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null); 

  const poseLandmarkerRef = useRef(null);
  const requestRef = useRef(null);

  const [bpm, setBpm] = useState(0);
  const [warningMsg, setWarningMsg] = useState("系統初始化中...");

  const [isTraining, setIsTraining] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [facingMode, setFacingMode] = useState("environment");
  const [shoulderWidthCm, setShoulderWidthCm] = useState(null);
  const shoulderWidthCmRef = useRef(null);
  
  // ✅ 新增：用來顯示分析中的過場動畫
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const facingModeRef = useRef("environment"); 
  const isTrainingRef = useRef(false);
  const pressCountRef = useRef(0);
  const startTimeRef = useRef(0);
  const positionStateRef = useRef("up");
  const highestYRef = useRef(1.0);
  const lowestYRef = useRef(0.0);
  const highestWristYRef = useRef(1.0);
  const lowestWristYRef = useRef(0.0);
  const lockedShoulderWidthPxRef = useRef(0);
  const bentFrameCountRef = useRef(0);
  const deepestPostureRef = useRef({ isArmBent: false, isNotVertical: false, isOffset: false });
  const threshold = 0.015;

  const lastWarningTimeRef = useRef(0);
  const lastPressTimeRef = useRef(0);
  const bpmRef = useRef(0);
  const errorsLogRef = useRef({ armBent: 0, notVertical: 0, positionOffset: 0, depthTooShallow: 0, depthTooDeep: 0 });

  const switchCamera = async () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    facingModeRef.current = newMode;
    
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720, facingMode: newMode } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("切換鏡頭失敗:", err);
      alert("無法切換鏡頭");
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(err => console.log(err));
      }
    };
  }, []);

  useEffect(() => {
    async function loadShoulderWidth() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user?.user_metadata?.shoulder_width_cm) {
          const val = Number(data.user.user_metadata.shoulder_width_cm);
          setShoulderWidthCm(val);
          shoulderWidthCmRef.current = val;
        }
      } catch (err) {
        console.error('載入肩膀寬度失敗:', err);
      }
    }
    loadShoulderWidth();
  }, []);

  useEffect(() => {
    let interval;
    if (isTraining && audioCtxRef.current) {
      interval = setInterval(() => {
        if (audioCtxRef.current.state === 'running') {
          const osc = audioCtxRef.current.createOscillator();
          const gainNode = audioCtxRef.current.createGain();
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, audioCtxRef.current.currentTime);
          
          gainNode.gain.setValueAtTime(1, audioCtxRef.current.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.1);
          
          osc.connect(gainNode);
          gainNode.connect(audioCtxRef.current.destination);
          osc.start(audioCtxRef.current.currentTime);
          osc.stop(audioCtxRef.current.currentTime + 0.1);
        }
      }, (60 / TARGET_BPM) * 1000);
    }
    return () => clearInterval(interval);
  }, [isTraining]);

  useEffect(() => {
    let timer;
    if (isTraining && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isTraining) {
      handleStopTraining();
    }
    return () => clearInterval(timer);
  }, [isTraining, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStartTraining = () => {
    const element = document.documentElement; 
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) { 
      element.webkitRequestFullscreen();
    }

    setIsTraining(true);
    isTrainingRef.current = true;
    pressCountRef.current = 0;
    bpmRef.current = 0;
    errorsLogRef.current = { armBent: 0, notVertical: 0, positionOffset: 0, depthTooShallow: 0, depthTooDeep: 0 };
    startTimeRef.current = Date.now();
    setBpm(0);
    setTimeLeft(120);
    setWarningMsg("請開始按壓");
    positionStateRef.current = "up";
    highestYRef.current = 1.0;
    lowestYRef.current = 0.0;
    highestWristYRef.current = 1.0;
    lowestWristYRef.current = 0.0;
    deepestPostureRef.current = { isArmBent: false, isNotVertical: false, isOffset: false };
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  };

  const handleStopTraining = async () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }

    setIsTraining(false);
    isTrainingRef.current = false;
    setIsAnalyzing(true); // 開啟分析載入畫面

    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
    } catch (authErr) {
      console.error('getUser 失敗:', authErr);
    }
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours() >= 12 ? '下午' : '上午'} ${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')}`;

    let accuracy = 0;
    const totalPresses = pressCountRef.current;
    const finalBpm = bpmRef.current;
    if (totalPresses > 0 && finalBpm > 0) {
      let bpmScore = 100;
      if (finalBpm < 100) bpmScore = Math.max(0, 100 - (100 - finalBpm) * 2);
      else if (finalBpm > 120) bpmScore = Math.max(0, 100 - (finalBpm - 120) * 2);

      const depthErrors = errorsLogRef.current.depthTooShallow + errorsLogRef.current.depthTooDeep;
      const depthScore = Math.max(0, 100 - (depthErrors / totalPresses) * 100);
      const postureScore = Math.max(0, 100 - ((errorsLogRef.current.armBent + errorsLogRef.current.notVertical) / totalPresses) * 100);
      const positionScore = Math.max(0, 100 - (errorsLogRef.current.positionOffset / totalPresses) * 100);

      accuracy = Math.round(
        (bpmScore    * 0.40) +
        (depthScore  * 0.40) +
        (postureScore * 0.15) +
        (positionScore * 0.05)
      );
    }

    // ✅ 步驟 1：在此直接分析建議 (不扣不必要的 Token)
    let finalAdvice = "";
    const totalErrors = errorsLogRef.current.armBent + errorsLogRef.current.notVertical + errorsLogRef.current.positionOffset + errorsLogRef.current.depthTooShallow + errorsLogRef.current.depthTooDeep;

    if (totalPresses === 0 && totalErrors === 0 && accuracy === 0) {
      finalAdvice = '未能準確偵測動作，請再練習一次';
    } else if (accuracy === 100 || totalErrors === 0) {
      finalAdvice = '您的按壓姿勢與頻率都非常完美，符合急救標準，請繼續保持！';
    } else {
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-cpr-advice', {
          body: {
            results: {
              accuracy: accuracy,
              totalPresses: totalPresses,
              finalBpm: finalBpm,
              errors: errorsLogRef.current
            }
          }
        });
        if (!aiError && aiData) {
          finalAdvice = aiData.advice;
        } else {
          finalAdvice = '分析系統暫時無法連線，建議稍後至歷史紀錄查看。';
        }
      } catch (err) {
        finalAdvice = '分析系統暫時無法連線，建議稍後至歷史紀錄查看。';
      }
    }

    const reportState = {
      aiAdvice: finalAdvice,
      finalBpm: finalBpm,
      totalPresses: pressCountRef.current,
      errors: { ...errorsLogRef.current },
      date: dateStr,
      time: timeStr,
      accuracy: accuracy,
      fromPractice: true
    };

    if (!user) {
      setIsAnalyzing(false);
      navigate('/report', { state: reportState });
      return;
    }

    const recordData = {
      user_id: user.id,
      date: dateStr,
      time: timeStr,
      accuracy: accuracy,
      count: pressCountRef.current,
      bpm: finalBpm,
      armBent: errorsLogRef.current.armBent,
      notVertical: errorsLogRef.current.notVertical,
      positionOffset: errorsLogRef.current.positionOffset,
      depthTooShallow: errorsLogRef.current.depthTooShallow,
      depthTooDeep: errorsLogRef.current.depthTooDeep,
      ai_advice: finalAdvice
    };

    try {
      const { data, error } = await supabase.from('CprRecord').insert([recordData]).select();
      if (error) throw error;

      const newRecordId = data && data.length > 0 ? data[0].id : null;
      setIsAnalyzing(false);
      navigate('/report', { state: { ...reportState, id: newRecordId } });

    } catch (error) {
      console.error('儲存失敗，詳細錯誤:', error);
      setIsAnalyzing(false);
      alert(`練習紀錄儲存失敗\n錯誤：${error?.message || JSON.stringify(error)}\n\n請截圖此訊息回報問題。`);
      navigate('/report', { state: reportState });
    }
  };

  useEffect(() => {
    let lastVideoTime = -1;
    let canvasCtx = null;
    let drawingUtils = null;

    const initializeMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
        );
        poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/pose_landmarker_full.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numPoses: 1
        });
        setWarningMsg("請對齊虛線框");
        
        navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "environment" } })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
            }
          })
          .catch((err) => {
            console.error("相機權限遭拒:", err);
            setWarningMsg("請允許相機權限！");
          });

      } catch (error) {
        console.error("模型載入失敗:", error);
      }
    };
    initializeMediaPipe();

    const renderLoop = () => {
      const videoElement = videoRef.current;
      const canvasElement = canvasRef.current;
      
      if (videoElement && videoElement.readyState >= 2 && poseLandmarkerRef.current && canvasElement) {
        if (!canvasCtx) {
          canvasCtx = canvasElement.getContext('2d');
          drawingUtils = new DrawingUtils(canvasCtx);
        }

        if (lastVideoTime !== videoElement.currentTime) {
          lastVideoTime = videoElement.currentTime;
          let startTimeMs = performance.now();
          const results = poseLandmarkerRef.current.detectForVideo(videoElement, startTimeMs);

          canvasElement.width = videoElement.videoWidth;
          canvasElement.height = videoElement.videoHeight;
          const w = canvasElement.width;
          const h = canvasElement.height;

          canvasCtx.save();
          canvasCtx.clearRect(0, 0, w, h);
          
          if (facingModeRef.current === 'user') {
            canvasCtx.translate(w, 0);
            canvasCtx.scale(-1, 1);
          }
          
          canvasCtx.drawImage(videoElement, 0, 0, w, h);

          if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const TARGET_LANDMARKS = [11, 12, 13, 14, 15, 16, 23, 24]
            const UPPER_BODY_CONNECTIONS = [
              { start: 11, end: 12 }, { start: 11, end: 13 }, { start: 13, end: 15 },
              { start: 12, end: 14 }, { start: 14, end: 16 }, { start: 11, end: 23 },
              { start: 12, end: 24 }, { start: 23, end: 24 }
            ];

            landmarks.forEach((lm, index) => {
              if (!TARGET_LANDMARKS.includes(index)) { if (lm) lm.visibility = 0; }
            });

            drawingUtils.drawConnectors(landmarks, UPPER_BODY_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
            const pointsToDraw = TARGET_LANDMARKS.map(index => landmarks[index]).filter(Boolean);
            drawingUtils.drawLandmarks(pointsToDraw, { color: '#FF0000', lineWidth: 2, radius: 3 });

            const ls = landmarks[11], rs = landmarks[12], lw = landmarks[15], rw = landmarks[16];

            if (isTrainingRef.current && ls && lw && (ls.visibility || 1) > 0.5 && (lw.visibility || 1) > 0.5) {
              const { angle: centerVertAngle, midShoulder, midWrist } = calculateCenterVerticalAngle(ls, rs, lw, rw);

              const isInTargetBox = midShoulder.x >= 0.3 && midShoulder.x <= 0.7 && midShoulder.y >= 0.2 && midShoulder.y <= 0.75;
              const now= Date.now();

             if (!isInTargetBox) {
                if (now - lastWarningTimeRef.current > 500) {
                  setWarningMsg("請對準虛線框");
                  lastWarningTimeRef.current = now;
                }
              } else {
                const shoulderWidth = Math.abs(ls.x - rs.x);
                let errors = [];
                const midShoulder = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2, z: (ls.z + rs.z) / 2 };
                const midWrist = { x: (lw.x + rw.x) / 2, y: (lw.y + rw.y) / 2, z: (lw.z + rw.z) / 2 };
                let isArmBent = calculateAngle(ls, landmarks[13], lw, w, h) < 160 || calculateAngle(rs, landmarks[14], rw, w, h) < 160;
                let isNotVertical = (midShoulder.z - midWrist.z) > 0.15;
                let isOffset = Math.abs(midWrist.x - midShoulder.x) > (shoulderWidth * 0.40);

                if (isArmBent) errors.push("手肘未打直");
                if (isNotVertical) errors.push("身體前傾不足");
                if (isOffset) errors.push("按壓位置偏移");

                if (now - lastWarningTimeRef.current > 500 && errors.length > 0) {
                  setWarningMsg(errors.join(" | "));
                  lastWarningTimeRef.current = now;
                }

                const currentShoulderY = midShoulder.y;
                const currentWristY = midWrist.y;

                if (positionStateRef.current === "up") {
                  if (currentShoulderY < highestYRef.current) {
                    highestYRef.current = currentShoulderY;
                    if (lockedShoulderWidthPxRef.current === 0) {
                      lockedShoulderWidthPxRef.current = Math.abs(ls.x - rs.x) * w;
                    }
                  }
                  if (currentWristY < highestWristYRef.current) highestWristYRef.current = currentWristY;
                  if (currentShoulderY > highestYRef.current + threshold) {
                    positionStateRef.current = "down";
                    lowestYRef.current = currentShoulderY;
                    lowestWristYRef.current = currentWristY;
                    deepestPostureRef.current = { isArmBent: false, isNotVertical: false, isOffset: false };
                    bentFrameCountRef.current = 0;
                  }
                } else if (positionStateRef.current === "down") {
                  if (currentShoulderY > lowestYRef.current) lowestYRef.current = currentShoulderY;
                  if (currentWristY > lowestWristYRef.current) lowestWristYRef.current = currentWristY;
                  if (isArmBent) bentFrameCountRef.current += 1;
                  if (isNotVertical) deepestPostureRef.current.isNotVertical = true;
                  if (isOffset) deepestPostureRef.current.isOffset = true;
                  if (currentShoulderY < lowestYRef.current - threshold) {

                    const pressDepthPx = (lowestWristYRef.current - highestWristYRef.current) * h;
                    positionStateRef.current = "up";
                    highestYRef.current = currentShoulderY;
                    highestWristYRef.current = currentWristY;

                    pressCountRef.current += 1;

                    const bentAtBottom = bentFrameCountRef.current >= 3;
                    const { isNotVertical: notVerticalAtBottom, isOffset: offsetAtBottom } = deepestPostureRef.current;

                    let depthIssue = null;

                    if (shoulderWidthCmRef.current) {
                      const shoulderWidthPx = lockedShoulderWidthPxRef.current;

                      if (shoulderWidthPx > 0) {
                        const roundedDepth = Math.round((pressDepthPx / (shoulderWidthPx / shoulderWidthCmRef.current)) * 10) / 10;
                        if (roundedDepth < 5.0) depthIssue = "按壓過淺";
                        else if (roundedDepth > 6.0) depthIssue = "按壓過深";
                      }
                    }

                    if (bentAtBottom) errorsLogRef.current.armBent += 1;
                    if (notVerticalAtBottom) errorsLogRef.current.notVertical += 1;
                    if (offsetAtBottom) errorsLogRef.current.positionOffset += 1;
                    if (depthIssue === "按壓過淺") errorsLogRef.current.depthTooShallow += 1;
                    if (depthIssue === "按壓過深") errorsLogRef.current.depthTooDeep += 1;

                    const bottomErrors = [
                      bentAtBottom && "手肘未打直",
                      notVerticalAtBottom && "身體前傾不足",
                      offsetAtBottom && "按壓位置偏移",
                    ].filter(Boolean);

                    const allErrors = [...bottomErrors];
                    if (depthIssue) allErrors.push(depthIssue);
                    setWarningMsg(allErrors.length > 0 ? allErrors.join(' | ') : '姿勢完美！');
                    lastWarningTimeRef.current = now;

                    const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
                    if (elapsedTime > 3) {
                      const newBpm = Math.floor((pressCountRef.current / elapsedTime) * 60);
                      bpmRef.current = newBpm;
                      setBpm(newBpm);
                    }
                  }
                }
              }

              canvasCtx.beginPath();
              canvasCtx.moveTo(midShoulder.x * w, midShoulder.y * h);
              canvasCtx.lineTo(midWrist.x * w, midWrist.y * h);
              canvasCtx.strokeStyle = "#FFFF00";
              canvasCtx.lineWidth = 5;
              canvasCtx.stroke();
            }
          }
          canvasCtx.restore();

          canvasCtx.save();
          const S = h / 780; 
          canvasCtx.lineWidth = 6 * S; 
          canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.5)"; 
          canvasCtx.setLineDash([12 * S, 10 * S]);
          
          const centerX = w * 0.5;
          const rescuerHeadY = h * 0.35; 
          const patientY = rescuerHeadY + 300 * S;
          
          canvasCtx.beginPath();
          canvasCtx.arc(centerX - 130 * S, patientY, 42 * S, 0, 2 * Math.PI);
          canvasCtx.stroke();
          
          canvasCtx.beginPath();
          canvasCtx.moveTo(centerX - 85 * S, patientY - 26 * S);
          canvasCtx.lineTo(centerX + 160 * S, patientY - 26 * S);
          canvasCtx.moveTo(centerX - 85 * S, patientY + 26 * S);
          canvasCtx.lineTo(centerX + 160 * S, patientY + 26 * S);
          canvasCtx.stroke();

          canvasCtx.beginPath();
          canvasCtx.arc(centerX, rescuerHeadY, 60 * S, 0, 2 * Math.PI);
          canvasCtx.stroke();
          
          canvasCtx.beginPath();
          canvasCtx.moveTo(centerX - 50 * S, rescuerHeadY + 45 * S);
          canvasCtx.lineTo(centerX - 90 * S, rescuerHeadY + 130 * S);
          canvasCtx.lineTo(centerX - 90 * S, patientY - 26 * S); 
          canvasCtx.moveTo(centerX + 50 * S, rescuerHeadY + 45 * S);
          canvasCtx.lineTo(centerX + 90 * S, rescuerHeadY + 130 * S);
          canvasCtx.lineTo(centerX + 90 * S, patientY - 26 * S);
          canvasCtx.stroke();
          
          canvasCtx.beginPath();
          canvasCtx.lineWidth = 4 * Math.max(1, S); 
          canvasCtx.moveTo(centerX - 90 * S, rescuerHeadY + 130 * S); 
          canvasCtx.lineTo(centerX - 10 * S, patientY - 26 * S);     
          canvasCtx.moveTo(centerX + 90 * S, rescuerHeadY + 130 * S); 
          canvasCtx.lineTo(centerX + 10 * S, patientY - 26 * S);     
          canvasCtx.stroke();

          canvasCtx.setLineDash([]); 
          canvasCtx.fillStyle = "rgba(100, 255, 100, 0.6)"; 
          canvasCtx.beginPath();
          canvasCtx.arc(centerX, patientY, 28 * S, 0, 2 * Math.PI);
          canvasCtx.fill();
          
          canvasCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          canvasCtx.lineWidth = 4 * Math.max(1, S);
          canvasCtx.stroke();

          canvasCtx.font = `bold ${18 * S}px sans-serif`;
          canvasCtx.fillStyle = "rgba(255, 80, 80, 0.9)";
          canvasCtx.textAlign = "center";
          canvasCtx.fillText("按壓位置", centerX, patientY + 60 * S);

          canvasCtx.restore();
        }
      }
      requestRef.current = requestAnimationFrame(renderLoop);
    };

    if (videoRef.current) {
      videoRef.current.addEventListener('loadeddata', renderLoop);
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadeddata', renderLoop);
        if (videoRef.current.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
      }
      if (poseLandmarkerRef.current) poseLandmarkerRef.current.close();
    };
  }, []);

  return (
    <div className="bg-black h-[100dvh] overflow-hidden flex justify-center font-sans relative">
      <div className="w-full max-w-md bg-black h-[100dvh] relative flex flex-col overflow-hidden">
        
        <video ref={videoRef} className="hidden" playsInline></video>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover"></canvas>

        <div className="absolute top-0 left-0 w-full pt-12 px-6 pb-4 flex justify-between items-center z-20 pointer-events-none">
          <button 
            onClick={() => navigate(-1)} 
            className="pointer-events-auto bg-black/40 text-white w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm active:scale-90 transition-transform shadow-lg border border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          
          <button 
            onClick={switchCamera} 
            className="pointer-events-auto bg-black/40 text-white w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm active:scale-90 transition-transform shadow-lg border border-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none w-[90%] max-w-sm flex flex-col gap-3 items-center">
          <div className={`px-8 py-2 rounded-full flex items-center justify-center gap-3 text-xl font-black shadow-lg text-white backdrop-blur-md transition-colors 
            ${!isTraining ? 'bg-gray-800/80' : warningMsg.includes("完美") ? 'bg-green-500/80' : 'bg-red-500/80'}`}>
            <div className={`w-3 h-3 rounded-full ${isTraining ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="tracking-wider">{warningMsg}</span>
          </div>
        </div>

        <div className="absolute bottom-8 left-0 w-full px-6 flex justify-between items-center z-20 pointer-events-none gap-3">
          <div className="pointer-events-auto bg-black/40 backdrop-blur-md rounded-full px-5 py-3 flex items-center justify-center text-white shadow-lg border border-white/10 w-36">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse mr-2.5"></span>
            <span className="text-base font-bold text-rose-400 font-mono tracking-wider">{formatTime(timeLeft)}</span>
          </div>

          <div className="pointer-events-auto">
            {!isTraining ? (
              <button onClick={handleStartTraining} className="bg-[#6B908F]/90 backdrop-blur-sm text-white font-bold text-sm px-6 py-3 rounded-full shadow-2xl active:scale-95 transition-transform border border-teal-600/30 flex items-center gap-2 w-36">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <polygon points="6,4 16,10 6,16" />
                </svg>
                開始練習
              </button>
            ) : (
              <button onClick={handleStopTraining} className="bg-rose-500/90 backdrop-blur-sm text-white font-bold text-sm px-6 py-3 rounded-full shadow-2xl active:scale-95 transition-transform border border-rose-400/30 flex items-center gap-2 w-36">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="5" y="5" width="10" height="10" />
                </svg>
                結束練習
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ✅ 新增：AI 分析中的載入畫面 */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[999] flex flex-col items-center justify-center text-white animate-fade-in">
           <div className="w-16 h-16 border-4 border-[#E09E75] border-t-transparent rounded-full animate-spin mb-6"></div>
           <h2 className="text-xl font-bold tracking-wider mb-2">正在分析您的 CPR 練習數據...</h2>
        </div>
      )}
    </div>
  );
}