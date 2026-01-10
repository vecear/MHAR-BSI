const express = require('express');
const bcrypt = require('bcryptjs');
const { userQueries } = require('../db/database');

const router = express.Router();

const VALID_HOSPITALS = [
    '內湖總院', '松山分院', '桃園總院', '台中總院',
    '高雄總院', '左營總院', '花蓮總院', '澎湖分院'
];

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

// Middleware to check login
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: '未登入' });
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

// Get current user profile
router.get('/profile', requireLogin, (req, res) => {
    try {
        const user = userQueries.findById.get(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: '找不到使用者' });
        }
        res.json(user);
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ error: '取得個人資料失敗' });
    }
});

// Update current user profile
router.put('/profile', requireLogin, (req, res) => {
    try {
        const { email, display_name, gender, phone, address, line_id, currentPassword, newPassword } = req.body;

        // If changing password, verify current password
        if (newPassword) {
            if (!currentPassword) {
                return res.status(400).json({ error: '請輸入目前密碼' });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ error: '新密碼至少需要6個字元' });
            }

            const user = userQueries.findByUsername.get(req.session.username);
            if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
                return res.status(400).json({ error: '目前密碼不正確' });
            }

            const hash = bcrypt.hashSync(newPassword, 10);
            userQueries.updatePassword.run(hash, req.session.userId);
        }

        // Update profile fields
        userQueries.updateProfile.run(
            email || null,
            display_name || null,
            gender || null,
            phone || null,
            address || null,
            line_id || null,
            req.session.userId
        );

        res.json({ message: '個人資料已更新' });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ error: '更新個人資料失敗' });
    }
});

// Create new user (admin only)
router.post('/', requireAdmin, (req, res) => {
    try {
        const { username, password, hospital, email, display_name, gender, phone, address, line_id } = req.body;

        if (!username || !password || !hospital) {
            return res.status(400).json({ error: '請填寫帳號、密碼和醫院' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: '密碼至少需要6個字元' });
        }

        if (!VALID_HOSPITALS.includes(hospital)) {
            return res.status(400).json({ error: '無效的醫院選項' });
        }

        // Check if username exists
        const existing = userQueries.findByUsername.get(username);
        if (existing) {
            return res.status(409).json({ error: '此帳號已存在' });
        }

        const hash = bcrypt.hashSync(password, 10);
        const result = userQueries.create.run(
            username, hash, hospital, 'user',
            email || null, display_name || null, gender || null, phone || null, address || null, line_id || null
        );

        res.status(201).json({
            id: result.lastInsertRowid,
            message: '使用者已建立'
        });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: '建立使用者失敗' });
    }
});

// Update user (admin only)
router.put('/:id', requireAdmin, (req, res) => {
    try {
        const { username, hospital, email, display_name, gender, phone, address, line_id, newPassword } = req.body;

        const user = userQueries.findById.get(req.params.id);
        if (!user) {
            return res.status(404).json({ error: '找不到使用者' });
        }

        // Prevent updating admin role users
        if (user.role === 'admin') {
            return res.status(403).json({ error: '無法修改管理員資料' });
        }

        if (hospital && !VALID_HOSPITALS.includes(hospital)) {
            return res.status(400).json({ error: '無效的醫院選項' });
        }

        // Check if new username conflicts
        if (username && username !== user.username) {
            const existing = userQueries.findByUsername.get(username);
            if (existing) {
                return res.status(409).json({ error: '此帳號已存在' });
            }
        }

        // Update password if provided
        if (newPassword) {
            if (newPassword.length < 6) {
                return res.status(400).json({ error: '新密碼至少需要6個字元' });
            }
            const hash = bcrypt.hashSync(newPassword, 10);
            userQueries.updatePassword.run(hash, req.params.id);
        }

        // Update profile
        userQueries.updateProfileAdmin.run(
            username || user.username,
            hospital || user.hospital,
            email || null,
            display_name || null,
            gender || null,
            phone || null,
            address || null,
            line_id || null,
            req.params.id
        );

        res.json({ message: '使用者資料已更新' });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ error: '更新使用者失敗' });
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

