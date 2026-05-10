const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs'); // 新增：用於讀取 events.json

const app = express();
const port = process.env.PORT || 3000;

// 判斷是否在 Azure 環境，決定資料庫儲存路徑
const isAzure = process.env.WEBSITE_SITE_NAME !== undefined;
const dbPath = isAzure ? '/home/data/gold_data.db' : './gold_data.db';

// 建立/連線資料庫
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("資料庫連接失敗:", err.message);
    } else {
        console.log(`已連接到 SQLite 資料庫 (${dbPath})`);
        // 初始化資料表
        db.run(`CREATE TABLE IF NOT EXISTS GoldRecords (
            date TEXT UNIQUE,
            price REAL,
            event TEXT
        )`);
    }
});

// 設定靜態檔案資料夾 (讓伺服器能讀取 index.html 等前端檔案)
app.use(express.static(__dirname));

// API 路由：提供黃金歷史資料與搜尋功能 (保留你原本的搜尋邏輯)
app.get('/api/gold', (req, res) => {
    const keyword = req.query.keyword || '';
    // 支援模糊搜尋 event 欄位
    const sql = `SELECT * FROM GoldRecords WHERE event LIKE ? ORDER BY date DESC`;
    
    db.all(sql, [`%${keyword}%`], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 核心功能：同步 Yahoo 數據與 events.json
async function syncGoldData() {
    console.log("正在同步黃金數據與歷史事件...");
    try {
        // 1. 抓取 Yahoo Finance 10年每日歷史數據
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=10y';
        const response = await fetch(url);
        const data = await response.json();
        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const closePrices = result.indicators.quote[0].close;

        // 2. 讀取剛剛建立的 events.json
        let eventsMap = {};
        if (fs.existsSync('./events.json')) {
            const rawEvents = JSON.parse(fs.readFileSync('./events.json', 'utf8'));
            rawEvents.forEach(e => eventsMap[e.date] = e.event);
        }

        // 3. 批次寫入資料庫 (Transaction 優化效能)
        db.serialize(() => {
            db.run("BEGIN TRANSACTION"); // 告訴資料庫暫停硬碟寫入，先存記憶體
            
            const insert = db.prepare("INSERT OR IGNORE INTO GoldRecords (date, price, event) VALUES (?, ?, ?)");
            const update = db.prepare("UPDATE GoldRecords SET event = ? WHERE date = ?");

            for (let i = 0; i < timestamps.length; i++) {
                const dateObj = new Date(timestamps[i] * 1000);
                const dateStr = dateObj.toISOString().split('T')[0];
                const price = closePrices[i];
                
                // 從 map 中尋找今天有沒有發生重大事件
                const event = eventsMap[dateStr] || "";

                if (price !== null && price !== undefined) {
                    insert.run(dateStr, price, event);
                    // 如果這天有事件，就更新進去 (防禦舊資料沒有事件的狀況)
                    if (event) {
                        update.run(event, dateStr);
                    }
                }
            }
            
            insert.finalize();
            update.finalize();
            db.run("COMMIT"); // 一次性寫入硬碟，速度激增！
        });

        console.log("數據與事件同步完成！");
    } catch (error) {
        console.error("同步失敗:", error);
    }
}

// 啟動伺服器
app.listen(port, () => {
    console.log(`伺服器運行中：http://localhost:${port}`);
    // 伺服器啟動時，自動執行同步函數
    syncGoldData();
});