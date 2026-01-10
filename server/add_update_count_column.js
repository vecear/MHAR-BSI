const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'mhar-bsi.db');
const db = new Database(dbPath);

try {
    console.log('Adding update_count column to submissions table...');
    db.prepare('ALTER TABLE submissions ADD COLUMN update_count INTEGER DEFAULT 1').run();
    console.log('Successfully added update_count column.');

    // Optional: Reset existing records to 1 if needed, or leave as default.
    // Default 1 covers existing records well enough as a baseline.
} catch (err) {
    if (err.message.includes('duplicate column name')) {
        console.log('Column update_count already exists.');
    } else {
        console.error('Error adding column:', err.message);
    }
}
