# MHAR-BSI

Military Hospitals Antimicrobial-resistant BSI Surveillance  
菌血症研究表單系統

## 專案結構

```
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

| 帳號 | 密碼 | 角色 |
|------|------|------|
| admin | admin123 | 管理員 |

## 功能特點

- 🔐 **使用者認證** - Session-based 登入系統
- � **個人資料管理** - 使用者可編輯姓名、性別、E-mail、電話、地址，並修改密碼
- �👥 **帳號管理** - 管理員可新增/編輯/刪除使用者、設定完整個人資料
- 📝 **表單提交** - 支援草稿與完成狀態
- 📥 **CSV 批次匯入** - 下載範本、Excel 編輯後上傳批次匯入
- 🏥 **多院區支援** - 8間國軍醫院分院，使用者自動帶入所屬醫院
- 📊 **資料匯出** - 管理員可匯出 CSV

## 技術堆疊

**前端:**
- React 18 + TypeScript
- Vite
- React Router DOM
- Lucide React (Icons)

**後端:**
- Express.js
- better-sqlite3
- bcryptjs
- express-session

## API 端點

### 認證

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/login` | 登入 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 取得當前使用者 |

### 使用者管理

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/users` | 取得使用者列表 (管理員) |
| POST | `/api/users` | 新增使用者 (管理員) |
| PUT | `/api/users/:id` | 編輯使用者 (管理員) |
| DELETE | `/api/users/:id` | 刪除使用者 (管理員) |
| GET | `/api/users/profile` | 取得個人資料 |
| PUT | `/api/users/profile` | 更新個人資料 |

### 表單管理

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/forms` | 取得表單列表 |
| POST | `/api/forms` | 新增表單 |
| PUT | `/api/forms/:id` | 更新表單 |
| DELETE | `/api/forms/:id` | 刪除表單 |

### 資料匯出

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/export/csv` | 匯出 CSV |

## 使用者欄位

| 欄位 | 說明 | 必填 |
|------|------|------|
| username | 帳號 | ✅ |
| password | 密碼 | ✅ |
| hospital | 所屬醫院 | ✅ |
| display_name | 姓名 | ❌ |
| gender | 性別 | ❌ |
| email | E-mail | ❌ |
| phone | 電話 | ❌ |
| address | 地址 | ❌ |
| line_id | Line ID | ❌ |

## 主題風格

系統內建 20 種精緻主題配色，包含：
- 基礎：預設(淺色)、暗色模式
- 自然：森林綠意、日落暖橘、深海湛藍、翠綠寶石、清新萊姆、水鴨青綠
- 優雅：北歐灰藍、薰衣草紫、優雅玫紅、夢幻紫羅蘭、時尚桃紅
- 沈穩：香醇咖啡、沈穩石灰、大地岩灰、深邃靛藍、午夜星空、琥珀金黃、天空蔚藍

## 介面優化

- **動態主題** - 標題、按鈕、狀態標籤皆隨主題色變換
- **高對比設計** - 自動偵測背景亮度，調整文字顏色(黑/白)以確保清晰度
- **響應式佈局** - 支援各種裝置尺寸，表單步驟與選單自動適應

## 支援院區

- 內湖總院
- 松山分院
- 澎湖分院
- 桃園總院
- 台中總院
- 高雄總院
- 左營總院
- 花蓮總院
