<!-- markdownlint-disable MD060 -->
# MHAR-BSI

Military Hospitals Antimicrobial-resistant BSI Surveillance  
國軍醫院抗藥性菌血症研究表單系統

## 專案結構

```text
MHAR-BSI/
├── client/          # React + TypeScript 前端 (Vite)
└── server/          # Express.js 後端 + SQLite
```

## 快速開始

### 安裝依賴

```bash
# 安裝後端
cd server
npm install

# 安裝前端
cd ../client
npm install
```

### 啟動開發環境

```bash
# Terminal 1 - 啟動後端 (Port 3001)
cd server
npm run dev

# Terminal 2 - 啟動前端 (Port 5173)
cd client
npm run dev
```

### 預設帳號

| 帳號  | 密碼     | 角色   |
| ----- | -------- | ------ |
| admin | admin123 | 管理員 |

## 功能特點

### 🏥 一般使用者功能

- 🔐 **使用者認證** - 支援 Session-based 登入，自動識別 8 間國軍醫院分院權限。
- 📝 **表單提交系統**
  - **彈性儲存**：支援「儲存草稿」與「正式送出」雙模式。
  - **狀態追蹤**：清晰標示資料狀態（草稿、已完成）。
  - **完整性檢查**：正式送出前自動檢查必填欄位。
- 👤 **個人資料管理** - 可編輯姓名、性別、E-mail、電話、地址及 Line ID，並修改密碼。
- 🗑️ **資料刪除申請** - 對於已提交的資料，可發起刪除請求，由管理員審核。

### ⚙️ 管理員 (Admin) 功能

- 👥 **帳號管理** - 完整的使用者 CRUD 功能，可協助重設密碼與設定醫院歸屬。
- 📊 **全院資料監控** - 可檢視跨院區所有提交資料，支援多條件篩選與排序。
- 🛡️ **刪除請求管理** - 專屬「刪除表單」審核介面：
  - **歷程留存**：完整記錄所有刪除請求（待審核、已核准、已駁回）。
  - **即時通知**：導覽列顯示待審核案件數量徽章。
- 📥 **CSV 批次匯入** - 提供範本下載，支援 Excel 編輯後批次匯入資料。
- 📤 **資料匯出** - 支援將系統資料匯出為 CSV 進行統計分析。

## 技術堆疊

**前端:**

- React 19 + TypeScript
- Vite
- React Router DOM
- Lucide React (Icons)

**後端:**

- Express.js
- better-sqlite3 (SQLite)
- bcryptjs (安全性密碼雜湊)
- express-session (Session 狀態管理)

## API 端點列表

### 🔐 認證 (Auth)

| 方法 | 路徑              | 說明                 |
| ---- | ----------------- | -------------------- |
| POST | `/api/auth/login`  | 登入               |
| POST | `/api/auth/logout` | 登出               |
| GET  | `/api/auth/me`     | 取得當前使用者資訊 |

### 👥 使用者管理 (Users)

| 方法   | 路徑               | 說明                  |
| ------ | ------------------ | --------------------- |
| GET    | `/api/users`         | 取得使用者列表 (管理員) |
| POST   | `/api/users`         | 新增使用者 (管理員)     |
| PUT    | `/api/users/:id`     | 編輯使用者 (管理員)     |
| DELETE | `/api/users/:id`     | 刪除使用者 (管理員)     |
| GET    | `/api/users/profile` | 取得個人資料            |
| PUT    | `/api/users/profile` | 更新個人資料            |

### 📝 表單管理 (Forms)

| 方法   | 路徑              | 說明                         |
| ------ | ----------------- | ---------------------------- |
| GET    | `/api/forms`     | 取得表單列表                 |
| POST   | `/api/forms`     | 新增表單 (或草稿)            |
| PUT    | `/api/forms/:id` | 更新表單 (或提交)            |
| DELETE | `/api/forms/:id` | 刪除表單 (直接刪除或發起請求) |

### 🛡️ 刪除請求 (Delete Requests)

| 方法 | 路徑                                 | 說明                               |
| ---- | ------------------------------------ | ---------------------------------- |
| GET  | `/api/delete-requests`             | 取得刪除請求列表 (Admin: 全部, User: 個人) |
| POST | `/api/delete-requests`             | 發起刪除請求                               |
| PUT  | `/api/delete-requests/:id/approve` | 核准刪除申請 (Admin)                       |
| PUT  | `/api/delete-requests/:id/reject`  | 駁回刪除申請 (Admin)                       |

### 📤 資料匯出 (Export)

| 方法 | 路徑              | 說明     |
| ---- | ----------------- | -------- |
| GET  | `/api/export/csv` | 匯出 CSV |

## 使用者欄位

| 欄位         | 說明     | 必填 |
| ------------ | -------- | ---- |
| username     | 帳號     | ✅   |
| password     | 密碼     | ✅   |
| hospital     | 所屬醫院 | ✅   |
| display_name | 姓名     | ❌   |
| gender       | 性別     | ❌   |
| email        | E-mail   | ❌   |
| phone        | 電話     | ❌   |
| address      | 地址     | ❌   |
| line_id      | Line ID  | ❌   |

## 主題風格

系統內建 20 種精緻主題配色，包含：

- **基礎系列**：預設(淺色)、暗色模式
- **自然系列**：森林綠意、日落暖橘、深海湛藍、翠綠寶石、清新萊姆、水鴨青綠
- **優雅系列**：北歐灰藍、薰衣草紫、優雅玫紅、夢幻紫羅蘭、時尚桃紅
- **沈穩系列**：香醇咖啡、沈穩石灰、大地岩灰、深邃靛藍、午夜星空、琥珀金黃、天空蔚藍

## 介面體驗優化

- **動態主題引擎** - 標題、按鈕、狀態標籤皆隨主題色即時變換。
- **智慧對比度** - 自動偵測背景亮度，動態調整文字顏色(黑/白)以確保最佳閱讀體驗。
- **響應式設計** - 完美支援桌面與行動裝置，表單步驟與選單自動適應螢幕尺寸。

## 支援院區

- 內湖總院
- 松山分院
- 澎湖分院
- 桃園總院
- 台中總院
- 高雄總院
- 左營總院
- 花蓮總院
