const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

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
        // ✨ 修改點：換成全新的資料表名稱 GoldRecords_v2 ✨
        db.run(`CREATE TABLE IF NOT EXISTS GoldRecords_v2 (
            date TEXT UNIQUE,
            price REAL,
            event TEXT,
            detail TEXT
        )`);
    }
});

app.use(express.static(__dirname));

app.get('/api/gold', (req, res) => {
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    // ✨ 修改點：從新表讀取資料 ✨
    let sql = `SELECT * FROM GoldRecords_v2 WHERE 1=1`;
    let params = [];

    if (startDate) {
        sql += ` AND date >= ?`;
        params.push(startDate);
    }
    if (endDate) {
        sql += ` AND date <= ?`;
        params.push(endDate);
    }

    sql += ` ORDER BY date ASC`;
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

async function syncGoldData() {
    console.log("正在同步黃金數據與歷史事件...");
    try {
        const url = 'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=10y';
        const response = await fetch(url);
        const data = await response.json();
        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const closePrices = result.indicators.quote[0].close;

        let eventsMap = {};
        if (fs.existsSync('./events.json')) {
            const rawEvents = JSON.parse(fs.readFileSync('./events.json', 'utf8'));
            rawEvents.forEach(e => {
                eventsMap[e.date] = { event: e.event, detail: e.detail || "" };
            });
        }

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            // ✨ 修改點：寫入與更新都指向新表 GoldRecords_v2 ✨
            const insert = db.prepare("INSERT OR IGNORE INTO GoldRecords_v2 (date, price, event, detail) VALUES (?, ?, ?, ?)");
            const update = db.prepare("UPDATE GoldRecords_v2 SET event = ?, detail = ? WHERE date = ?");

            for (let i = 0; i < timestamps.length; i++) {
                const dateObj = new Date(timestamps[i] * 1000);
                const dateStr = dateObj.toISOString().split('T')[0];
                const price = closePrices[i];
                
                const eventData = eventsMap[dateStr];
                const eventTitle = eventData ? eventData.event : "";
                const eventDetail = eventData ? eventData.detail : "";

                if (price !== null && price !== undefined) {
                    insert.run(dateStr, price, eventTitle, eventDetail);
                    if (eventTitle) {
                        update.run(eventTitle, eventDetail, dateStr);
                    }
                }
            }
            
            insert.finalize();
            update.finalize();
            db.run("COMMIT");
        });

        console.log("數據與事件同步完成！");
    } catch (error) {
        console.error("同步失敗:", error);
    }
}

app.listen(port, () => {
    console.log(`伺服器運行中：http://localhost:${port}`);
    syncGoldData();
});