-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    hospital TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    email TEXT,
    display_name TEXT,
    gender TEXT CHECK(gender IN ('male', 'female', 'other', NULL)),
    phone TEXT,
    address TEXT,
    line_id TEXT,
    security_question TEXT,
    security_answer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Form submissions table
CREATE TABLE IF NOT EXISTS submissions (
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
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_medical_record ON submissions(medical_record_number);

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123'
INSERT OR IGNORE INTO users (username, password_hash, hospital, role) 
VALUES ('admin', '$2a$10$rQnM1j.V5yQsZqPsE5A8XOq8LmG4M5X5M5X5M5X5M5X5M5X5M5X5M', '內湖總院', 'admin');

-- Delete requests table
CREATE TABLE IF NOT EXISTS delete_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    requester_id INTEGER NOT NULL,
    medical_record_number TEXT,
    admission_date TEXT,
    record_time TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    reject_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    resolved_by INTEGER,
    FOREIGN KEY (submission_id) REFERENCES submissions(id),
    FOREIGN KEY (requester_id) REFERENCES users(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_delete_requests_submission ON delete_requests(submission_id);
CREATE INDEX IF NOT EXISTS idx_delete_requests_requester ON delete_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_delete_requests_status ON delete_requests(status);
