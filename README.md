# 🚑 CPR 輔助教學與緊急實作系統 (CPR Web)

這是一個基於 React + Vite 開發的網頁應用程式，專為 CPR（心肺復甦術）的教學、練習與緊急狀況所設計。
本系統整合了 **Google MediaPipe Tasks API** 進行即時的人體姿態辨識（Pose Landmarker），能透過視訊鏡頭精準捕捉使用者的動作，提供即時的壓胸深度、角度計算與頻率回饋。

## ✨ 系統主要功能

1. **🏋️ CPR 實作練習**
   * 即時骨架捕捉，判斷「手肘是否打直」與「身體重心是否垂直」。
   * 內建 25 公分比例尺換算，精準偵測「壓胸深度是否達 5 公分」。
   * 110 BPM Web Audio 節拍器引導。
   * 練習結束後提供完整的「實作練習分析報告」。
2. **🚨 緊急 CPR 輔助**
   * 提供緊急「叫叫CABD」流程引導與一鍵撥打 119 功能。
   * 搭配 2 分鐘換手倒數計時器。
3. **🗺️ 附近 AED 地圖**
   * 抓取使用者 GPS 定位，介接「衛福部全國 AED 資料庫」，即時顯示方圓 3 公里內的 AED 位置並提供導航。
4. **📝 考照題庫**
   * 提供最新版 CPR 與 AED 相關知識的選擇題測驗與詳解。

---

## 🛠️ 開發環境與技術棧

* **前端框架:** React (19.x) + Vite
* **UI 樣式:** Tailwind CSS
* **AI 視覺模型:** `@mediapipe/tasks-vision` (使用 `pose_landmarker_heavy.task` 模型)
* **地圖套件:** `react-leaflet` + `leaflet`

---

## 📂 專案資料夾架構

```text
cpr-web/
├── public/                  # 靜態資源資料夾 (打包時會直接複製)
│   └── pose_landmarker_heavy.task # ⚠️ 重要：MediaPipe AI 視覺模型檔案必須放在這裡
├── src/                     # 主要程式碼資料夾 (開發核心)
│   ├── assets/              # 圖片、Icon 等靜態資源
│   ├── App.jsx              # 🌟 核心程式碼：包含所有頁面 UI、路由與 CPR 判斷邏輯
│   ├── main.jsx             # React 程式進入點 (將 App 掛載到網頁上)
│   ├── App.css              # App 專屬樣式表
│   └── index.css            # 全域樣式表 (包含 Tailwind CSS 基礎設定)
├── index.html               # 網頁進入點 (網站外殼)
├── package.json             # 專案套件清單 (npm install 的依據)與執行指令
├── vite.config.js           # Vite 打包與開發伺服器設定檔
├── eslint.config.js         # 程式碼語法檢查設定 (維持團隊 coding style)
├── .gitignore               # Git 忽略清單 (確保 node_modules, venv 等龐大檔案不會上傳)
└── README.md                # 專案說明文件 (也就是本檔案)
```
---

## 👨‍💻 組員如何加入開發？ (新手必看)

請確保你的電腦已經安裝好 **Node.js** 與 **Git**。打開終端機（Terminal 或 CMD），依照以下步驟執行：

### 1. 下載專案與環境建置
```bash
# 第一步：把雲端程式碼「複製」到自己電腦裡
git clone https://github.com/GingerLiao/cpr-web.git

# 第二步：進入專案資料夾
cd cpr-web

# 第三步：安裝所有必要套件 (⚠️ 絕對不能漏掉這步！)
npm install
```

### 2. 啟動伺服器
```bash
npm run dev
```

### 3. 手機上預覽
1. 確保你的**手機**與**電腦**連上**同一個 Wi-Fi**。
2. 執行 `npm run dev` 後，查看終端機顯示的 `Network` 網址（例如：`https://192.168.X.X:5173/`）。
3. 用手機瀏覽器（Safari 或 Chrome）輸入該網址。

---

## 💡 團隊協作的「每日黃金三步驟」

以後你們在寫扣的時候，為了避免不同人寫的東西打架（衝突），請大家養成這個好習慣：

**☀️ 每天要開始寫扣前 (先抓最新版)：**
```bash
git pull
```

**🌙 寫完扣，準備收工時 (推上雲端交班)：**
```bash
git add .
git commit -m "寫下你今天改了什麼，例如：修改了首頁按鈕顏色"
git push
```
Database password：fDPllOqNxxAqaOzW

{ id: 1, question: "有關成人 OHCA院外心跳停止「生存之鏈(Chain of survival)」排列順序，何者正確？", options: [ { key: "A", text: "1→2→3→4→6→5" }, { key: "B", text: "2→3→1→4→6→5" }, { key: "C", text: "3→1→4→2→5→6 (早期求救→高品質CPR→早期電擊→進階救命→心臟停止後照護→復原)" }, { key: "D", text: "4→2→1→3→5→6" } ], answer: "C", explanation: "成人生存之鏈順序是早期求救、早期心肺甦醒術、早期電擊治療、早期高級心臟救命術、整合之心臟停止後照護、2020年新版新增第六環復原。" },
    { id: 2, question: "在醫院外發生心跳停止的病人，所謂早期電擊是指病人倒地後，盡可能在幾分鐘內給予使用自動電擊器？", options: [ { key: "A", text: "3分鐘" }, { key: "B", text: "5分鐘" }, { key: "C", text: "6分鐘" }, { key: "D", text: "10分鐘" } ], answer: "B", explanation: "考慮到腦部細胞在心跳停止後4-6分鐘就開始損傷，使用電擊器的目標建議為院內3分鐘內，院外5分鐘內。" },
    { id: 3, question: "關於成人高品質胸部按壓的描述，下列敘述何者正確？", options: [ { key: "A", text: "以 4 公分深度無干擾的按壓" }, { key: "B", text: "胸部按壓但不須通氣" }, { key: "C", text: "按壓速率低於100 次/分鐘或高於 120 次/分鐘" }, { key: "D", text: "須讓胸部完全回彈" } ], answer: "D", explanation: "(A) 錯誤：成人胸部按壓的深度應為 5 至 6 公分。\n(B) 錯誤：在專業的「高品質 CPR」定義中，標準程序包含通氣。\n(D) 正確：每次按壓後必須讓胸部完全回彈，這是為了讓心臟在兩次按壓之間有足夠的空間重新充滿血液。" },
    { id: 4, question: "2020年版再次強調胸部按壓質量的重要性，有關按壓深度，下列何者正確？", options: [ { key: "A", text: "成人壓胸深度為「5-6公分」" }, { key: "B", text: "小孩壓胸深度為「5公分或胸廓厚度 1/3」" }, { key: "C", text: "嬰兒壓胸深度為「4公分或胸廓厚度 1/3」" }, { key: "D", text: "以上皆是" } ], answer: "D", explanation: "各年齡層的按壓深度規範：成人5-6公分，兒童至少5公分(約胸部厚度1/3)，嬰兒至少4公分(約胸部厚度1/3)。" },
    { id: 5, question: "有關 2020年版生存之鏈之敘述，下列何者正確？", options: [ { key: "A", text: "新增第六環『復原』(recovery)" }, { key: "B", text: "第六環係指對心臟停止救回者提供多方面的評估" }, { key: "C", text: "第六環也包含醫療與復健治療之全方位計畫" }, { key: "D", text: "以上皆是" } ], answer: "D", explanation: "2020年版指南將復原（Recovery）加入生存之鏈的第六環，強調出院後長期的身體、神經、認知評估與支持。" },
    { id: 6, question: "有關CPR之描述，下列何者錯誤？", options: [ { key: "A", text: "不論一或二人，操作成人循環式CPR，壓、吹比均為30:2" }, { key: "B", text: "應連續作五個循環，或每2分鐘檢查一次心律" }, { key: "C", text: "只要看起來是瀕死的喘息，就需 CPR" }, { key: "D", text: "人工呼吸吹氣時最好深吸一口氣再吹" } ], answer: "D", explanation: "吹氣時不用先深吸一口氣再吹，病患不須過量氧氣，也可避免施救者因過度換氣而頭暈。每口氣吹1秒鐘，見胸部有起伏即可。" },
    { id: 7, question: "當執行完 CPR五個循環後若心律改變，經評估脈搏己恢復，但仍無呼吸時，下列何者正確？", options: [ { key: "A", text: "快速連續給氣，每口1秒鐘" }, { key: "B", text: "維持每分鐘10次/分，約每隔6秒給一口氣" }, { key: "C", text: "擺復甦姿勢" }, { key: "D", text: "以上皆是" } ], answer: "B", explanation: "已恢復脈搏但是卻無呼吸時，不管有無進階呼吸道，皆為每分鐘10次/分的人工呼吸，每6秒鐘一口氣。" },
    { id: 8, question: "只有單一人時，下列何種情況，應先急救2 分鐘再去求救？", options: [ { key: "A", text: "溺水" }, { key: "B", text: "藥物中毒" }, { key: "C", text: "創傷病人" }, { key: "D", text: "以上皆是" } ], answer: "D", explanation: "小兒、溺水、創傷及藥物中毒常見的CPR原因是呼吸道的問題，先打開呼吸道說不定就能改善問題，所以要先急救後再去求救。" },
    { id: 9, question: "醫療上及法律上接受，終止 CPR 的時機是？", options: [ { key: "A", text: "CPR30分鐘後仍無效" }, { key: "B", text: "瞳孔對光無反應" }, { key: "C", text: "當對腦部是否完全恢復有疑問時" }, { key: "D", text: "在經過BLS及ACLS之努力，仍無適當反應時" } ], answer: "D", explanation: "終止CPR的時機沒有一定的時間標準；目前可接受的是經過CPR和ACLS努力後仍無反應時，與家屬溝通達成共識後終止。" },
    { id: 10, question: "CPR 人工呼吸時，您嘗試吹氣後患者胸部沒有起伏，下列何者不能解釋此種現象？", options: [ { key: "A", text: "未正確打開患者呼吸道" }, { key: "B", text: "口對口吹氣時有漏氣發生" }, { key: "C", text: "患者口中有異物阻塞" }, { key: "D", text: "沒有起伏是正常的，不必在意" } ], answer: "D", explanation: "吹氣後胸部沒有起伏絕非正常現象。可能是未正確打開呼吸道、漏氣或異物阻塞。" },
    { id: 11, question: "在成人高品質 CPR的 BLS 守則中，下列何者可改進胸部按壓品質？", options: [ { key: "A", text: "按壓深度越深效果越好" }, { key: "B", text: "每兩分鐘(5個週期)胸部按壓後，交換CPR提供者" }, { key: "C", text: "按壓胸骨上半部" }, { key: "D", text: "不建議每次按壓後胸部完全回彈" } ], answer: "B", explanation: "為了維持高品質的胸部按壓，避免施救者疲勞導致按壓深度與頻率下降，強烈建議每兩分鐘（約5個週期）就應交換壓胸者。" },
    { id: 12, question: "您是緊急救護員(EMT)，在病人倒下後8分鐘到達現場，請問您第一件事要做什麼？", options: [ { key: "A", text: "建立進階呼吸道" }, { key: "B", text: "先做五個循環胸部按壓" }, { key: "C", text: "趕快把病患移上救護車" }, { key: "D", text: "最短時間內接上自動體外除顫器(AED)查看是否可以去顫" } ], answer: "D", explanation: "到達現場後需盡快以 AED或心電圖監視器判讀心律看是否可以去顫電擊，去顫後盡快恢復CPR。" },
    { id: 13, question: "有關 AED 自動去顫器的使用，下列敘述何者正確？", options: [ { key: "A", text: "電擊板放在胸部任何位置，其電擊時效果都是一樣的。" }, { key: "B", text: "若病患胸前有使用藥品貼片，電擊時不需要避免接觸到貼片。" }, { key: "C", text: "去顫時為搶救生命，不須確認是否人員接觸病人。" }, { key: "D", text: "溺水病患，若需要電擊時，應將病患胸前的水擦乾再電擊。" } ], answer: "D", explanation: "電擊前要移除藥物貼布減少電阻，並拭乾胸部的水分，避免水分導電分散電流。電擊時必須確認無人接觸病患以免觸電。" },
    { id: 14, question: "AED 的操作有四項共通的流程，請問其正確先後順序為何？", options: [ { key: "A", text: "打開電源→分析心律→貼上電擊片→按下電擊按鈕" }, { key: "B", text: "打開電源→貼上電擊片→分析心律→按下電擊按鈕" }, { key: "C", text: "貼上電擊片→分析心律→打開電源→按下電擊按鈕" }, { key: "D", text: "貼上電擊片→打開電源→分析心律→按下電擊按鈕" } ], answer: "B", explanation: "AED的使用步驟為：打開電源→貼上電極片→分析心律→按下電擊按鈕。" },
    { id: 15, question: "AED電擊一次之後，下一步應如何處置？", options: [ { key: "A", text: "讓AED再分析一次心律" }, { key: "B", text: "檢查脈搏是否恢復" }, { key: "C", text: "立刻給予30:2循環之CPR，兩分鐘後AED自動會再次分析心律" }, { key: "D", text: "移除AED，等待救護人員" } ], answer: "C", explanation: "AED電擊完，應立即給予壓胸30:2循環之CPR，兩分鐘後AED 會自動再分析心律。" },
    { id: 16, question: "您將AED連接到沒有呼吸脈搏的病人。AED指示「不需要電擊」。此時應如何處置？", options: [ { key: "A", text: "重新啟動AED再次分析" }, { key: "B", text: "立刻給予2分鐘或5個循環之CPR" }, { key: "C", text: "停止CPR，擺復甦姿勢" }, { key: "D", text: "解除 AED，等待急救人員" } ], answer: "B", explanation: "針對不須電擊的心律，需盡快恢復 CPR 2分鐘後，再讓 AED判讀心律是否需要去顫。" },
    { id: 17, question: "對於有意識的嚴重呼吸道阻塞病人，適當之處理步驟為何？", options: [ { key: "A", text: "鼓勵患者用力咳嗽" }, { key: "B", text: "立刻給予哈姆立克法急救" }, { key: "C", text: "應持續做到阻塞解除或意識昏迷為止" }, { key: "D", text: "B 與 C 皆是" } ], answer: "D", explanation: "呼吸道異物阻塞時，若為嚴重阻塞（無法說話、咳嗽沒聲音）且意識清醒，應立刻給予哈姆立克法，直到異物排出或患者意識喪失為止。" },
    { id: 18, question: "肚子很大的成人呼吸道異物完全梗塞病患(如嚴重肥胖及末期懷孕)，應如何處理？", options: [ { key: "A", text: "改用拍背的方式" }, { key: "B", text: "以胸部按壓替代腹部按壓" }, { key: "C", text: "執行平躺式腹部按壓" }, { key: "D", text: "以上皆非" } ], answer: "B", explanation: "對於肥胖或末期懷孕發生完全呼吸道梗塞的患者，應以胸部按壓替代腹部按壓，直到異物排出。" },
    { id: 19, question: "當一個人倒地不起，壓胸30次後給予人工呼吸，發現吹氣後胸部沒有起伏，應考慮作何動作？", options: [ { key: "A", text: "再打開一次呼吸道，予以吹第二口氣" }, { key: "B", text: "檢查有無異物堵塞" }, { key: "C", text: "開始作哈姆立克急救術" }, { key: "D", text: "放棄吹氣，開始作心臟按摩" } ], answer: "A", explanation: "當吹氣後胸部沒有起伏時，最常見的情況是呼吸道沒有被打開，此時應該重新打開呼吸道再嘗試吹氣。" },
    { id: 20, question: "若病患裝置有心臟植入物，AED貼片該如何放置？", options: [ { key: "A", text: "貼在植入物正上方" }, { key: "B", text: "不能使用AED" }, { key: "C", text: "避免放置在植入物正上方，應距離數公分" }, { key: "D", text: "改貼在背後" } ], answer: "C", explanation: "AED貼片位置需避開放置在心臟植入物上方，以免影響電擊效果。" }