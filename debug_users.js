const { db } = require('./server/db/database');

console.log("Checking users in SQLite...");
try {
    const stmt = db.prepare('SELECT * FROM users');
    const users = stmt.all();
    console.log('Current SQLite Users:', users.map(u => ({ username: u.username, email: u.email })));
} catch (e) {
    console.error("Error listing users:", e);
}
