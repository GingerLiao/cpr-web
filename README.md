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