const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'mhar-bsi.db');
const db = new Database(dbPath);

try {
    console.log('Starting migration to add request_reason to delete_requests...');

    // Add request_reason column
    db.prepare('ALTER TABLE delete_requests ADD COLUMN request_reason TEXT').run();

    console.log('Migration completed successfully.');

} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('Column request_reason already exists.');
    } else {
        console.error('Migration failed:', error);
    }
} finally {
    db.close();
}
