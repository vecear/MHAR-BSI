const { db } = require('./server/db/database');
const bcrypt = require('bcryptjs');

console.log("Adding/Updating 'vecear' in SQLite...");
try {
    const username = 'vecear';
    const email = 'vecear@gmail.com'; // Placeholder/Best guess. 
    // Note: If this is wrong, user will get "User not found" from Firebase (404) or "Wrong password" (401).
    const passwordHash = bcrypt.hashSync('vecear123', 10); // Dummy password

    // Check if exists
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

    if (existing) {
        console.log(`User ${username} exists. Updating email to ${email}...`);
        db.prepare('UPDATE users SET email = ? WHERE username = ?').run(email, username);
    } else {
        console.log(`User ${username} not found. Creating...`);
        // We need other fields? schema says some are nullable?
        // database.js initSchema: INSERT INTO users (username, password_hash, hospital, role)
        db.prepare('INSERT INTO users (username, password_hash, hospital, role, email) VALUES (?, ?, ?, ?, ?)')
            .run(username, passwordHash, '內湖總院', 'user', email);
    }
    console.log("Done.");
} catch (e) {
    console.error("Error modifying users:", e);
}
