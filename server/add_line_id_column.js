const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'mhar-bsi.db');
const db = new Database(dbPath);

try {
    console.log('Adding line_id column to users table...');
    db.prepare('ALTER TABLE users ADD COLUMN line_id TEXT').run();
    console.log('Successfully added line_id column.');
} catch (err) {
    if (err.message.includes('duplicate column name')) {
        console.log('Column line_id already exists.');
    } else {
        console.error('Error adding column:', err.message);
    }
}
