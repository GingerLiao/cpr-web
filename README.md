# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## 組員如何加入開發？
這是一個非常經典的「新手雷區」，請務必把這段貼給你的組員看！

你的組員電腦裡也必須安裝好 Node.js 和 Git。接著請他們打開自己電腦的終端機（或命令提示字元），執行以下步驟：

1. 把雲端程式碼「複製」到自己電腦裡：
git clone https://github.com/GingerLiao/cpr-web.git
(這會在他們電腦生出一個 cpr-web 資料夾)

2. 走進資料夾：
cd cpr-web

4. ⚠️ 絕對不能漏掉這步：安裝所有套件！
(因為我們不會把幾百 MB 的 node_modules 傳上 GitHub，所以組員載下來後必須自己重新安裝套件)
npm install

4. 啟動伺服器，開始開發：
npm run dev

💡 團隊協作的「每日黃金三步驟」
以後你們在寫扣的時候，為了避免不同人寫的東西打架（衝突），請大家養成這個好習慣：

每天要開始寫扣前 (先抓最新版)：

git pull
寫完扣，準備收工時 (推上雲端交班)：

git add .

git commit -m "寫下你今天改了什麼，例如：修改了首頁按鈕顏色"

git push
