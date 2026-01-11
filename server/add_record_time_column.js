const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'mhar-bsi.db');
const db = new Database(dbPath);

try {
    console.log('Adding record_time column to delete_requests table...');

    // Check if column exists
    const tableInfo = db.pragma('table_info(delete_requests)');
    const hasColumn = tableInfo.some(col => col.name === 'record_time');

    if (!hasColumn) {
        db.exec('ALTER TABLE delete_requests ADD COLUMN record_time TEXT');
        console.log('Column added.');
    } else {
        console.log('Column already exists.');
    }

    // Backfill data
    console.log('Backfilling record_time...');
    const requests = db.prepare('SELECT id, submission_id FROM delete_requests WHERE record_time IS NULL').all();

    const updateStmt = db.prepare('UPDATE delete_requests SET record_time = ? WHERE id = ?');
    const getSubmissionStmt = db.prepare('SELECT form_data FROM submissions WHERE id = ?');

    let updated = 0;
    for (const req of requests) {
        const sub = getSubmissionStmt.get(req.submission_id);
        if (sub && sub.form_data) {
            try {
                const formData = JSON.parse(sub.form_data);
                if (formData.record_time) {
                    updateStmt.run(formData.record_time, req.id);
                    updated++;
                }
            } catch (e) {
                console.error(`Error parsing form_data for submission ${req.submission_id}:`, e);
            }
        }
    }

    console.log(`Updated ${updated} requests.`);

} catch (error) {
    console.error('Migration failed:', error);
} finally {
    db.close();
}
