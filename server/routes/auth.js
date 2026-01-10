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

    const user = userQueries.findByUsername.get(username);

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
        role: user.role
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

module.exports = router;
