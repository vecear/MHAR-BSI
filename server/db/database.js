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
    findById: db.prepare('SELECT id, username, hospital, role, email, display_name, gender, phone, address, line_id, security_question, security_answer, created_at FROM users WHERE id = ?'),
    getAll: db.prepare('SELECT id, username, hospital, role, email, display_name, gender, phone, address, line_id, created_at FROM users WHERE role != ?'),
    create: db.prepare('INSERT INTO users (username, password_hash, hospital, role, email, display_name, gender, phone, address, line_id, security_question, security_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    delete: db.prepare('DELETE FROM users WHERE id = ? AND role != ?'),
    updatePassword: db.prepare('UPDATE users SET password_hash = ? WHERE id = ?'),
    updatePasswordByUsername: db.prepare('UPDATE users SET password_hash = ? WHERE username = ?'),
    updateProfile: db.prepare('UPDATE users SET email = ?, display_name = ?, gender = ?, phone = ?, address = ?, line_id = ?, security_question = ?, security_answer = ? WHERE id = ?'),
    updateProfileAdmin: db.prepare('UPDATE users SET username = ?, hospital = ?, email = ?, display_name = ?, gender = ?, phone = ?, address = ?, line_id = ? WHERE id = ?'),
    getSecurityQuestion: db.prepare('SELECT security_question FROM users WHERE username = ?'),
    getSecurityAnswer: db.prepare('SELECT security_answer FROM users WHERE username = ?')
};


// Submission queries
const submissionQueries = {
    create: db.prepare(`
        INSERT INTO submissions (user_id, medical_record_number, admission_date, form_data, data_status, update_count)
        VALUES (?, ?, ?, ?, ?, 1)
    `),
    update: db.prepare(`
        UPDATE submissions 
        SET form_data = ?, data_status = ?, updated_at = CURRENT_TIMESTAMP, update_count = update_count + 1
        WHERE id = ? AND user_id = ?
    `),
    updateAdmin: db.prepare(`
        UPDATE submissions 
        SET form_data = ?, data_status = ?, updated_at = CURRENT_TIMESTAMP, update_count = update_count + 1
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
    findByUser: db.prepare(`
        SELECT s.*, u.username, u.hospital,
        CASE WHEN EXISTS (SELECT 1 FROM delete_requests dr WHERE dr.submission_id = s.id AND dr.status = 'pending') THEN 1 ELSE 0 END as has_pending_delete
        FROM submissions s
        JOIN users u ON s.user_id = u.id
        WHERE s.user_id = ?
        ORDER BY s.updated_at DESC
    `),
    findByHospital: db.prepare(`
        SELECT s.*, u.username, u.hospital,
        CASE WHEN EXISTS (SELECT 1 FROM delete_requests dr WHERE dr.submission_id = s.id AND dr.status = 'pending') THEN 1 ELSE 0 END as has_pending_delete
        FROM submissions s
        JOIN users u ON s.user_id = u.id
        WHERE u.hospital = ?
        ORDER BY s.updated_at DESC
    `),
    getAllByUser: db.prepare(`
        SELECT s.*, u.username, u.hospital,
        CASE WHEN EXISTS (SELECT 1 FROM delete_requests dr WHERE dr.submission_id = s.id AND dr.status = 'pending') THEN 1 ELSE 0 END as has_pending_delete
        FROM submissions s 
        JOIN users u ON s.user_id = u.id 
        WHERE s.user_id = ? 
        ORDER BY s.updated_at DESC
    `),
    getAll: db.prepare(`
        SELECT s.*, u.username, u.hospital,
        CASE WHEN EXISTS (SELECT 1 FROM delete_requests dr WHERE dr.submission_id = s.id AND dr.status = 'pending') THEN 1 ELSE 0 END as has_pending_delete
        FROM submissions s 
        JOIN users u ON s.user_id = u.id 
        ORDER BY s.updated_at DESC
    `),
    delete: db.prepare('DELETE FROM submissions WHERE id = ? AND user_id = ?'),
    deleteAdmin: db.prepare('DELETE FROM submissions WHERE id = ?')
};

// Delete request queries
const deleteRequestQueries = {
    create: db.prepare(`
        INSERT INTO delete_requests (submission_id, requester_id, medical_record_number, admission_date, record_time, request_reason)
        VALUES (?, ?, ?, ?, ?, ?)
    `),
    findById: db.prepare('SELECT * FROM delete_requests WHERE id = ?'),
    findBySubmission: db.prepare('SELECT * FROM delete_requests WHERE submission_id = ? AND status = ?'),
    findPendingBySubmission: db.prepare('SELECT * FROM delete_requests WHERE submission_id = ? AND status = ?'),
    getByRequester: db.prepare(`
        SELECT dr.*, 
               COALESCE(dr.medical_record_number, s.medical_record_number) as medical_record_number,
               COALESCE(dr.admission_date, s.admission_date) as admission_date,
               dr.record_time
        FROM delete_requests dr
        LEFT JOIN submissions s ON dr.submission_id = s.id
        WHERE dr.requester_id = ?
        ORDER BY dr.created_at DESC
    `),
    getAll: db.prepare(`
        SELECT dr.*, 
               COALESCE(dr.medical_record_number, s.medical_record_number) as medical_record_number,
               COALESCE(dr.admission_date, s.admission_date) as admission_date,
               dr.record_time,
               u.username as requester_username, u.hospital as requester_hospital
        FROM delete_requests dr
        LEFT JOIN submissions s ON dr.submission_id = s.id
        JOIN users u ON dr.requester_id = u.id
        ORDER BY dr.created_at DESC
    `),
    approve: db.prepare(`
        UPDATE delete_requests
        SET status = 'approved', resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
        WHERE id = ?
    `),
    reject: db.prepare(`
        UPDATE delete_requests
        SET status = 'rejected', resolved_at = CURRENT_TIMESTAMP, resolved_by = ?, reject_reason = ?
        WHERE id = ?
    `)
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
    submissionQueries,
    deleteRequestQueries
};
