const express = require('express');
const bcrypt = require('bcryptjs');
const { userQueries } = require('../db/database');

const router = express.Router();

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: '未登入' });
    }
    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: '權限不足' });
    }
    next();
};

// Get all users (admin only)
router.get('/', requireAdmin, (req, res) => {
    try {
        const users = userQueries.getAll.all('admin'); // Exclude admin from list
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: '取得使用者列表失敗' });
    }
});

// Create new user (admin only)
router.post('/', requireAdmin, (req, res) => {
    try {
        const { username, password, hospital } = req.body;

        if (!username || !password || !hospital) {
            return res.status(400).json({ error: '請填寫所有必要欄位' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '密碼至少需要6個字元' });
        }

        const validHospitals = [
            '內湖總院', '松山分院', '桃園總院', '台中總院',
            '高雄總院', '左營總院', '花蓮總院', '澎湖分院'
        ];

        if (!validHospitals.includes(hospital)) {
            return res.status(400).json({ error: '無效的醫院選項' });
        }

        // Check if username exists
        const existing = userQueries.findByUsername.get(username);
        if (existing) {
            return res.status(409).json({ error: '此帳號已存在' });
        }

        const hash = bcrypt.hashSync(password, 10);
        const result = userQueries.create.run(username, hash, hospital, 'user');

        res.status(201).json({
            id: result.lastInsertRowid,
            message: '使用者已建立'
        });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: '建立使用者失敗' });
    }
});

// Delete user (admin only)
router.delete('/:id', requireAdmin, (req, res) => {
    try {
        // Prevent deleting admin
        const result = userQueries.delete.run(req.params.id, 'admin');

        if (result.changes === 0) {
            return res.status(404).json({ error: '找不到使用者或無法刪除管理員' });
        }

        res.json({ message: '使用者已刪除' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: '刪除使用者失敗' });
    }
});

// Reset user password (admin only)
router.post('/:id/reset-password', requireAdmin, (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: '新密碼至少需要6個字元' });
        }

        const user = userQueries.findById.get(req.params.id);
        if (!user) {
            return res.status(404).json({ error: '找不到使用者' });
        }

        const hash = bcrypt.hashSync(newPassword, 10);
        userQueries.updatePassword.run(hash, req.params.id);

        res.json({ message: '密碼已重設' });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ error: '重設密碼失敗' });
    }
});

module.exports = router;
