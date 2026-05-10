const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 【關鍵修正】讓 Express 伺服器託管前端檔案
// 這樣當你訪問 http://localhost:3000 時，它才會顯示 index.html
app.use(express.static(__dirname));

// 處理 SQLite 持久化路徑
const isAzure = !!process.env.WEBSITE_SITE_NAME;
const dataDir = isAzure ? '/home/data' : __dirname;

if (isAzure && !fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'gold_data.db');
const db = new sqlite3.Database(dbPath);

// 初始化資料庫
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS GoldRecords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE,
        price REAL,
        event TEXT
    )`);
});

// 自動抓取數據 (保留 Yahoo Finance 邏輯)
async function syncGoldData() {
    console.log("正在同步黃金歷史數據...");
    try {
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=10y';
        const response = await fetch(url);
        const data = await response.json();

        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const closePrices = result.indicators.quote[0].close;

        // 預設重大事件
        const majorEvents = {
            "2024-03-07": "聯準會暗示今年內可能降息",
            "2024-04-13": "地緣政治風險加劇，避險情緒推升金價",
            "2025-12-15": "年底結帳行情，黃金區間震盪",
            "2026-04-15": "地緣政治緊張局勢升溫，推升避險需求"
        };

        const insert = db.prepare("INSERT OR IGNORE INTO GoldRecords (date, price, event) VALUES (?, ?, ?)");
        for (let i = 0; i < timestamps.length; i++) {
            const price = closePrices[i];
            if (price !== null && price !== undefined) {
                const dateObj = new Date(timestamps[i] * 1000);
                const dateStr = dateObj.toISOString().split('T')[0];
                const event = majorEvents[dateStr] || ""; 
                insert.run(dateStr, price, event);
            }
        }
        insert.finalize();
        console.log("數據同步完成！");
    } catch (error) {
        console.error("同步失敗:", error);
    }
}

syncGoldData();

// 查詢 API (移除 POST 接口)
app.get('/api/gold', (req, res) => {
    let { startDate, endDate, keyword } = req.query;
    let query = "SELECT * FROM GoldRecords WHERE 1=1";
    let params = [];

    if (startDate) { 
        startDate = startDate.replace(/\//g, '-');
        query += " AND date >= ?"; 
        params.push(startDate); 
    }
    if (endDate) { 
        endDate = endDate.replace(/\//g, '-');
        query += " AND date <= ?"; 
        params.push(endDate); 
    }
    if (keyword) { 
        query += " AND event LIKE ?"; 
        params.push(`%${keyword}%`); 
    }

    query += " ORDER BY date ASC";

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.listen(port, () => {
    console.log(`伺服器運行中：http://localhost:${port}`);
});