# 部署到 Firebase Hosting

本專案使用 Firebase Hosting 進行部署。以下是詳細步驟。

## 前置準備

1. 確保已安裝 [Node.js](https://nodejs.org/)。
2. 確保專案已連結至你的 Firebase Project。

## 部署步驟

### 1. 安裝 Firebase CLI

如果你尚未安裝 Firebase CLI，請在終端機執行：

```bash
npm install -g firebase-tools
```

### 2. 登入 Firebase

```bash
firebase login
```

這將開啟瀏覽器進行認證。

### 3. 建置專案

在部署之前，必須先建置 React 專案：

```bash
cd client
npm run build
```

此指令會在 `client/dist` 目錄下產生生產環境的靜態檔案。

### 4. 部署至 Firebase

```bash
# 確保你在 client 目錄下 (或是根目錄，視 firebase.json 位置而定，本專案建議在 client 目錄執行)
cd client
firebase deploy
```

若只想部署 Hosting 部分（不影響 Firestore 或 Functions 等其他服務）：

```bash
firebase deploy --only hosting
```

## 常見問題

### 如何預覽部署？

你可以使用 Firebase 本地模擬器進行預覽：

```bash
firebase hosting:channel:deploy preview_name
```

或是啟動本地開發伺服器：

```bash
npm run dev
```

### 部署後看不到更新？

1. 請確保你有執行 `npm run build` 產生最新的 `dist` 檔案。
2. 嘗試強制重新整理瀏覽器 (Ctrl+F5 / Cmd+Shift+R) 以清除快取。
