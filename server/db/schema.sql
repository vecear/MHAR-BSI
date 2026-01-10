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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Form submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    medical_record_number TEXT NOT NULL,
    admission_date DATE NOT NULL,
    form_data TEXT NOT NULL,
    data_status TEXT DEFAULT 'incomplete' CHECK(data_status IN ('complete', 'incomplete')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(medical_record_number, admission_date)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_medical_record ON submissions(medical_record_number);

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123'
INSERT OR IGNORE INTO users (username, password_hash, hospital, role) 
VALUES ('admin', '$2a$10$rQnM1j.V5yQsZqPsE5A8XOq8LmG4M5X5M5X5M5X5M5X5M5X5M5X5M', '內湖總院', 'admin');
