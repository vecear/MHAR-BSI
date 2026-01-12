const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'mhar-bsi.db');
const db = new Database(dbPath);

console.log('Creating delete_requests table...');

try {
    db.exec(`
        CREATE TABLE IF NOT EXISTS delete_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id INTEGER NOT NULL,
            requester_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
            reject_reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            resolved_by INTEGER,
            FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
            FOREIGN KEY (requester_id) REFERENCES users(id),
            FOREIGN KEY (resolved_by) REFERENCES users(id)
        );
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_delete_requests_submission ON delete_requests(submission_id);
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_delete_requests_requester ON delete_requests(requester_id);
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_delete_requests_status ON delete_requests(status);
    `);

    console.log('delete_requests table created successfully!');
} catch (err) {
    if (err.message.includes('already exists')) {
        console.log('Table already exists, skipping...');
    } else {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

db.close();
