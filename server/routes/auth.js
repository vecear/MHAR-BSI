const express = require('express');
const bcrypt = require('bcryptjs');
const { userQueries } = require('../db/database');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: '請輸入帳號和密碼' });
    }

    const user = userQueries.findByUsernameOrEmail.get(username);

    if (!user) {
        return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);

    if (!isValid) {
        return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    // Set session
    req.session.userId = user.id;
    req.session.role = user.role;

    res.json({
        id: user.id,
        username: user.username,
        hospital: user.hospital,
        role: user.role,
        display_name: user.display_name,
        email: user.email // Expose email for client-side Firebase auth bridge
    });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: '登出失敗' });
        }
        res.json({ message: '已登出' });
    });
});

// Check session / Get current user
router.get('/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: '未登入' });
    }

    const user = userQueries.findById.get(req.session.userId);

    if (!user) {
        req.session.destroy();
        return res.status(401).json({ error: '使用者不存在' });
    }

    res.json(user);
});

// Change password
router.post('/change-password', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: '未登入' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: '請輸入目前密碼和新密碼' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: '新密碼至少需要6個字元' });
    }

    const user = userQueries.findByUsername.get(
        userQueries.findById.get(req.session.userId).username
    );

    const isValid = bcrypt.compareSync(currentPassword, user.password_hash);

    if (!isValid) {
        return res.status(401).json({ error: '目前密碼錯誤' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    userQueries.updatePassword.run(newHash, req.session.userId);

    res.json({ message: '密碼已更新' });
});

const VALID_HOSPITALS = [
    '三軍總院', '松山分院', '桃園總院', '台中總院',
    '高雄總院', '左營總院', '花蓮總院', '澎湖分院'
];

const SECURITY_QUESTIONS = [
    '生日',
    '身分證',
    '畢業國小',
    '爸爸姓名',
    '媽媽姓名',
    '結婚紀念日',
    '寵物名字'
];

// Register new user
router.post('/register', (req, res) => {
    const { username, password, hospital, security_question, security_answer } = req.body;

    if (!username || !password || !hospital || !security_question || !security_answer) {
        return res.status(400).json({ error: '請填寫所有必填欄位' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: '密碼至少需要6個字元' });
    }

    if (!VALID_HOSPITALS.includes(hospital)) {
        return res.status(400).json({ error: '無效的醫院選項' });
    }

    if (!SECURITY_QUESTIONS.includes(security_question)) {
        return res.status(400).json({ error: '無效的安全提問' });
    }

    // Check if username exists
    const existing = userQueries.findByUsername.get(username);
    if (existing) {
        return res.status(409).json({ error: '此帳號已存在' });
    }

    try {
        const hash = bcrypt.hashSync(password, 10);
        const result = userQueries.create.run(
            username, hash, hospital, 'user',
            null, null, null, null, null, null,
            security_question, security_answer
        );

        res.status(201).json({
            id: result.lastInsertRowid,
            message: '註冊成功'
        });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ error: '註冊失敗' });
    }
});

// Get security question for forgot password
router.post('/forgot-password/question', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: '請輸入帳號' });
    }

    const result = userQueries.getSecurityQuestion.get(username);

    if (!result || !result.security_question) {
        return res.status(404).json({ error: '找不到此帳號或未設定安全提問' });
    }

    res.json({ security_question: result.security_question });
});

// Verify security answer and reset password
router.post('/forgot-password/verify', (req, res) => {
    const { username, security_answer, new_password } = req.body;

    if (!username || !security_answer || !new_password) {
        return res.status(400).json({ error: '請填寫所有欄位' });
    }

    if (new_password.length < 6) {
        return res.status(400).json({ error: '新密碼至少需要6個字元' });
    }

    const result = userQueries.getSecurityAnswer.get(username);

    if (!result) {
        return res.status(404).json({ error: '找不到此帳號' });
    }

    if (result.security_answer !== security_answer) {
        return res.status(401).json({ error: '答案錯誤' });
    }

    try {
        const hash = bcrypt.hashSync(new_password, 10);
        userQueries.updatePasswordByUsername.run(hash, username);
        res.json({ message: '密碼已重設，請使用新密碼登入' });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ error: '重設密碼失敗' });
    }
});

// Find username by email and phone
router.post('/forgot-username', (req, res) => {
    const { email, phone } = req.body;

    if (!email || !phone) {
        return res.status(400).json({ error: '請輸入信箱和電話' });
    }

    try {
        const { db } = require('../db/database');
        const user = db.prepare('SELECT username FROM users WHERE email = ? AND phone = ? AND role != ?').get(email, phone, 'admin');

        if (!user) {
            return res.status(404).json({ error: '找不到符合條件的帳號，請確認信箱和電話是否正確' });
        }

        res.json({ username: user.username });
    } catch (err) {
        console.error('Error finding username:', err);
        res.status(500).json({ error: '查詢失敗' });
    }
});

module.exports = router;

