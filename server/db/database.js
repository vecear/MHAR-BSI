const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Database path - uses /opt/render/project/src/server/data if disk is mounted, otherwise uses local directory
const isProduction = process.env.NODE_ENV === 'production';
const persistentPath = '/opt/render/project/src/server/data';
const localDataDir = path.join(__dirname);

// Check if persistent disk is available, otherwise use local directory
let dataDir;
if (isProduction && fs.existsSync(persistentPath)) {
    dataDir = persistentPath;
} else {
    dataDir = localDataDir;
}

const dbPath = path.join(dataDir, 'mhar-bsi.db');

// Database instance (will be initialized async)
let db = null;
let SQL = null;

// Save database to file
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

// Auto-save interval (every 30 seconds)
let saveInterval = null;

// Initialize database
async function initializeDatabase() {
    SQL = await initSqlJs();

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
        console.log('Loaded existing database from', dbPath);
    } else {
        db = new SQL.Database();
        console.log('Created new database');
    }

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    // Initialize schema
    initializeSchema();

    // Start auto-save interval
    if (saveInterval) clearInterval(saveInterval);
    saveInterval = setInterval(saveDatabase, 30000);

    // Save on process exit
    process.on('exit', saveDatabase);
    process.on('SIGINT', () => { saveDatabase(); process.exit(); });
    process.on('SIGTERM', () => { saveDatabase(); process.exit(); });

    console.log('Database initialized successfully');
    return db;
}

// Initialize database schema
function initializeSchema() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema (split by semicolons for multiple statements)
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
        if (statement.trim()) {
            try {
                db.run(statement);
            } catch (err) {
                // Ignore errors for existing tables/indexes
                if (!err.message.includes('already exists')) {
                    console.error('Schema error:', err.message);
                }
            }
        }
    }

    // Create default admin if not exists
    const adminResult = db.exec('SELECT id FROM users WHERE username = ?', ['admin']);
    if (adminResult.length === 0 || adminResult[0].values.length === 0) {
        const hash = bcrypt.hashSync('admin123', 10);
        db.run('INSERT INTO users (username, password_hash, hospital, role) VALUES (?, ?, ?, ?)',
            ['admin', hash, '內湖總院', 'admin']);
        saveDatabase();
        console.log('Default admin user created (username: admin, password: admin123)');
    }
}

// Helper to convert sql.js result to object array
function resultToObjects(result) {
    if (!result || result.length === 0) return [];
    const columns = result[0].columns;
    const values = result[0].values;
    return values.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
}

// Helper to get first row as object
function resultToObject(result) {
    const objects = resultToObjects(result);
    return objects.length > 0 ? objects[0] : null;
}

// Query builders that mimic better-sqlite3's prepared statement interface
const userQueries = {
    findByUsername: {
        get: (username) => {
            const result = db.exec('SELECT * FROM users WHERE username = ?', [username]);
            return resultToObject(result);
        }
    },
    findByUsernameOrEmail: {
        get: (identifier) => {
            const result = db.exec('SELECT * FROM users WHERE username = ? OR email = ?', [identifier, identifier]);
            return resultToObject(result);
        }
    },
    findById: {
        get: (id) => {
            const result = db.exec('SELECT id, username, hospital, role, email, display_name, gender, phone, address, line_id, security_question, security_answer, created_at FROM users WHERE id = ?', [id]);
            return resultToObject(result);
        }
    },
    getAll: {
        all: (role) => {
            const result = db.exec('SELECT id, username, hospital, role, email, display_name, gender, phone, address, line_id, created_at FROM users WHERE role != ?', [role]);
            return resultToObjects(result);
        }
    },
    create: {
        run: (username, password_hash, hospital, role, email, display_name, gender, phone, address, line_id, security_question, security_answer) => {
            db.run('INSERT INTO users (username, password_hash, hospital, role, email, display_name, gender, phone, address, line_id, security_question, security_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [username, password_hash, hospital, role, email, display_name, gender, phone, address, line_id, security_question, security_answer]);
            saveDatabase();
            const result = db.exec('SELECT last_insert_rowid() as id');
            return { lastInsertRowid: resultToObject(result)?.id };
        }
    },
    delete: {
        run: (id, role) => {
            db.run('DELETE FROM users WHERE id = ? AND role != ?', [id, role]);
            saveDatabase();
            return { changes: db.getRowsModified() };
        }
    },
    updatePassword: {
        run: (password_hash, id) => {
            db.run('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);
            saveDatabase();
            return { changes: db.getRowsModified() };
        }
    },
    updatePasswordByUsername: {
        run: (password_hash, username) => {
            db.run('UPDATE users SET password_hash = ? WHERE username = ?', [password_hash, username]);
            saveDatabase();
            return { changes: db.getRowsModified() };
        }
    },
    updateProfile: {
        run: (email, display_name, gender, phone, address, line_id, security_question, security_answer, id) => {
            db.run('UPDATE users SET email = ?, display_name = ?, gender = ?, phone = ?, address = ?, line_id = ?, security_question = ?, security_answer = ? WHERE id = ?',
                [email, display_name, gender, phone, address, line_id, security_question, security_answer, id]);
            saveDatabase();
            return { changes: db.getRowsModified() };
        }
    },
    updateProfileAdmin: {
        run: (username, hospital, email, display_name, gender, phone, address, line_id, id) => {
            db.run('UPDATE users SET username = ?, hospital = ?, email = ?, display_name = ?, gender = ?, phone = ?, address = ?, line_id = ? WHERE id = ?',
                [username, hospital, email, display_name, gender, phone, address, line_id, id]);
            saveDatabase();
            return { changes: db.getRowsModified() };
        }
    },
    getSecurityQuestion: {
        get: (username) => {
            const result = db.exec('SELECT security_question FROM users WHERE username = ?', [username]);
            return resultToObject(result);
        }
    },
    getSecurityAnswer: {
        get: (username) => {
            const result = db.exec('SELECT security_answer FROM users WHERE username = ?', [username]);
            return resultToObject(result);
        }
    }
};

// Submission queries
const submissionQueries = {
    create: {
        run: (user_id, medical_record_number, admission_date, form_data, data_status) => {
            db.run(`INSERT INTO submissions (user_id, medical_record_number, admission_date, form_data, data_status, update_count) VALUES (?, ?, ?, ?, ?, 1)`,
                [user_id, medical_record_number, admission_date, form_data, data_status]);
            saveDatabase();
            const result = db.exec('SELECT last_insert_rowid() as id');
            return { lastInsertRowid: resultToObject(result)?.id };
        }
    },
    update: {
        run: (form_data, data_status, id, user_id) => {
            db.run(`UPDATE submissions SET form_data = ?, data_status = ?, updated_at = datetime('now'), update_count = update_count + 1 WHERE id = ? AND user_id = ?`,
                [form_data, data_status, id, user_id]);
            saveDatabase();
            return { changes: db.getRowsModified() };
        }
    },
    updateAdmin: {
        run: (form_data, data_status, id) => {
            db.run(`UPDATE submissions SET form_data = ?, data_status = ?, updated_at = datetime('now'), update_count = update_count + 1 WHERE id = ?`,
                [form_data, data_status, id]);
            saveDatabase();
            return { changes: db.getRowsModified() };
        }
    },
    findById: {
        get: (id) => {
            const result = db.exec('SELECT * FROM submissions WHERE id = ?', [id]);
            return resultToObject(result);
        }
    },
    findByUserAndRecord: {
        get: (user_id, medical_record_number, admission_date) => {
            const result = db.exec(`SELECT * FROM submissions WHERE user_id = ? AND medical_record_number = ? AND admission_date = ?`,
                [user_id, medical_record_number, admission_date]);
            return resultToObject(result);
        }
    },
    findByRecord: {
        get: (medical_record_number, admission_date) => {
            const result = db.exec(`SELECT * FROM submissions WHERE medical_record_number = ? AND admission_date = ?`,
                [medical_record_number, admission_date]);
            return resultToObject(result);
        }
    },
    findByUser: {
        all: (user_id) => {
            const result = db.exec(`
                SELECT s.*, u.username, u.hospital,
                CASE WHEN EXISTS (SELECT 1 FROM delete_requests dr WHERE dr.submission_id = s.id AND dr.status = 'pending') THEN 1 ELSE 0 END as has_pending_delete
                FROM submissions s
                JOIN users u ON s.user_id = u.id
                WHERE s.user_id = ?
                ORDER BY s.updated_at DESC
            `, [user_id]);
            return resultToObjects(result);
        }
    },
    findByHospital: {
        all: (hospital) => {
            const result = db.exec(`
                SELECT s.*, u.username, u.hospital,
                CASE WHEN EXISTS (SELECT 1 FROM delete_requests dr WHERE dr.submission_id = s.id AND dr.status = 'pending') THEN 1 ELSE 0 END as has_pending_delete
                FROM submissions s
                JOIN users u ON s.user_id = u.id
                WHERE u.hospital = ?
                ORDER BY s.updated_at DESC
            `, [hospital]);
            return resultToObjects(result);
        }
    },
    getAllByUser: {
        all: (user_id) => {
            const result = db.exec(`
                SELECT s.*, u.username, u.hospital,
                CASE WHEN EXISTS (SELECT 1 FROM delete_requests dr WHERE dr.submission_id = s.id AND dr.status = 'pending') THEN 1 ELSE 0 END as has_pending_delete
                FROM submissions s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.user_id = ? 
                ORDER BY s.updated_at DESC
            `, [user_id]);
            return resultToObjects(result);
        }
    },
    getAll: {
        all: () => {
            const result = db.exec(`
                SELECT s.*, u.username, u.hospital,
                CASE WHEN EXISTS (SELECT 1 FROM delete_requests dr WHERE dr.submission_id = s.id AND dr.status = 'pending') THEN 1 ELSE 0 END as has_pending_delete
                FROM submissions s 
                JOIN users u ON s.user_id = u.id 
                ORDER BY s.updated_at DESC
            `);
            return resultToObjects(result);
        }
    },
    delete: {
        run: (id, user_id) => {
            db.run('DELETE FROM submissions WHERE id = ? AND user_id = ?', [id, user_id]);
            saveDatabase();
            return { changes: db.getRowsModified() };
        }
    },
    deleteAdmin: {
        run: (id) => {
            db.run('DELETE FROM submissions WHERE id = ?', [id]);
            saveDatabase();
            return { changes: db.getRowsModified() };
        }
    }
};

// Delete request queries
const deleteRequestQueries = {
    create: {
        run: (submission_id, requester_id, medical_record_number, admission_date, record_time, request_reason) => {
            db.run(`INSERT INTO delete_requests (submission_id, requester_id, medical_record_number, admission_date, record_time, request_reason) VALUES (?, ?, ?, ?, ?, ?)`,
                [submission_id, requester_id, medical_record_number, admission_date, record_time, request_reason]);
            saveDatabase();
            const result = db.exec('SELECT last_insert_rowid() as id');
            return { lastInsertRowid: resultToObject(result)?.id };
        }
    },
    findById: {
        get: (id) => {
            const result = db.exec('SELECT * FROM delete_requests WHERE id = ?', [id]);
            return resultToObject(result);
        }
    },
    findBySubmission: {
        get: (submission_id, status) => {
            const result = db.exec('SELECT * FROM delete_requests WHERE submission_id = ? AND status = ?', [submission_id, status]);
            return resultToObject(result);
        }
    },
    findPendingBySubmission: {
        get: (submission_id, status) => {
            const result = db.exec('SELECT * FROM delete_requests WHERE submission_id = ? AND status = ?', [submission_id, status]);
            return resultToObject(result);
        }
    },
    getByRequester: {
        all: (requester_id) => {
            const result = db.exec(`
                SELECT dr.*, 
                       COALESCE(dr.medical_record_number, s.medical_record_number) as medical_record_number,
                       COALESCE(dr.admission_date, s.admission_date) as admission_date,
                       dr.record_time
                FROM delete_requests dr
                LEFT JOIN submissions s ON dr.submission_id = s.id
                WHERE dr.requester_id = ?
                ORDER BY dr.created_at DESC
            `, [requester_id]);
            return resultToObjects(result);
        }
    },
    getAll: {
        all: () => {
            const result = db.exec(`
                SELECT dr.*, 
                       COALESCE(dr.medical_record_number, s.medical_record_number) as medical_record_number,
                       COALESCE(dr.admission_date, s.admission_date) as admission_date,
                       dr.record_time,
                       u.username as requester_username, u.hospital as requester_hospital
                FROM delete_requests dr
                LEFT JOIN submissions s ON dr.submission_id = s.id
                JOIN users u ON dr.requester_id = u.id
                ORDER BY dr.created_at DESC
            `);
            return resultToObjects(result);
        }
    },
    approve: {
        run: (resolved_by, id) => {
            db.run(`UPDATE delete_requests SET status = 'approved', resolved_at = datetime('now'), resolved_by = ? WHERE id = ?`,
                [resolved_by, id]);
            saveDatabase();
            return { changes: db.getRowsModified() };
        }
    },
    reject: {
        run: (resolved_by, reject_reason, id) => {
            db.run(`UPDATE delete_requests SET status = 'rejected', resolved_at = datetime('now'), resolved_by = ?, reject_reason = ? WHERE id = ?`,
                [resolved_by, reject_reason, id]);
            saveDatabase();
            return { changes: db.getRowsModified() };
        }
    },
    delete: {
        run: (id) => {
            db.run('DELETE FROM delete_requests WHERE id = ?', [id]);
            saveDatabase();
            return { changes: db.getRowsModified() };
        }
    }
};

// Getter for db instance (for direct queries if needed)
function getDb() {
    return db;
}

module.exports = {
    db: { get: getDb }, // Compatibility wrapper
    getDb,
    initializeDatabase,
    saveDatabase,
    userQueries,
    submissionQueries,
    deleteRequestQueries
};
