const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'mhar-bsi.db');
const db = new Database(dbPath);

try {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='delete_requests'").get();
    console.log(row ? row.sql : 'Table not found');
} catch (error) {
    console.error('Error:', error);
} finally {
    db.close();
}
