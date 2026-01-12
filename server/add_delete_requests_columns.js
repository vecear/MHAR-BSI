const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'mhar-bsi.db');
const db = new Database(dbPath);

console.log('Adding columns to delete_requests table...');

try {
    // Add medical_record_number column
    try {
        db.exec('ALTER TABLE delete_requests ADD COLUMN medical_record_number TEXT');
        console.log('Added medical_record_number column');
    } catch (err) {
        if (err.message.includes('duplicate column')) {
            console.log('medical_record_number column already exists');
        } else {
            throw err;
        }
    }

    // Add admission_date column
    try {
        db.exec('ALTER TABLE delete_requests ADD COLUMN admission_date TEXT');
        console.log('Added admission_date column');
    } catch (err) {
        if (err.message.includes('duplicate column')) {
            console.log('admission_date column already exists');
        } else {
            throw err;
        }
    }

    console.log('Migration completed successfully!');
} catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
}

db.close();
