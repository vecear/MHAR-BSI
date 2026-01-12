const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'mhar-bsi.db');
const db = new Database(dbPath);

console.log('Adding security question columns to users table...');

try {
    // Add security_question column
    try {
        db.exec('ALTER TABLE users ADD COLUMN security_question TEXT');
        console.log('Added security_question column');
    } catch (err) {
        if (err.message.includes('duplicate column')) {
            console.log('security_question column already exists');
        } else {
            throw err;
        }
    }

    // Add security_answer column
    try {
        db.exec('ALTER TABLE users ADD COLUMN security_answer TEXT');
        console.log('Added security_answer column');
    } catch (err) {
        if (err.message.includes('duplicate column')) {
            console.log('security_answer column already exists');
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
