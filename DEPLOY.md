# 部署到 Render.com

## 前置準備

1. 確保專案已推送到 GitHub
2. 註冊 [Render.com](https://render.com/) 帳號（可用 GitHub 登入）

## 部署步驟

### 1. 建立新服務

1. 登入 Render Dashboard
2. 點擊 **New +** → **Web Service**
3. 連結你的 GitHub 帳號並選擇 `MHAR-BSI` Repository

### 2. 設定服務

| 設定項目 | 值 |
|----------|-----|
| **Name** | `mhar-bsi`（或自訂名稱）|
| **Region** | Singapore (Southeast Asia) |
| **Branch** | `main` |
| **Runtime** | Node |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |

### 3. 環境變數

點擊 **Environment** 新增以下變數：

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | （點擊 Generate 產生隨機值）|

### 4. 部署

點擊 **Create Web Service**，等待部署完成（約 3-5 分鐘）。

## 部署完成後

你的網站將可透過以下網址訪問：

```text
https://mhar-bsi.onrender.com
```

（實際網址會根據你設定的名稱而不同）

## 免費方案注意事項

1. **服務休眠**：閒置 15 分鐘後會休眠，首次訪問需要 30 秒喚醒
2. **資料不持久**：服務重啟後資料庫會重置（所有資料消失）
3. **如需持久化資料**：升級到 Starter 方案（$7/月）並新增 Disk

## 可選：新增持久化硬碟（付費方案）

如果升級到付費方案，可以新增硬碟讓資料持久化：

1. 在服務設定頁面找到 **Disks**
2. 新增硬碟：
   - **Name**: `data`
   - **Mount Path**: `/opt/render/project/src/server/data`
   - **Size**: `1 GB`
