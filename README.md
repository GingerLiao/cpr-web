# 🚑 CPR 輔助教學與緊急實作系統 (CPR Web)

這是一個基於 React + Vite 開發的網頁應用程式，專為 CPR（心肺復甦術）的教學、練習與緊急狀況所設計。
本系統整合 **Google MediaPipe Tasks API** 進行即時人體姿態辨識（Pose Landmarker），透過視訊鏡頭捕捉使用者動作，提供即時的按壓深度、姿勢與頻率回饋。

## ✨ 系統主要功能

1. **🏋️ CPR 實作練習**
   * **自動肩寬校正**：開始練習後先偵測直立姿勢，用 MediaPipe 的 `worldLandmarks`（公尺為單位的 3D 座標）自動量測肩寬，作為深度換算的基準，使用者無需手動輸入任何身體數據。
   * **即時姿勢判定**：手肘未打直、身體前傾不足、按壓位置偏移，三項各自獨立判定，並以連續 3 幀為門檻濾除單幀抖動造成的誤判。
   * **按壓深度偵測**：以手腕垂直位移量搭配肩寬比例尺換算為公分，對照 AHA 建議的 5–6 公分標準。比例尺取「前 5 次按壓最高點」的肩寬像素中位數，確保量測時的身體前傾角度與實際按壓時一致。
   * **頻率引導**：110 BPM Web Audio 節拍器，並可開關語音教練即時提示姿勢錯誤。
   * **2 分鐘計時**：自偵測到第一下按壓才開始倒數，走到定位的時間不計入，避免拉低平均頻率。
   * 練習結束後產生「實作練習分析報告」並上傳雲端。
2. **🚨 緊急 CPR 輔助**
   * 「叫叫CD」四步驟流程引導，並在求救步驟提供一鍵撥打 119。
   * **顯示目前位置**：自動反查並以台灣慣用格式（縣市→區→路→號）顯示地址，另附經緯度，方便向勤務中心報案。
   * 可開啟相機輔助按壓，偵測邏輯與練習模式完全一致（不計分、不留存紀錄）。
3. **🗺️ 附近 AED 地圖**
   * 抓取 GPS 定位，介接「衛福部全國 AED 資料庫」，顯示方圓 **300 公尺**內的 AED 位置並提供 Google 導航連結。
   * 若 300 公尺內沒有 AED，會自動擴大搜尋（1 → 3 → 10 公里）並顯示最近的一台與其距離。
4. **📝 考照題庫**
   * 自雲端題庫隨機抽取 20 題進行測驗，作答後提供正確答案與詳解。
5. **📊 歷史紀錄與 AI 分析**
   * 雲端保存歷次 CPR 練習與題庫測驗成績，以折線圖呈現準確率趨勢，並統計題庫掌握度。
   * 透過 Supabase Edge Function（`generate-cpr-advice`）依實際數據產生個人化的改善建議。
6. **👤 帳號與訪客模式**
   * 支援 Supabase 帳號登入；亦可以訪客身分直接使用，但成績不會上傳雲端。

---

## 🛠️ 開發環境與技術棧

* **前端框架:** React (19.x) + Vite
* **UI 樣式:** Tailwind CSS (4.x)
* **AI 視覺模型:** `@mediapipe/tasks-vision`（使用 `pose_landmarker_full.task` 模型）
* **地圖套件:** `react-leaflet` + `leaflet`
* **後端服務:** Supabase（Auth、Database、Edge Functions）
* **語音與音訊:** Web Speech API（語音教練）+ Web Audio API（節拍器）
* **PWA:** `vite-plugin-pwa`

### ☁️ Supabase 資料表

| 資料表 | 用途 |
| --- | --- |
| `CprRecord` | CPR 練習紀錄（準確率、按壓次數、BPM、各項錯誤次數、AI 建議） |
| `QuizRecord` | 題庫測驗紀錄（分數、答對題數、作答明細） |
| `QuestionBank` | 考照題庫題目 |
| `AedLocation` | 全國 AED 位置資料 |

---

## 📂 專案資料夾架構
```text
cpr-web/
├── public/                       # 🌐 公開靜態資源
│   ├── pose_landmarker_full.task # MediaPipe 姿態辨識模型
│   ├── mascot/                   # 吉祥物圖片
│   ├── pwa-192x192.png           # PWA 圖示
│   ├── pwa-512x512.png
│   ├── pwa-maskable-512x512.png
│   ├── apple-touch-icon.png
│   ├── favicon-16x16.png / favicon-32x32.png
│   └── vite.svg
│
├── src/
│   ├── components/
│   │   └── Mascot.jsx            # 吉祥物元件
│   │
│   ├── assets/                   # 🖼️ 需打包的靜態資源 (圖片、SVG)
│   │
│   ├── pages/                    # 📄 頁面
│   │   ├── Home.jsx              # 首頁 (主導航與帳號 Modal)
│   │   ├── AEDMap.jsx            # 附近 AED 尋找地圖
│   │   ├── EmergencyCPR.jsx      # 緊急 CPR 引導頁 (叫叫CD流程、撥打119、顯示所在地址)
│   │   ├── EmergencyCamera.jsx   # 緊急鏡頭輔助 (即時姿勢回饋，不計分)
│   │   ├── CPRPractice.jsx       # 日常 CPR 練習 (姿態偵測、計分與紀錄)
│   │   ├── CPRReport.jsx         # 實作練習分析報告 (單次成績與 AI 建議)
│   │   ├── CPRQuiz.jsx           # 考照題庫測驗 (隨機出題系統)
│   │   └── HistoryRecord.jsx     # 歷史雲端紀錄 (整合圖表與列表)
│   │
│   ├── utils/                    # 🛠️ 共用工具與常數區
│   │   ├── helpers.js            # 演算法 (角度計算、距離計算)、常數 (TARGET_BPM)、地圖 Icon
│   │   └── voiceCoach.js         # 語音教練 (排隊、冷卻、避免重複播報)
│   │
│   ├── Login.jsx                 # 🔑 登入與訪客驗證頁面
│   ├── App.jsx                   # 🚦 總路由與登入狀態守門員
│   ├── main.jsx                  # 🚀 React 應用程式進入點
│   ├── supabaseClient.js         # 🗄️ Supabase 資料庫連線設定
│   │
│   ├── App.css
│   └── index.css
│
├── .env                          # 🔐 環境變數 (存放 Supabase URL & API Keys)
├── package.json                  # 📦 專案套件與依賴清單
├── vite.config.js                # ⚙️ Vite 打包工具設定檔 (含 PWA 與 HTTPS 設定)
└── eslint.config.js              # 👮 程式碼語法檢查設定
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

### 2. 設定環境變數

在專案根目錄建立 `.env` 檔，填入 Supabase 的連線資訊（可向組長索取）：

```bash
VITE_SUPABASE_URL=你的_supabase_專案網址
VITE_SUPABASE_ANON_KEY=你的_supabase_anon_key
```

> ⚠️ `.env` 已列入 `.gitignore`，請勿把金鑰提交上 GitHub。

### 3. 啟動伺服器
```bash
npm run dev
```

### 4. 手機上預覽
1. 確保你的**手機**與**電腦**連上**同一個 Wi-Fi**。
2. 執行 `npm run dev` 後，查看終端機顯示的 `Network` 網址（例如：`https://192.168.X.X:5173/`）。
3. 用手機瀏覽器（Safari 或 Chrome）輸入該網址。

> 💡 專案使用 `@vitejs/plugin-basic-ssl` 提供 HTTPS，因為**相機與 GPS 權限只在 HTTPS 下才會開放**。由於是自簽憑證，手機第一次連線會出現「連線不是私人連線」警告，點「進階 → 繼續前往」即可，屬正常現象。


---

## 📱 加入手機主畫面（像 App 一樣使用，不用輸入網址）

本專案已透過 `vite-plugin-pwa` 設定為 **PWA（漸進式網頁應用）**，正式部署（HTTPS 網域）後，使用者只需操作一次「加入主畫面」，之後就能像原生 App 一樣直接點圖示開啟，不必再輸入網址、也不會看到瀏覽器網址列。

### iPhone（Safari）
1. 用 Safari 開啟網站網址。
2. 點下方「分享」圖示 → 選擇「加入主畫面」。
3. 完成後桌面會出現 App 圖示，點擊即可全螢幕啟動。

### Android（Chrome）
1. 用 Chrome 開啟網站網址，畫面下方會自動跳出「加入主畫面」/「安裝應用程式」提示（也可從右上角選單手動選擇）。
2. 點擊「安裝」，App 圖示會加入主畫面與應用程式清單。

> ⚠️ 注意：PWA 安裝功能需要網站部署在 **HTTPS** 網域（`localhost` 開發環境除外），純 IP 或 HTTP 網址無法安裝。相關設定位於 `vite.config.js`（`VitePWA` 區塊）與 `public/` 底下的圖示檔案（`pwa-192x192.png`、`pwa-512x512.png` 等）。

> 💡 更新機制設為 `autoUpdate`，部署新版本後 PWA 會在背景自動更新，使用者**不需要移除後重新加入主畫面**。

---

## 🎯 使用時的注意事項

* **練習前請先站直面對鏡頭**：系統需要偵測到直立姿勢（含髖部入鏡）約 0.8 秒才能完成肩寬校正，校正完成後才會開始計算按壓。
* **請將鏡頭架設在側面**：需要同時拍到肩膀、手肘、手腕與髖部，才能正確判斷手臂角度與身體前傾。
* **前 4 下按壓不會有深度判定**：比例尺需累積 5 次按壓最高點取中位數，第 5 下起才開始判定深度。
* **AED 位置僅供參考**：資料來自衛福部公開資料集，實際開放時間與位置請以現場為準。

---
