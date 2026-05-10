# 金史紀 (GoldChronicle) 🏆

黃金走勢與事件追蹤系統 - 實時監測黃金價格走勢，關聯全球重大經濟事件。

## 📋 項目簡介

**金史紀** 是一個整合黃金價格數據與歷史事件的追蹤系統，幫助投資者：
- 實時查看黃金價格走勢圖表
- 了解驅動黃金價格變動的重大事件
- 按日期範圍篩選查詢歷史數據
- 分析黃金價格與全球經濟事件的關聯性

## 🚀 核心功能

✨ **自動數據同步**
- 從 Yahoo Finance 每日同步 10 年黃金期貨 (GC=F) 歷史數據
- 自動關聯歷史事件，展示金價變動背後的故事

📊 **互動式圖表**
- 使用 Chart.js 繪製黃金價格走勢圖表
- 支持日期範圍篩選查詢

🔍 **詳細事件記錄**
- 包含 2016-2018 年重大經濟、政治事件
- 每個事件配有詳細背景說明
- 表格顯示每日價格與關聯事件

🌐 **雲端支持**
- 自動檢測 Azure 環境，適配不同儲存路徑
- 支持本地開發與線上部署

## 🛠️ 技術棧

| 技術 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥20.0.0 | 後端運行環境 |
| Express | ^4.19.2 | Web 框架 |
| SQLite3 | ^5.1.7 | 數據庫 |
| Chart.js | Latest | 圖表繪製 |
| CORS | ^2.8.5 | 跨域請求 |

## 📦 安裝與啟動

### 環境需求
- Node.js >= 20.0.0
- npm 或 yarn

### 安裝依賴
```bash
npm install
```

### 本地運行
```bash
npm start
```

伺服器將在 `http://localhost:3000` 啟動，並自動同步黃金數據。

### 環境變數
- `PORT` - 指定伺服器埠號（默認：3000）
- `WEBSITE_SITE_NAME` - Azure 自動設置，用於識別雲端環境

## 📡 API 文檔

### GET /api/gold
獲取黃金價格與事件數據

**查詢參數:**
| 參數 | 類型 | 說明 | 示例 |
|------|------|------|------|
| startDate | string | 開始日期 (YYYY-MM-DD) | `2017-01-01` |
| endDate | string | 結束日期 (YYYY-MM-DD) | `2017-12-31` |

**請求範例:**
```bash
curl "http://localhost:3000/api/gold?startDate=2017-01-01&endDate=2017-12-31"
```

**回應範例:**
```json
[
  {
    "date": "2017-03-15",
    "price": 1235.45,
    "event": "聯準會升息一碼，開啟2017年升息循環",
    "detail": "雖然聯準會如期升息一碼，但由於聲明並未如市場預期般極度鷹派..."
  },
  {
    "date": "2017-03-16",
    "price": 1245.80,
    "event": "",
    "detail": ""
  }
]
```

## 🗄️ 數據庫結構

### 表: GoldRecords_v2

```sql
CREATE TABLE GoldRecords_v2 (
    date TEXT UNIQUE,        -- 日期 (YYYY-MM-DD)
    price REAL,              -- 黃金收盤價 (USD/oz)
    event TEXT,              -- 事件標題
    detail TEXT              -- 事件詳細說明
)
```

**數據儲存位置:**
- **本地環境**: `./gold_data.db`
- **Azure 環境**: `/home/data/gold_data.db`

## 📁 項目結構

```
gold-chronicle/
├── server.js           # Express 伺服器主文件
├── index.html          # 前端頁面 (HTML + CSS + JavaScript)
├── package.json        # 項目依賴配置
├── events.json         # 歷史事件數據庫
├── openapi.yaml        # API 文檔 (OpenAPI 規格)
├── gold_data.db        # SQLite 數據庫 (本地)
└── README.md           # 本文件
```

### 文件說明

- **server.js** - 後端邏輯
  - Express 應用配置
  - SQLite 數據庫初始化
  - `/api/gold` 接口實現
  - `syncGoldData()` 數據同步函數

- **index.html** - 前端頁面
  - 響應式 UI 設計（深色主題）
  - 黃金價格圖表展示
  - 日期範圍篩選器
  - 事件詳情表格

- **events.json** - 事件數據
  - 歷年重大經濟、地緣政治事件
  - 每條記錄包含日期、事件標題、詳細說明
  - 由 `syncGoldData()` 自動關聯到金價數據

## 🔄 數據同步機制

系統在啟動時自動執行 `syncGoldData()` 函數：

1. **獲取金價數據** - 從 Yahoo Finance API 獲取 10 年歷史數據
2. **加載事件映射** - 讀取 `events.json` 並建立日期索引
3. **批量寫入數據庫** - 使用 SQL 事務 (Transaction) 提高效率
4. **事件關聯** - 自動將事件關聯到相應日期的金價記錄

## 🌩️ Azure 部署指南

本項目支持 Azure App Service 無縫部署：

### 部署步驟

1. **連接 Azure 帳户**
   ```bash
   az login
   ```

2. **建立資源群組與應用服務**
   ```bash
   az group create --name myResourceGroup --location eastasia
   az appservice plan create --name myPlan --resource-group myResourceGroup --sku B1 --is-linux
   az webapp create --name gold-chronicle-app --resource-group myResourceGroup --plan myPlan --runtime "node|20-lts"
   ```

3. **推送代碼至 Azure**
   ```bash
   git remote add azure <your-azure-git-url>
   git push azure main
   ```

4. **配置環境變數**
   - Azure 會自動設置 `WEBSITE_SITE_NAME`
   - 數據庫自動使用 `/home/data/gold_data.db`

### 持久化數據

Azure App Service 容器重啟會清除本地文件，但 `/home/data/` 路徑會持久化。系統已自動適配此路徑。

## 🎨 前端特性

- **深色主題設計** - 易於長時間瀏覽
- **黃金色強調** - 品牌色彩設計 (#FFD700)
- **響應式佈局** - 支援桌面、平板、手機
- **互動式圖表** - Chart.js 提供流暢的圖表體驗
- **日期篩選** - 靈活查詢任意時間範圍
- **詳情彈窗** - 點擊事件查看完整說明

## 📊 數據來源

- **金價數據**: Yahoo Finance (`GC=F` 黃金期貨合約)
- **事件數據**: 手工收集的全球經濟、政治重大事件
- **數據更新**: 每次服務器啟動時自動同步

## 🐛 故障排除

### 數據同步失敗
- 檢查網絡連接是否正常
- 確認 Yahoo Finance API 是否可訪問
- 查看服務器日誌輸出

### 數據庫連接錯誤
- 確認 SQLite3 已正確安裝
- 檢查文件系統權限 (本地: `./`, Azure: `/home/data/`)
- 嘗試刪除 `gold_data.db` 重新初始化

### 頁面無法加載
- 檢查伺服器是否正常運行
- 確認埠號設置無誤
- 清除瀏覽器快取並重新刷新

## 📝 版本歷史

- **v1.0.0** (當前)
  - 首版發佈
  - 整合 10 年黃金價格數據
  - 包含 2016-2018 年重大事件
  - 支持本地與 Azure 部署

## 📄 授權

ISC License

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

---

**最後更新**: 2024 年
**維護者**: Gold Chronicle Team
