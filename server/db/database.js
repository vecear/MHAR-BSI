const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'mhar-bsi.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema FIRST
function initializeSchema() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema (split by semicolons for multiple statements)
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
        if (statement.trim()) {
            try {
                db.exec(statement);
            } catch (err) {
                // Ignore errors for existing tables/indexes
                if (!err.message.includes('already exists')) {
                    console.error('Schema error:', err.message);
                }
            }
        }
    }

    // Create default admin if not exists
    const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
    if (!adminExists) {
        const hash = bcrypt.hashSync('admin123', 10);
        db.prepare('INSERT INTO users (username, password_hash, hospital, role) VALUES (?, ?, ?, ?)')
            .run('admin', hash, '內湖總院', 'admin');
        console.log('Default admin user created (username: admin, password: admin123)');
    }
}

// Initialize schema immediately
initializeSchema();

// User queries - NOW safe to prepare after schema is initialized
const userQueries = {
    findByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
    findById: db.prepare('SELECT id, username, hospital, role, created_at FROM users WHERE id = ?'),
    getAll: db.prepare('SELECT id, username, hospital, role, created_at FROM users WHERE role != ?'),
    create: db.prepare('INSERT INTO users (username, password_hash, hospital, role) VALUES (?, ?, ?, ?)'),
    delete: db.prepare('DELETE FROM users WHERE id = ? AND role != ?'),
    updatePassword: db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
};

// Submission queries
const submissionQueries = {
    create: db.prepare(`
        INSERT INTO submissions (user_id, medical_record_number, admission_date, form_data, data_status)
        VALUES (?, ?, ?, ?, ?)
    `),
    update: db.prepare(`
        UPDATE submissions 
        SET form_data = ?, data_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
    `),
    updateAdmin: db.prepare(`
        UPDATE submissions 
        SET form_data = ?, data_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `),
    findById: db.prepare('SELECT * FROM submissions WHERE id = ?'),
    findByUserAndRecord: db.prepare(`
        SELECT * FROM submissions 
        WHERE user_id = ? AND medical_record_number = ? AND admission_date = ?
    `),
    findByRecord: db.prepare(`
        SELECT * FROM submissions 
        WHERE medical_record_number = ? AND admission_date = ?
    `),
    getAllByUser: db.prepare(`
        SELECT s.*, u.username, u.hospital 
        FROM submissions s 
        JOIN users u ON s.user_id = u.id 
        WHERE s.user_id = ? 
        ORDER BY s.updated_at DESC
    `),
    getAll: db.prepare(`
        SELECT s.*, u.username, u.hospital 
        FROM submissions s 
        JOIN users u ON s.user_id = u.id 
        ORDER BY s.updated_at DESC
    `),
    delete: db.prepare('DELETE FROM submissions WHERE id = ? AND user_id = ?'),
    deleteAdmin: db.prepare('DELETE FROM submissions WHERE id = ?')
};

// Export a no-op initializeDatabase for backwards compatibility
function initializeDatabase() {
    // Schema already initialized at module load
    console.log('Database initialized successfully');
}

module.exports = {
    db,
    initializeDatabase,
    userQueries,
    submissionQueries
};
