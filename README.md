<!-- markdownlint-disable MD060 -->
# MHAR-BSI

Military Hospitals Antimicrobial-resistant BSI Surveillance  
國軍醫院抗藥性菌血症研究表單系統

## 專案結構

```text
MHAR-BSI/
├── client/          # React + TypeScript 前端 (Vite) & Firebase 配置
└── server/          # (Legacy) Express.js 後端
```

## 快速開始

### 1. 安裝依賴

```bash
cd client
npm install
```

### 2. 設定 Firebase ENVIRONMENT

專案使用 Firebase 進行認證與資料庫存取。請確保本地環境已正確配置。

### 3. 啟動開發環境

```bash
cd client
npm run dev
```

### 預設帳號

| 帳號  | 密碼     | 角色   |
| ----- | -------- | ------ |
| <admin@example.com> | (請洽管理員) | 管理員 |

*(註：目前使用 Firebase Auth，請使用 Email 登入)*

## 功能特點

### 🏥 一般使用者功能

- 🔐 **使用者認證** - 完整的 Firebase Authentication 整合。
- 📝 **表單提交系統**
  - **彈性儲存**：支援「儲存草稿」與「正式送出」雙模式。
  - **狀態追蹤**：清晰標示資料狀態（草稿、已完成）。
  - **完整性檢查**：正式送出前自動檢查必填欄位。
- 👤 **個人資料管理** - 可編輯姓名、性別、E-mail、電話、地址及 Line ID。
- 🗑️ **資料刪除申請** - 對於已提交的資料，可發起刪除請求，由管理員審核。

### ⚙️ 管理員 (Admin) 功能

- 👥 **帳號管理** - 完整的使用者 CRUD 功能。
- 📊 **全院資料監控** - 可檢視跨院區所有提交資料，支援多條件篩選與排序。
- 🛡️ **刪除請求管理** - 專屬「刪除表單」審核介面。
- 📥 **CSV 批次匯入** - 提供範本下載，支援 Excel 編輯後批次匯入資料。
- 📤 **進階資料匯出** - 支援將系統資料匯出為專用 CSV 格式。

## 技術堆疊

**前端 & 核心:**

- React 19 + TypeScript
- Vite
- Firebase Auth (使用者認證)
- Firebase Firestore (NoSQL 資料庫)
- Firebase Hosting (靜態網站託管)
- React Router DOM
- Lucide React (Icons)

## 部署 (Deployment)

本專案已配置為部署至 **Firebase Hosting**。

詳細部署指南請參閱 [DEPLOY.md](./DEPLOY.md)。

## 支援院區

- 內湖總院
- 松山分院
- 澎湖分院
- 桃園總院
- 台中總院
- 高雄總院
- 左營總院
- 花蓮總院
