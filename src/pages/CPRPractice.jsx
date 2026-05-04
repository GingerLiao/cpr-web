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
  const [pressCount, setPressCount] = useState(0); 
  const [warningMsg, setWarningMsg] = useState("系統初始化中...");
  const [depthWarning, setDepthWarning] = useState(""); 

  const [isTraining, setIsTraining] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [facingMode, setFacingMode] = useState("environment");

  const facingModeRef = useRef("environment"); 
  const isTrainingRef = useRef(false);
  const pressCountRef = useRef(0);
  const startTimeRef = useRef(0);
  const positionStateRef = useRef("up");
  const highestYRef = useRef(1.0);
  const lowestYRef = useRef(0.0);
  const baselineShoulderYRef = useRef(null); 
  const currentPressMaxDepthRef = useRef(0.0); 
  const threshold = 0.02;

  const lastWarningTimeRef = useRef(0); 
  const lastPressTimeRef = useRef(0);
  const depthWarningRef = useRef("");
  const errorsLogRef = useRef({ armBent: 0, notVertical: 0, positionOffset: 0, notDeepEnough: 0, tooDeep: 0 });

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
    setPressCount(0); 
    errorsLogRef.current = { armBent: 0, notVertical: 0, positionOffset: 0, notDeepEnough: 0, tooDeep: 0 };
    startTimeRef.current = Date.now();
    setBpm(0);
    setTimeLeft(120);
    setWarningMsg("請開始按壓");
    setDepthWarning("");
    depthWarningRef.current = "";
    baselineShoulderYRef.current = null;
    currentPressMaxDepthRef.current = 0.0;
    
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

    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date();
    const dateStr = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    const timeStr = `${now.getHours() > 12 ? '下午' : '上午'} ${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')}`;

    let accuracy = 0;
    const totalPresses = pressCountRef.current;
    if (totalPresses > 0 && bpm > 0) {
      let bpmScore = 100;
      if (bpm < 100) bpmScore = Math.max(0, 100 - (100 - bpm) * 2);
      else if (bpm > 120) bpmScore = Math.max(0, 100 - (bpm - 120) * 2);

      const depthErrors = errorsLogRef.current.notDeepEnough + errorsLogRef.current.tooDeep;
      const depthScore = Math.max(0, 100 - (depthErrors / totalPresses) * 100);

      const positionScore = Math.max(0, 100 - (errorsLogRef.current.positionOffset / totalPresses) * 100);

      const postureErrors = errorsLogRef.current.armBent + errorsLogRef.current.notVertical;
      const postureScore = Math.max(0, 100 - (postureErrors / totalPresses) * 100);

      accuracy = Math.round(
        (bpmScore * 0.30) + 
        (depthScore * 0.35) + 
        (positionScore * 0.20) + 
        (postureScore * 0.15)
      );
    } else {
      accuracy = 0;
    }

    const recordData = {
      user_id: user?.id,
      date: dateStr,
      time: timeStr,
      accuracy: accuracy,
      count: pressCountRef.current,
      bpm: bpm,
      armBent: errorsLogRef.current.armBent,
      notVertical: errorsLogRef.current.notVertical,
      positionOffset: errorsLogRef.current.positionOffset,
      notDeepEnough: errorsLogRef.current.notDeepEnough,
      tooDeep: errorsLogRef.current.tooDeep
    };

    try {
      await supabase.from('CprRecord').insert([recordData]);
      console.log('紀錄已儲存');
    } catch (error) {
      console.error('儲存紀錄至 Supabase 失敗:', error);
    }

    navigate('/report', { state: { finalBpm: bpm, totalPresses: pressCountRef.current, errors: errorsLogRef.current, date: dateStr, time: timeStr, accuracy: accuracy, fromPractice: true } });
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
        setWarningMsg("請將雙方對準人體輪廓...");
        
        navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "environment" } })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
            }
          })
          .catch((err) => {
            console.error("相機權限遭拒或錯誤:", err);
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
              
              if (baselineShoulderYRef.current === null || midShoulder.y < baselineShoulderYRef.current) {
                baselineShoulderYRef.current = midShoulder.y;
              }
              
              const isInTargetBox = midShoulder.x >= 0.3 && midShoulder.x <= 0.7 && midShoulder.y >= 0.25 && midShoulder.y <= 0.65;
              const now= Date.now();

             if (!isInTargetBox) {
                if (now - lastWarningTimeRef.current > 500) {
                  setWarningMsg("請對準虛線框");
                  lastWarningTimeRef.current = now;
                }
              } else {
                let errors = [];
                let isArmBent = calculateAngle(ls, landmarks[13], lw) < 160 || calculateAngle(rs, landmarks[14], rw) < 160;
                let isNotVertical = centerVertAngle < 80 || centerVertAngle > 100;
                let isOffset = Math.abs(midWrist.x - midShoulder.x) > 0.15;

                if (isArmBent) errors.push("手肘請打直");
                if (isNotVertical) errors.push("重心未垂直");
                if (isOffset) errors.push("未垂直按壓")

                const newMsg = errors.length > 0 ? errors.join(" | ") : "姿勢完美，請保持！";

                if (now - lastWarningTimeRef.current > 500) {
                  setWarningMsg(newMsg);
                  lastWarningTimeRef.current = now;
                }

                const currentShoulderY = midShoulder.y;
                const shoulderWidth = Math.hypot((ls.x - rs.x) * w, (ls.y - rs.y) * h);

                if (positionStateRef.current === "up") {
                  if (currentShoulderY < highestYRef.current) highestYRef.current = currentShoulderY;
                  if (currentShoulderY > highestYRef.current + threshold) { 
                    positionStateRef.current = "down"; 
                    lowestYRef.current = currentShoulderY; 
                  }
                } else if (positionStateRef.current === "down") {
                  if (currentShoulderY > lowestYRef.current) lowestYRef.current = currentShoulderY;
                  if (currentShoulderY < lowestYRef.current - threshold) {
                    positionStateRef.current = "up";
                    
                    let pressDepth = (lowestYRef.current - highestYRef.current) * h;
                    highestYRef.current = currentShoulderY;

                    if (now - lastPressTimeRef.current > 250) { 
                        lastPressTimeRef.current = now;
                        
                        pressCountRef.current += 1;
                        setPressCount(pressCountRef.current);

                        if (typeof errorsLogRef !== 'undefined' && errorsLogRef.current) {
                          if (isArmBent) errorsLogRef.current.armBent += 1;
                          if (isNotVertical) errorsLogRef.current.notVertical += 1;
                          if (isOffset) errorsLogRef.current.positionOffset += 1;
                        }

                        let ratio = shoulderWidth > 0 ? (pressDepth / shoulderWidth) : 0;
                        let msg = "";
                        if (ratio < 0.12){ 
                          if (typeof errorsLogRef !== 'undefined' && errorsLogRef.current) {
                            errorsLogRef.current.notDeepEnough += 1;
                          }
                          msg = `深度不足! (比例: ${ratio.toFixed(2)})`;
                        } else if (ratio > 0.20) {
                          if (typeof errorsLogRef !== 'undefined' && errorsLogRef.current) {
                            errorsLogRef.current.tooDeep += 1; 
                          }
                          msg = `按壓過深! (比例: ${ratio.toFixed(2)})`;
                        } else {
                          msg = `深度良好! (比例: ${ratio.toFixed(2)})`;
                        }
                        setDepthWarning(msg);
                        depthWarningRef.current = msg;
                        
                        const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
                        if (elapsedTime > 3) { 
                           setBpm(Math.floor((pressCountRef.current / elapsedTime) * 60));
                        }
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

          if (isTrainingRef.current && depthWarningRef.current !== "") {
            canvasCtx.font = `bold ${26 * S}px sans-serif`;
            canvasCtx.fillStyle = depthWarningRef.current.includes("良好") ? "#00FF00" : "#FF0000";
            canvasCtx.fillText(depthWarningRef.current, centerX, patientY + 100 * S);
          }

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
    <div className="bg-black h-[100dvh] overflow-hidden flex justify-center font-sans">
      <div className="w-full max-w-md bg-black h-[100dvh] relative flex flex-col overflow-hidden">
        
        <video ref={videoRef} className="hidden" playsInline></video>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover"></canvas>

        <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-20 pointer-events-none">
          <button 
            onClick={() => navigate(-1)} 
            className="pointer-events-auto bg-black/50 text-white w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-sm active:scale-90 transition-transform shadow-lg border border-white/20"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>

          <div className="pointer-events-auto bg-black/60 backdrop-blur-md rounded-2xl px-5 py-2 flex gap-5 text-white shadow-lg border border-white/10 mt-1">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-300 font-medium">速率</span>
              <span className={`text-lg font-black ${bpm >= 100 && bpm <= 120 ? 'text-green-400' : 'text-indigo-400'}`}>{bpm}</span>
            </div>
            <div className="w-px bg-white/20 my-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-300 font-medium">次數</span>
              <span className="text-lg font-black text-blue-400">{pressCount}</span>
            </div>
            <div className="w-px bg-white/20 my-1"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-gray-300 font-medium">倒數</span>
              <span className="text-lg font-black text-red-400">{formatTime(timeLeft)}</span>
            </div>
          </div>
          
          <button 
            onClick={switchCamera} 
            className="pointer-events-auto bg-black/50 text-white w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-sm active:scale-90 transition-transform shadow-lg border border-white/20"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none w-[80%] max-w-sm">
          <div className={`px-4 py-2 rounded-full flex items-center justify-center gap-2 text-sm font-bold shadow-lg text-white backdrop-blur-md transition-colors 
            ${!isTraining ? 'bg-gray-800/80' : warningMsg.includes("完美") ? 'bg-green-500/80' : 'bg-red-500/80'}`}>
            <div className={`w-2 h-2 rounded-full ${isTraining ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="tracking-wider">{warningMsg}</span>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-[85%] max-w-sm z-20">
          {!isTraining ? (
            <button onClick={handleStartTraining} className="w-full bg-[#6B908F] text-white font-bold text-lg py-4 rounded-xl shadow-lg active:scale-95 transition-transform border border-teal-600/30">
              開始練習
            </button>
          ) : (
            <button onClick={handleStopTraining} className="w-full bg-red-500/90 backdrop-blur-sm text-white font-bold text-base py-3.5 rounded-full shadow-2xl active:scale-95 transition-transform border border-red-400/30">
              結束訓練
            </button>
          )}
        </div>
      </div>
    </div>
  );
}