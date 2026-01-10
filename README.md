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
- 👥 **帳號管理** - 管理員可新增/刪除使用者、重設密碼
- 📝 **表單提交** - 支援草稿與完成狀態
- 🏥 **多院區支援** - 8間國軍醫院分院
- 📊 **資料匯出** - 管理員可匯出 CSV

## 技術堆疊

**前端:**
- React 18 + TypeScript
- Vite
- React Router DOM

**後端:**
- Express.js
- better-sqlite3
- bcryptjs
- express-session

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/login` | 登入 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 取得當前使用者 |
| GET | `/api/users` | 取得使用者列表 (管理員) |
| POST | `/api/users` | 新增使用者 (管理員) |
| DELETE | `/api/users/:id` | 刪除使用者 (管理員) |
| GET | `/api/submissions` | 取得表單列表 |
| POST | `/api/submissions` | 新增表單 |
| PUT | `/api/submissions/:id` | 更新表單 |
| DELETE | `/api/submissions/:id` | 刪除表單 |

## 支援院區

- 內湖總院
- 松山分院
- 澎湖分院
- 桃園總院
- 台中總院
- 高雄總院
- 左營總院
- 花蓮總院
