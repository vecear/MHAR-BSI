/**
 * Migration: Remove ON DELETE CASCADE from submissions table
 * This ensures forms are NOT deleted when a user is deleted.
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'db', 'mhar-bsi.db');
const db = new Database(dbPath);

console.log('Starting migration to remove ON DELETE CASCADE from submissions...');

db.pragma('foreign_keys = OFF');

try {
    db.transaction(() => {
        console.log('1. Backing up submissions data...');

        // Create new table without ON DELETE CASCADE (user_id allows NULL)
        console.log('2. Creating new submissions table structure...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS submissions_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                medical_record_number TEXT NOT NULL,
                admission_date DATE NOT NULL,
                form_data TEXT NOT NULL,
                data_status TEXT DEFAULT 'incomplete' CHECK(data_status IN ('complete', 'incomplete')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                update_count INTEGER DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                UNIQUE(medical_record_number, admission_date)
            )
        `);

        // Copy data from old table to new
        console.log('3. Copying data to new table...');
        db.exec(`
            INSERT INTO submissions_new (id, user_id, medical_record_number, admission_date, form_data, data_status, created_at, updated_at, update_count)
            SELECT id, user_id, medical_record_number, admission_date, form_data, data_status, created_at, updated_at, update_count
            FROM submissions
        `);

        // Drop old table
        console.log('4. Dropping old table...');
        db.exec('DROP TABLE submissions');

        // Rename new table
        console.log('5. Renaming new table...');
        db.exec('ALTER TABLE submissions_new RENAME TO submissions');

        // Recreate indexes
        console.log('6. Recreating indexes...');
        db.exec('CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_submissions_medical_record ON submissions(medical_record_number)');

        console.log('Migration completed successfully!');
    })();
} catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
} finally {
    db.pragma('foreign_keys = ON');
    db.close();
}

console.log('Forms will no longer be deleted when users are deleted.');
console.log('Instead, user_id will be set to NULL for orphaned forms.');
