const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'mhar-bsi.db');
const db = new Database(dbPath);

db.pragma('foreign_keys = OFF'); // Disable foreign keys during migration

try {
    console.log('Starting migration to remove ON DELETE CASCADE from delete_requests...');

    db.transaction(() => {
        // 1. Rename existing table
        db.prepare('ALTER TABLE delete_requests RENAME TO delete_requests_old').run();

        // 2. Create new table WITHOUT ON DELETE CASCADE
        // Note: keeping all columns including record_time
        db.prepare(`
            CREATE TABLE delete_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                submission_id INTEGER NOT NULL,
                requester_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
                reject_reason TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME,
                resolved_by INTEGER, 
                medical_record_number TEXT, 
                admission_date TEXT, 
                record_time TEXT,
                FOREIGN KEY (requester_id) REFERENCES users(id),
                FOREIGN KEY (resolved_by) REFERENCES users(id)
                -- Removed FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
                -- We want to keep the request even if submission is deleted, so no FK or SET NULL?
                -- If we remove FK entirely, we lose integrity but achieve goal.
                -- Or we can have FK but ON DELETE SET NULL (requires submission_id to be nullable).
                -- Since submission_id is currently NOT NULL, and we want to keep the ID for reference (even if broken),
                -- removing the FK constraint is the safest bet to ensure the record stays.
                -- Alternatively, we can make submission_id nullable and set to NULL.
                -- But the code uses submission_id.
                -- Let's perform a simple "No Constraint" approach for submission_id to allow "orphan" requests.
            )
        `).run();

        // 3. Copy data
        db.prepare(`
            INSERT INTO delete_requests (id, submission_id, requester_id, status, reject_reason, created_at, resolved_at, resolved_by, medical_record_number, admission_date, record_time)
            SELECT id, submission_id, requester_id, status, reject_reason, created_at, resolved_at, resolved_by, medical_record_number, admission_date, record_time 
            FROM delete_requests_old
        `).run();

        // 4. Drop old table
        db.prepare('DROP TABLE delete_requests_old').run();

        console.log('Migration completed successfully.');
    })();

} catch (error) {
    console.error('Migration failed:', error);
    // Explicitly rollback if needed (transaction usually auto-rollbacks on error but better safe)
    // In better-sqlite3 synchronous transaction blocks, exception triggers rollback.
} finally {
    db.pragma('foreign_keys = ON');
    db.close();
}
